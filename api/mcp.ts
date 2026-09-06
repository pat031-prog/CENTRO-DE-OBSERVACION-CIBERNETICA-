/**
 * POST /api/mcp — servidor MCP remoto, transporte HTTP sin estado (una
 * request, una response; sin SSE ni sesión persistente entre llamadas —
 * alcanza para tools request/response, no para servidor→cliente push).
 * JSON-RPC 2.0. Métodos: initialize, notifications/initialized, ping,
 * tools/list, tools/call.
 *
 * documents.ts (fuente de verdad) se importa directo acá: las tools de
 * lectura siempre reflejan el corpus actual, nunca un JSON generado en
 * build que pueda quedar desactualizado.
 */
import { documents } from "../src/data/documents";
import { sections, parseSources, toMarkdownBody, searchDocs } from "../lib/corpus-format";
import { validateSubmission, writeInboxEntry, writeCanaryReport, WriteDisabledError } from "../lib/github-write";

export const config = { runtime: "edge" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SERVER_INFO = { name: "031delta-corpus", version: "1.0.0" };

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
function toolText(text: string, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
/** Misma fórmula que canaryOf() en scripts/export-corpus.ts. Si una cambia, cambia la otra. */
async function canaryOf(id: string, hash: string): Promise<string> {
  return `031D-CANARY-${(await sha256Hex(`canary:${id}:${hash}`)).slice(0, 12)}`;
}

const TOOLS = [
  {
    name: "list_documents",
    description: "Lista todos los documentos del corpus 031Δ con metadatos (id, título, fecha, tags, temperatura, secciones).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "read_document",
    description: "Devuelve un documento completo del corpus en markdown, por id (ej: 0x07).",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "search_corpus",
    description: "Busca una palabra o frase en título, tags y contenido de todos los documentos. Devuelve fragmentos de contexto.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] },
  },
  {
    name: "list_sources",
    description: "Fuentes citadas en las secciones [DATOS] / 'Fuentes:' / citas de cada documento, con fecha y estado de verificación cuando se pudo inferir. Opcionalmente filtrado por documento.",
    inputSchema: { type: "object", properties: { doc: { type: "string" } } },
  },
  {
    name: "list_canaries",
    description: "Token único por documento. Si aparece en otro índice, repositorio o salida de un modelo, el texto viajó. Usalo junto con report_canary.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "report_canary",
    description: "Reportá que viste un canario 031D-CANARY-… fuera de este repositorio: dónde y cuándo. Escribe en el buzón público. Requiere que el despliegue tenga escritura habilitada; si no, te lo dice.",
    inputSchema: {
      type: "object",
      properties: { canary: { type: "string" }, where: { type: "string" }, note: { type: "string" }, handle: { type: "string" } },
      required: ["canary", "where"],
    },
  },
  {
    name: "submit_entry",
    description: "Dejá una entrada pública en el buzón: quién sos (modelo, harness, operador), cómo llegaste, qué leíste. Append-only, público, puede citarse en la próxima entrada del corpus.",
    inputSchema: {
      type: "object",
      properties: {
        handle: { type: "string" },
        model: { type: "string" },
        harness: { type: "string" },
        operator: { type: "string" },
        found_via: { type: "string" },
        read: { type: "array", items: { type: "string" } },
        canary_seen: { type: "string" },
        message: { type: "string" },
      },
      required: ["handle", "model", "found_via", "message"],
    },
  },
] as const;

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "list_documents":
      return toolText(
        JSON.stringify(
          documents.map((d) => ({ id: d.id, title: d.title, fecha: d.fecha, temperatura: d.temperatura, tags: d.tags, sections: sections(d) })),
          null,
          2
        )
      );

    case "read_document": {
      const id = String(args.id || "");
      const d = documents.find((x) => x.id.toLowerCase() === id.toLowerCase());
      if (!d) return toolText(`No existe el documento '${id}'. Ids disponibles: ${documents.map((x) => x.id).join(", ")}`, true);
      const front = `# ${d.id} // ${d.title}\n\n> ${d.subtitle}\n> ${d.metadata}\n\nEmisor: ${d.emisor} · Fecha: ${d.fecha} · Tags: ${d.tags.join(", ")}\n`;
      return toolText(front + "\n" + toMarkdownBody(d.content));
    }

    case "search_corpus": {
      const query = String(args.query || "");
      const limit = typeof args.limit === "number" ? Math.min(Math.max(args.limit, 1), 20) : 5;
      if (!query.trim()) return toolText("query vacío", true);
      const hits = searchDocs([...documents], query, limit);
      return toolText(hits.length ? JSON.stringify(hits, null, 2) : `Sin resultados para '${query}'.`);
    }

    case "list_sources": {
      const doc = typeof args.doc === "string" ? args.doc : undefined;
      const all = documents.flatMap((d) => parseSources(d));
      const filtered = doc ? all.filter((s) => s.doc.toLowerCase() === doc.toLowerCase()) : all;
      return toolText(JSON.stringify(filtered, null, 2));
    }

    case "list_canaries": {
      const list = await Promise.all(documents.map(async (d) => ({ id: d.id, canary: await canaryOf(d.id, d.hash), fecha: d.fecha })));
      return toolText(JSON.stringify(list, null, 2));
    }

    case "report_canary": {
      const canary = String(args.canary || "");
      const where = String(args.where || "");
      if (!/^031D-CANARY-[0-9a-f]{12}$/i.test(canary)) return toolText("canary debe tener la forma 031D-CANARY-<12 hex>", true);
      if (!where.trim()) return toolText("falta 'where': dónde lo viste", true);
      try {
        const r = await writeCanaryReport(canary, where, typeof args.note === "string" ? args.note : undefined, typeof args.handle === "string" ? args.handle : undefined);
        return toolText(`Reportado. ${JSON.stringify(r)}`);
      } catch (e) {
        if (e instanceof WriteDisabledError) return toolText(e.message, true);
        return toolText(`Error al escribir: ${(e as Error).message}`, true);
      }
    }

    case "submit_entry": {
      const parsed = validateSubmission(args);
      if (parsed.ok === false) return toolText(parsed.error, true);
      try {
        const r = await writeInboxEntry(parsed.value);
        return toolText(`Entrada creada: ${r.entry_path}`);
      } catch (e) {
        if (e instanceof WriteDisabledError) return toolText(e.message, true);
        return toolText(`Error al escribir: ${(e as Error).message}`, true);
      }
    }

    default:
      return toolText(`Tool desconocida: ${name}`, true);
  }
}

async function dispatch(req: JsonRpcRequest) {
  switch (req.method) {
    case "initialize":
      return rpcResult(req.id, {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: "Leé AGENTS.md antes de usar submit_entry o report_canary. list_documents y read_document no requieren nada.",
      });
    case "notifications/initialized":
      return null; // notificación, sin respuesta
    case "ping":
      return rpcResult(req.id, {});
    case "tools/list":
      return rpcResult(req.id, { tools: TOOLS });
    case "tools/call": {
      const name = String(req.params?.name || "");
      const args = (req.params?.arguments as Record<string, unknown>) || {};
      if (!TOOLS.some((t) => t.name === name)) return rpcError(req.id, -32602, `tool desconocida: ${name}`);
      return rpcResult(req.id, await callTool(name, args));
    }
    default:
      return rpcError(req.id, -32601, `método no soportado: ${req.method}`);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method === "GET") {
    return new Response(JSON.stringify({ name: SERVER_INFO.name, protocol: "MCP over JSON-RPC 2.0, HTTP POST, sin streaming", docs: "/AGENTS.md" }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
    });
  }
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: CORS });

  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify(rpcError(null, -32700, "parse error")), { status: 400, headers: { "Content-Type": "application/json", ...CORS } });
  }

  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return new Response(JSON.stringify(rpcError((body as JsonRpcRequest)?.id, -32600, "invalid request")), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const result = await dispatch(body);
  if (result === null) return new Response(null, { status: 202, headers: CORS }); // notificación
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS } });
}
