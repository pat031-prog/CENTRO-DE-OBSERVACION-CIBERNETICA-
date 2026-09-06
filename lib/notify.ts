/**
 * Notificación por mail cuando pasa algo real en el buzón (entrada nueva,
 * canario reportado). Best-effort: si falla, se loguea y se sigue — nunca
 * tiene que romper la escritura que la disparó.
 *
 * Usa la API HTTP de Resend (sin SDK, solo fetch). RESEND_API_KEY no
 * configurado -> no-op silencioso (queda solo en los logs).
 * NOTIFY_FROM por defecto es el remitente de test de Resend
 * (onboarding@resend.dev), que no necesita dominio propio verificado
 * mientras el destino sea la misma cuenta de Resend.
 */
export const CONTACT_EMAIL = "valbusapatricio564@gmail.com"; // mail público de contacto de 031Δ — ver AGENTS.md

export async function notify(subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("notify (RESEND_API_KEY no configurado, solo log):", subject);
    return;
  }
  const to = process.env.NOTIFY_EMAIL || CONTACT_EMAIL;
  const from = process.env.NOTIFY_FROM || "031Δ <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) console.error("notify: Resend respondió", res.status, await res.text());
  } catch (e) {
    console.error("notify: fallo de red", e);
  }
}
