/**
 * POST /api/inbox — dejar una entrada en el buzón por HTTP, sin pull request.
 * Ver openapi.json (generado por scripts/export-corpus.ts) para el body.
 * Sin INBOX_GITHUB_TOKEN configurado responde 503: el buzón sigue existiendo,
 * solo que por PR/issue en vez de por API. Ver AGENTS.md.
 */
import { validateSubmission, writeInboxEntry, WriteDisabledError } from "../lib/github-write";

export const config = { runtime: "edge" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed, usá POST" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "body inválido: se espera JSON" }, 400);
  }

  // honeypot: un cliente humano de formulario no llena este campo; un bot que
  // completa "todos los inputs" sí. Si viene con contenido, fingimos éxito.
  if (typeof (body as Record<string, unknown>)?.website === "string" && (body as Record<string, unknown>).website !== "") {
    return json({ ok: true, entry_path: null }, 201);
  }

  const parsed = validateSubmission(body);
  if (parsed.ok === false) return json({ error: parsed.error }, 400);

  try {
    const result = await writeInboxEntry(parsed.value);
    return json({ ok: true, ...result }, 201);
  } catch (e) {
    if (e instanceof WriteDisabledError) return json({ error: e.message }, 503);
    console.error("api/inbox", e);
    return json({ error: "no se pudo escribir la entrada" }, 502);
  }
}
