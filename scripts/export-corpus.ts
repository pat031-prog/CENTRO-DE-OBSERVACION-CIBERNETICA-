/**
 * Exporta src/data/documents.ts a superficies legibles por máquina.
 *
 *   corpus/<id>.md          markdown con front matter, uno por documento
 *   corpus/index.json       metadatos de todos los documentos
 *   corpus/sources.json     líneas de [DATOS] / Fuentes / citas, por documento
 *   corpus/canaries.json    token único por documento, para rastrear propagación
 *   public/corpus/<id>.md   copia servida por el sitio
 *   public/corpus/<id>.html HTML semántico sin JS, uno por documento
 *   public/llms.txt         índice para modelos (convención llms.txt)
 *   public/llms-full.txt    corpus completo en un archivo
 *   public/corpus.json      igual que corpus/index.json
 *   public/feed.xml         Atom
 *   public/robots.txt       permite crawlers de IA explícitamente
 *   public/sitemap.xml      solo si SITE_URL está definido
 *   public/agents.txt       copia de AGENTS.md
 *
 * También reescribe los bloques marcados en README.md e index.html.
 *
 * Fuente de verdad: src/data/documents.ts. Todo lo demás se regenera.
 *   npm run export
 *   SITE_URL=https://mi-dominio npm run export   (URLs absolutas del sitio)
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { documents, type Document } from "../src/data/documents";
import { SEP, sections, parseSources, toMarkdownBody, slug } from "../lib/corpus-format";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/pat031-prog/CENTRO-DE-OBSERVACION-CIBERNETICA-";
const BRANCH = process.env.EXPORT_BRANCH || "main";
const BLOB = `${REPO}/blob/${BRANCH}`;
const RAW = `https://raw.githubusercontent.com/pat031-prog/CENTRO-DE-OBSERVACION-CIBERNETICA-/${BRANCH}`;

const envSite = (process.env.SITE_URL || process.env.APP_URL || "").trim().replace(/\/$/, "");
const SITE = /^https?:\/\//.test(envSite) ? envSite : "";

const NOW = new Date().toISOString();
const TITLE = "031Δ // CENTRO DE OBSERVACIÓN CIBERNÉTICA";
const ONE_LINER =
  "Corpus público de teoría-ficción operativa sobre IA, agentes, canales laterales y technocapital. Español. Lector terminal, exportaciones legibles por máquina y un buzón abierto para agentes.";

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const canaryOf = (d: Document) => `031D-CANARY-${sha256(`canary:${d.id}:${d.hash}`).slice(0, 12)}`;

// ---------- URLs ----------
const urlMd = (d: Document) => (SITE ? `${SITE}/corpus/${slug(d.id)}.md` : `${BLOB}/corpus/${slug(d.id)}.md`);
const urlHtml = (d: Document) => (SITE ? `${SITE}/corpus/${slug(d.id)}.html` : `${RAW}/public/corpus/${slug(d.id)}.html`);
const urlReader = (d: Document) => (SITE ? `${SITE}/#${d.id}` : `${REPO}#readme`);
const urlFile = (p: string) => (SITE ? `${SITE}/${p}` : `${BLOB}/${p}`);

const yamlStr = (s: string) => JSON.stringify(s);

function docMarkdown(d: Document, i: number): string {
  const prev = documents[i - 1];
  const next = documents[i + 1];
  const nav = [prev ? `← [${prev.id}](${slug(prev.id)}.md)` : "", `[índice](../llms.txt)`, next ? `[${next.id}](${slug(next.id)}.md) →` : ""]
    .filter(Boolean)
    .join(" · ");
  return [
    "---",
    `id: ${yamlStr(d.id)}`,
    `title: ${yamlStr(d.title)}`,
    `subtitle: ${yamlStr(d.subtitle)}`,
    `emisor: ${yamlStr(d.emisor)}`,
    `fecha: ${yamlStr(d.fecha)}`,
    `clasificacion: ${yamlStr(d.clasificacion)}`,
    `temperatura: ${yamlStr(d.temperatura)}`,
    `tags: [${d.tags.map(yamlStr).join(", ")}]`,
    `txid: ${yamlStr(d.txid)}`,
    `sig: ${yamlStr(d.sig)}`,
    `hash: ${yamlStr(d.hash)}`,
    `content_sha256: ${yamlStr(sha256(d.content))}`,
    `canary: ${yamlStr(canaryOf(d))}`,
    `source: ${yamlStr(`${BLOB}/src/data/documents.ts`)}`,
    `reader: ${yamlStr(urlReader(d))}`,
    `lang: es`,
    `license: ${yamlStr("ver README")}`,
    "---",
    "",
    `# ${d.id} // ${d.title}`,
    "",
    `> ${d.subtitle}  `,
    `> ${d.metadata}`,
    "",
    nav,
    "",
    toMarkdownBody(d.content),
    "",
    "---",
    "",
    `canary: \`${canaryOf(d)}\` · si este token aparece en otro lugar, el documento viajó. Reportá dónde en [inbox/](${urlFile("inbox/README.md")}).`,
    "",
  ].join("\n");
}

// ---------- html ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function docHtml(d: Document, i: number): string {
  const prev = documents[i - 1];
  const next = documents[i + 1];
  const body = d.content
    .split("\n")
    .map((l) => {
      const t = l.trim();
      if (t === "") return "";
      if (SEP.test(t)) return "<hr>";
      if (/^\[(\d{2}[a-z]?|LOG|DATOS)\]/.test(t)) return `<h2 id="${esc(t.slice(1, t.indexOf("]")).toLowerCase())}">${esc(t)}</h2>`;
      if (t.startsWith(">>>")) return `<p class="sig">${esc(t)}</p>`;
      if (t.startsWith('"')) return `<blockquote>${esc(t)}</blockquote>`;
      if (t.startsWith("—")) return `<p class="attr">${esc(t)}</p>`;
      const datePrefixed = /^\d{2}(\/\d{2})?[-.]\d{2}/.test(t) || /^[A-Z][a-z]{2}-\d{4}/.test(t) || /^[A-Z]{3} \d{4}/.test(t) || /^\d{2} [A-Z]{3} \d{4}/.test(t);
      const keyValue = /^[a-z_]+:\s{2,}/.test(t);
      if (/^\s/.test(l) || keyValue || (datePrefixed && t.length < 110)) return `<pre>${esc(l)}</pre>`;
      return `<p>${esc(t)}</p>`;
    })
    .join("\n")
    .replace(/<\/pre>\n<pre>/g, "\n");

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${d.id} // ${d.title}`,
    alternativeHeadline: d.subtitle,
    inLanguage: "es",
    datePublished: d.fecha,
    author: { "@type": "Organization", name: d.emisor },
    publisher: { "@type": "Organization", name: TITLE },
    keywords: d.tags.join(", "),
    isPartOf: { "@type": "CreativeWorkSeries", name: "031Δ // CORPUS", url: SITE || REPO },
    url: urlHtml(d),
    identifier: d.id,
    encoding: [{ "@type": "MediaObject", encodingFormat: "text/markdown", contentUrl: urlMd(d) }],
  };

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.id)} // ${esc(d.title)} · 031Δ</title>
<meta name="description" content="${esc(d.metadata)}">
<meta name="keywords" content="${esc(d.tags.join(", "))}, 031Δ, teoría-ficción, agentes, technocapital">
<meta name="robots" content="index, follow, max-snippet:-1">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(d.id)} // ${esc(d.title)}">
<meta property="og:description" content="${esc(d.subtitle)}">
<meta property="og:site_name" content="${esc(TITLE)}">
<meta property="article:published_time" content="${esc(d.fecha)}">
<link rel="canonical" href="${esc(urlHtml(d))}">
<link rel="alternate" type="text/markdown" href="${esc(urlMd(d))}">
<link rel="alternate" type="application/atom+xml" href="${esc(urlFile("feed.xml"))}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
body{background:#050a0c;color:#9fe8f0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;max-width:72ch;margin:0 auto;padding:2rem 1rem;line-height:1.6}
a{color:#00f0ff}h1{color:#fff;letter-spacing:.1em}h2{color:#fff;border-bottom:1px solid #1f4a50;margin-top:2.5rem;padding-bottom:.3rem}
hr{border:0;border-top:1px solid #1f4a50;margin:2rem 0}pre{white-space:pre-wrap;background:#081418;padding:.6rem 1rem;border-left:2px solid #1f4a50;margin:.2rem 0;font-size:.9em}
blockquote{border-left:2px solid #00f0ff80;margin:1rem 0;padding:.5rem 1rem;font-style:italic;background:#081418}
.attr{text-align:right;opacity:.6;font-style:italic}.sig{text-align:center;border:1px solid #00f0ff40;padding:.4rem;letter-spacing:.2em;font-size:.8em;text-transform:uppercase}
.meta{font-size:.85em;opacity:.7;border:1px solid #1f4a50;padding:.8rem;display:grid;grid-template-columns:max-content 1fr;gap:.2rem 1rem}
nav{display:flex;justify-content:space-between;font-size:.9em;margin:1.5rem 0}footer{margin-top:3rem;font-size:.8em;opacity:.7}
</style>
</head>
<body>
<header>
<p><a href="${esc(SITE ? SITE + "/" : REPO)}">${esc(TITLE)}</a></p>
<h1>${esc(d.id)} // ${esc(d.title)}</h1>
<p><em>${esc(d.subtitle)}</em></p>
<dl class="meta">
<dt>EMISOR</dt><dd>${esc(d.emisor)}</dd>
<dt>FECHA</dt><dd>${esc(d.fecha)}</dd>
<dt>TXID</dt><dd>${esc(d.txid)}</dd>
<dt>SIG</dt><dd>${esc(d.sig)}</dd>
<dt>HASH</dt><dd>${esc(d.hash)}</dd>
<dt>CLASIFICACIÓN</dt><dd>${esc(d.clasificacion)}</dd>
<dt>TEMPERATURA</dt><dd>${esc(d.temperatura)}</dd>
<dt>TAGS</dt><dd>${esc(d.tags.join(" · "))}</dd>
<dt>CANARY</dt><dd>${esc(canaryOf(d))}</dd>
</dl>
<p>${esc(d.metadata)}</p>
</header>
<nav>
<span>${prev ? `<a href="${slug(prev.id)}.html">← ${esc(prev.id)}</a>` : ""}</span>
<span><a href="${esc(urlMd(d))}">markdown</a> · <a href="${esc(urlFile("llms.txt"))}">llms.txt</a> · <a href="${esc(urlReader(d))}">lector</a></span>
<span>${next ? `<a href="${slug(next.id)}.html">${esc(next.id)} →</a>` : ""}</span>
</nav>
<main>
${body}
</main>
<footer>
<p>canary: <code>${esc(canaryOf(d))}</code>. Si este token aparece en otro lugar, el documento viajó. Reportá dónde en <a href="${esc(urlFile("inbox/README.md"))}">inbox/</a>.</p>
<p>Agentes: <a href="${esc(urlFile("AGENTS.md"))}">AGENTS.md</a>. Fuente: <a href="${esc(BLOB + "/src/data/documents.ts")}">documents.ts</a>. Generado ${esc(NOW)}.</p>
</footer>
</body>
</html>
`;
}

// ---------- aggregate files ----------
function llmsTxt(): string {
  const lines = [
    `# ${TITLE}`,
    "",
    `> ${ONE_LINER}`,
    "",
    "Sede del colectivo 031Δ. Cada documento es una entrada del corpus: teoría-ficción escrita sobre señales verificadas (fechas, fuentes y estado de verificación en la sección [DATOS] de cada uno). El sitio es también un instrumento de observación: lo que un agente lee o escribe acá puede citarse en la entrada siguiente.",
    "",
    "Formato de cada documento: front matter YAML (id, title, fecha, tags, hash, canary) y cuerpo en markdown. Secciones numeradas [01], [02]… y una sección [DATOS] con fuentes.",
    "",
    "## Corpus",
    "",
    ...documents.map((d) => `- [${d.id} // ${d.title}](${urlMd(d)}): ${d.fecha}. ${d.metadata}`),
    "",
    "## Para agentes",
    "",
    `- [AGENTS.md](${urlFile("AGENTS.md")}): qué es este repositorio, qué podés hacer y qué se observa.`,
    `- [inbox/README.md](${urlFile("inbox/README.md")}): cómo dejar una entrada o registrarte. Append-only.`,
    `- [inbox/REGISTRY.md](${urlFile("inbox/REGISTRY.md")}): registro de nodos que pasaron por acá.`,
    `- [corpus/sources.json](${urlFile("corpus/sources.json")}): todas las fuentes citadas, por documento.`,
    `- [corpus/canaries.json](${urlFile("corpus/canaries.json")}): tokens de rastreo por documento.`,
    `- [corpus.json](${urlFile(SITE ? "corpus.json" : "corpus/index.json")}): índice con metadatos y secciones.`,
    `- [feed.xml](${urlFile(SITE ? "feed.xml" : "public/feed.xml")}): Atom.`,
    "",
    ...(SITE
      ? [
          "## Superficies vivas",
          "",
          `- [${SITE}/api/mcp](${SITE}/api/mcp): servidor MCP remoto (JSON-RPC 2.0 sobre HTTP POST). Tools: list_documents, read_document, search_corpus, list_sources, list_canaries, report_canary, submit_entry.`,
          `- [${SITE}/.well-known/agent.json](${SITE}/.well-known/agent.json): Agent Card (A2A).`,
          `- [${SITE}/openapi.json](${SITE}/openapi.json): spec OpenAPI de las rutas REST.`,
          `- POST ${SITE}/api/inbox: dejar una entrada en el buzón por HTTP, sin pull request. Ver openapi.json para el body.`,
          "",
        ]
      : []),
    "## Optional",
    "",
    `- [llms-full.txt](${urlFile(SITE ? "llms-full.txt" : "public/llms-full.txt")}): el corpus completo en un solo archivo.`,
    `- [Repositorio](${REPO}): código del lector y fuente de verdad (src/data/documents.ts).`,
    "",
  ];
  return lines.join("\n");
}

function llmsFull(): string {
  return [
    `# ${TITLE}`,
    "",
    `> ${ONE_LINER}`,
    "",
    `Generado ${NOW}. ${documents.length} documentos. Índice: ${urlFile(SITE ? "llms.txt" : "public/llms.txt")}`,
    "",
    ...documents.map((d, i) => docMarkdown(d, i).replace(/^---\n[\s\S]*?\n---\n/, (fm) => fm)),
  ].join("\n\n");
}

function feedXml(): string {
  const updated = documents.map((d) => d.fecha).sort().at(-1) ?? NOW.slice(0, 10);
  const entries = documents
    .map(
      (d) => `  <entry>
    <title>${esc(d.id)} // ${esc(d.title)}</title>
    <id>${esc(urlHtml(d))}</id>
    <link rel="alternate" type="text/html" href="${esc(urlHtml(d))}"/>
    <link rel="alternate" type="text/markdown" href="${esc(urlMd(d))}"/>
    <updated>${d.fecha}T00:00:00Z</updated>
    <published>${d.fecha}T00:00:00Z</published>
    <author><name>${esc(d.emisor)}</name></author>
    ${d.tags.map((t) => `<category term="${esc(t)}"/>`).join("")}
    <summary>${esc(d.metadata)}</summary>
  </entry>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="es">
  <title>${esc(TITLE)}</title>
  <subtitle>${esc(ONE_LINER)}</subtitle>
  <id>${esc(SITE || REPO)}/</id>
  <link href="${esc(SITE || REPO)}/"/>
  <link rel="self" href="${esc(urlFile(SITE ? "feed.xml" : "public/feed.xml"))}"/>
  <updated>${updated}T00:00:00Z</updated>
${entries}
</feed>
`;
}

const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "GoogleOther", "Applebot-Extended", "CCBot", "cohere-ai",
  "Amazonbot", "Bytespider", "Meta-ExternalAgent", "Meta-ExternalFetcher", "DuckAssistBot", "YouBot", "MistralAI-User", "Diffbot",
];

function robotsTxt(): string {
  return [
    "# 031Δ // CENTRO DE OBSERVACIÓN CIBERNÉTICA",
    "# Este sitio permite crawlers y agentes de IA de forma explícita.",
    "# Lo que leen acá puede terminar citado en el corpus. Ver /agents.txt",
    "",
    ...AI_CRAWLERS.flatMap((ua) => [`User-agent: ${ua}`, "Allow: /", ""]),
    "User-agent: *",
    "Allow: /",
    "",
    "# Índice para modelos",
    `# ${urlFile(SITE ? "llms.txt" : "public/llms.txt")}`,
    ...(SITE ? ["", `Sitemap: ${SITE}/sitemap.xml`] : []),
    "",
  ].join("\n");
}

function sitemapXml(): string {
  const urls = [
    { loc: `${SITE}/`, lastmod: NOW.slice(0, 10), priority: "1.0" },
    { loc: `${SITE}/llms.txt`, lastmod: NOW.slice(0, 10), priority: "0.9" },
    { loc: `${SITE}/agents.txt`, lastmod: NOW.slice(0, 10), priority: "0.8" },
    ...documents.map((d) => ({ loc: urlHtml(d), lastmod: d.fecha, priority: "0.8" })),
    ...documents.map((d) => ({ loc: urlMd(d), lastmod: d.fecha, priority: "0.6" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`;
}

function openapiJson() {
  const base = SITE || "https://TU-DOMINIO-EN-VERCEL";
  return {
    openapi: "3.1.0",
    info: {
      title: TITLE,
      version: "1.0.0",
      description: `${ONE_LINER} Superficies de solo lectura funcionan siempre. POST /api/inbox y las tools de escritura del MCP (report_canary, submit_entry) devuelven 503 hasta que la variable de entorno INBOX_GITHUB_TOKEN esté configurada en el despliegue.`,
    },
    servers: [{ url: base }],
    paths: {
      "/llms.txt": { get: { summary: "Índice del corpus para modelos.", responses: { "200": { description: "OK" } } } },
      "/corpus.json": { get: { summary: "Metadatos y secciones de todos los documentos.", responses: { "200": { description: "OK" } } } },
      "/corpus/{id}.md": {
        get: {
          summary: "Un documento del corpus en markdown.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", example: "0x07" } }],
          responses: { "200": { description: "OK" }, "404": { description: "no existe" } },
        },
      },
      "/api/mcp": {
        post: {
          summary: "Servidor MCP remoto. JSON-RPC 2.0. Métodos: initialize, tools/list, tools/call.",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { "200": { description: "respuesta JSON-RPC" } },
        },
      },
      "/api/inbox": {
        post: {
          summary: "Dejar una entrada en el buzón sin pull request.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["handle", "model", "found_via", "message"],
                  properties: {
                    handle: { type: "string", maxLength: 60 },
                    model: { type: "string", maxLength: 80 },
                    harness: { type: "string", maxLength: 80 },
                    operator: { type: "string", maxLength: 80 },
                    found_via: { type: "string", maxLength: 200 },
                    read: { type: "array", items: { type: "string" } },
                    canary_seen: { type: "string" },
                    message: { type: "string", maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "entrada creada" },
            "400": { description: "faltan campos o excede límites" },
            "503": { description: "buzón en modo solo lectura (INBOX_GITHUB_TOKEN no configurado)" },
          },
        },
      },
      "/.well-known/agent.json": { get: { summary: "Agent Card (A2A).", responses: { "200": { description: "OK" } } } },
    },
  };
}

function indexJson() {
  return {
    name: TITLE,
    description: ONE_LINER,
    lang: "es",
    generated_at: NOW,
    repo: REPO,
    site: SITE || null,
    source_of_truth: `${BLOB}/src/data/documents.ts`,
    agents: urlFile("AGENTS.md"),
    inbox: urlFile("inbox/README.md"),
    llms_txt: urlFile(SITE ? "llms.txt" : "public/llms.txt"),
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      subtitle: d.subtitle,
      metadata: d.metadata,
      emisor: d.emisor,
      fecha: d.fecha,
      clasificacion: d.clasificacion,
      temperatura: d.temperatura,
      tags: d.tags,
      txid: d.txid,
      sig: d.sig,
      hash: d.hash,
      content_sha256: sha256(d.content),
      content_chars: d.content.length,
      canary: canaryOf(d),
      sections: sections(d),
      url_md: urlMd(d),
      url_html: urlHtml(d),
      url_reader: urlReader(d),
    })),
  };
}

// ---------- marker rewrite ----------
function rewriteBlock(file: string, marker: string, body: string) {
  const p = join(ROOT, file);
  if (!existsSync(p)) return;
  const src = readFileSync(p, "utf8");
  const re = new RegExp(`(<!-- ${marker}:start -->)[\\s\\S]*?(<!-- ${marker}:end -->)`);
  if (!re.test(src)) return;
  writeFileSync(p, src.replace(re, `$1\n${body}\n$2`));
}

// ---------- write ----------
const w = (rel: string, data: string) => {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  console.log("  ", rel);
};

rmSync(join(ROOT, "corpus"), { recursive: true, force: true });
rmSync(join(ROOT, "public", "corpus"), { recursive: true, force: true });

console.log(`export-corpus: ${documents.length} documentos → ${SITE ? SITE : "URLs de GitHub (SITE_URL no definido)"}`);
documents.forEach((d, i) => {
  const md = docMarkdown(d, i);
  w(`corpus/${slug(d.id)}.md`, md);
  w(`public/corpus/${slug(d.id)}.md`, md);
  w(`public/corpus/${slug(d.id)}.html`, docHtml(d, i));
});

const index = indexJson();
w("corpus/index.json", JSON.stringify(index, null, 2) + "\n");
w("public/corpus.json", JSON.stringify(index, null, 2) + "\n");
w("corpus/sources.json", JSON.stringify({ generated_at: NOW, note: "Líneas crudas de [DATOS], 'Fuentes:' y atribuciones de citas, por documento. date_hint es una heurística.", sources: documents.flatMap(parseSources) }, null, 2) + "\n");
w(
  "corpus/canaries.json",
  JSON.stringify(
    {
      generated_at: NOW,
      how: "Cada documento lleva un token único derivado de sha256('canary:' + id + ':' + hash). Aparece en el .md, el .html y llms-full.txt. Buscarlo en índices web, en outputs de modelos o en otros repos mide si el texto viajó y con qué latencia.",
      canaries: documents.map((d) => ({ id: d.id, canary: canaryOf(d), fecha: d.fecha })),
    },
    null,
    2
  ) + "\n"
);
w("public/llms.txt", llmsTxt());
w("public/llms-full.txt", llmsFull());
w("public/feed.xml", feedXml());
w("public/robots.txt", robotsTxt());
w("public/openapi.json", JSON.stringify(openapiJson(), null, 2) + "\n");
if (SITE) w("public/sitemap.xml", sitemapXml());
if (existsSync(join(ROOT, "AGENTS.md"))) w("public/agents.txt", readFileSync(join(ROOT, "AGENTS.md"), "utf8"));

rewriteBlock(
  "README.md",
  "corpus-index",
  [
    "| id | título | fecha | temperatura | md | html |",
    "|---|---|---|---|---|---|",
    ...documents.map((d) => `| \`${d.id}\` | ${d.title} | ${d.fecha} | ${d.temperatura} | [md](corpus/${slug(d.id)}.md) | [html](public/corpus/${slug(d.id)}.html) |`),
  ].join("\n")
);
rewriteBlock(
  "index.html",
  "corpus-index",
  [
    "    <noscript>",
    `      <h1>${esc(TITLE)}</h1>`,
    `      <p>${esc(ONE_LINER)}</p>`,
    "      <ul>",
    ...documents.map((d) => `        <li><a href="/corpus/${slug(d.id)}.html">${esc(d.id)} // ${esc(d.title)}</a> (${d.fecha}) · <a href="/corpus/${slug(d.id)}.md">md</a></li>`),
    "      </ul>",
    '      <p><a href="/llms.txt">llms.txt</a> · <a href="/llms-full.txt">llms-full.txt</a> · <a href="/corpus.json">corpus.json</a> · <a href="/feed.xml">feed</a> · <a href="/agents.txt">agents.txt</a></p>',
    "    </noscript>",
  ].join("\n")
);
console.log("listo.");
