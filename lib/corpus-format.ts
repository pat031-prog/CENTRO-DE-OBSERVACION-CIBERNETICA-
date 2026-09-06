/**
 * Funciones puras sobre `Document` (src/data/documents.ts), sin dependencias
 * de Node ni de ningún runtime. Las usan tanto scripts/export-corpus.ts
 * (build, Node) como api/mcp.ts y api/agent-card.ts (Edge Functions).
 * No dupliques esta lógica: si cambia el formato de [DATOS] o de las
 * secciones, cambia acá y ambos lados quedan consistentes.
 */
import type { Document } from "../src/data/documents";

export const SEP = /^─{10,}/;

export const DATE_HINT =
  /(\d{1,2}(?:\/\d{1,2})?-\d{2}-\d{4}|\d{1,2} [A-Z][a-z]{2} \d{4}|[A-Z][a-z]{2}-\d{4}|\b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.? ?\d{4}|\b(?:19|20)\d{2}\b)/i;

export const slug = (id: string) => id.toLowerCase();

export const sections = (d: Document) =>
  d.content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\[(\d{2}[a-z]?|LOG|DATOS)\]/.test(l));

export interface SourceEntry {
  doc: string;
  kind: "datos" | "fuentes" | "cita";
  raw: string;
  date_hint: string | null;
}

export function parseSources(d: Document): SourceEntry[] {
  const out: SourceEntry[] = [];
  const lines = d.content.split("\n");

  // [DATOS] block: entries with indented continuation lines
  const start = lines.findIndex((l) => l.trim().startsWith("[DATOS]"));
  if (start !== -1) {
    let cur: string | null = null;
    const flush = () => {
      if (cur && cur.trim())
        out.push({ doc: d.id, kind: "datos", raw: cur.trim().replace(/\s{2,}/g, " "), date_hint: cur.match(DATE_HINT)?.[0] ?? null });
      cur = null;
    };
    for (let i = start + 1; i < lines.length; i++) {
      const l = lines[i];
      if (SEP.test(l.trim()) || /^\[\d{2}/.test(l.trim()) || l.trim().startsWith(">>>")) break;
      if (l.trim() === "") {
        flush();
        continue;
      }
      if (/^\s/.test(l) && cur !== null) {
        cur += " " + l.trim();
        continue;
      }
      flush();
      cur = l;
    }
    flush();
  }

  // "Fuentes: a, b, c — verificadas x"
  for (const l of lines) {
    const m = l.match(/^Fuentes:\s*(.+)$/);
    if (!m) continue;
    const [list, verif] = m[1].split(/\s+—\s+/);
    for (const s of list.split(",").map((x) => x.trim()).filter(Boolean)) {
      out.push({ doc: d.id, kind: "fuentes", raw: verif ? `${s} (${verif})` : s, date_hint: (verif ?? s).match(DATE_HINT)?.[0] ?? null });
    }
  }

  // attributions "— Nick Land, Meltdown, 1994"
  for (const l of lines) {
    if (/^—\s*\S/.test(l.trim())) out.push({ doc: d.id, kind: "cita", raw: l.trim().replace(/^—\s*/, ""), date_hint: l.match(DATE_HINT)?.[0] ?? null });
  }
  return out;
}

export function toMarkdownBody(content: string): string {
  return content
    .split("\n")
    .map((l) => {
      const t = l.trim();
      if (SEP.test(t)) return "---";
      if (/^\[(\d{2}[a-z]?|LOG|DATOS)\]/.test(t)) return `## ${t}`;
      if (t.startsWith(">>>")) return `> **${t}**`;
      return l;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function docSummary(d: Document) {
  return {
    id: d.id,
    title: d.title,
    subtitle: d.subtitle,
    metadata: d.metadata,
    fecha: d.fecha,
    temperatura: d.temperatura,
    clasificacion: d.clasificacion,
    tags: d.tags,
    sections: sections(d),
  };
}

/** Búsqueda simple por substring en título, subtítulo, tags y contenido. Sin índice, corpus chico. */
export function searchDocs(documents: Document[], query: string, limit = 5) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: { id: string; title: string; snippet: string }[] = [];
  for (const d of documents) {
    const haystack = `${d.title}\n${d.subtitle}\n${d.tags.join(" ")}\n${d.content}`;
    const idx = haystack.toLowerCase().indexOf(q);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 80);
    const end = Math.min(haystack.length, idx + q.length + 80);
    const snippet = haystack.slice(start, end).replace(/\s+/g, " ").trim();
    hits.push({ id: d.id, title: d.title, snippet: (start > 0 ? "…" : "") + snippet + (end < haystack.length ? "…" : "") });
    if (hits.length >= limit) break;
  }
  return hits;
}
