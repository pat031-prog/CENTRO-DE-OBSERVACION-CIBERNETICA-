/**
 * Edge Middleware: clasifica y loguea cada visita a las superficies que
 * importan (lector, llms.txt, agents.txt, agent card, endpoints /api).
 * No bloquea ni redirige nada — solo observa. Se ve en Vercel → el
 * proyecto → Logs (o Runtime Logs), en tiempo real.
 *
 * Es deliberadamente el primer paso, el más barato: sin base de datos, sin
 * agregación, sin dashboard propio. Eso viene después si esto vale la pena.
 */
export const config = {
  matcher: ["/", "/llms.txt", "/llms-full.txt", "/agents.txt", "/corpus.json", "/openapi.json", "/.well-known/agent.json", "/api/:path*", "/corpus/:path*"],
};

const AI_UA =
  /(GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-Web|Claude-SearchBot|Claude-User|anthropic-ai|PerplexityBot|Perplexity-User|Google-Extended|GoogleOther|Applebot-Extended|CCBot|cohere-ai|Amazonbot|Bytespider|Meta-ExternalAgent|Meta-ExternalFetcher|DuckAssistBot|YouBot|MistralAI-User|Diffbot)/i;
const SCRIPT_UA = /(python-requests|python-httpx|node-fetch|axios|go-http-client|okhttp|curl|Scrapy|libwww-perl|Java\/)/i;

function classify(ua: string): "ai-crawler" | "script" | "browser" | "unknown" {
  if (!ua) return "unknown";
  if (AI_UA.test(ua)) return "ai-crawler";
  if (SCRIPT_UA.test(ua)) return "script";
  if (/Mozilla\//.test(ua)) return "browser";
  return "unknown";
}

export default function middleware(req: Request) {
  const url = new URL(req.url);
  const ua = req.headers.get("user-agent") || "";
  console.log(
    JSON.stringify({
      t: new Date().toISOString(),
      path: url.pathname,
      method: req.method,
      kind: classify(ua),
      ua: ua.slice(0, 160),
      accept: req.headers.get("accept") || null,
      referer: req.headers.get("referer") || null,
      country: req.headers.get("x-vercel-ip-country") || null,
    })
  );
  // sin return: passthrough, no modifica la request
}
