// App Semanal — intermediario de Google (Cloudflare Worker)
// ---------------------------------------------------------
// Guarda la conexión con Google de forma permanente para que la app web
// no tenga que reconectar cada hora. Solo hace tres cosas:
//   POST /exchange  -> canjea el código de Google por un permiso permanente
//   POST /refresh   -> da un acceso nuevo (válido 1 hora) cuando caduca
//   POST /revoke    -> retira el permiso (botón «Desconectar Google»)
// Tus eventos y tareas NO pasan por aquí: van directos del navegador a Google.
//
// Variables que hay que poner en Cloudflare (Settings > Variables and Secrets):
//   GOOGLE_CLIENT_ID      (texto)   el ID de cliente web de Google Cloud
//   GOOGLE_CLIENT_SECRET  (secreto) el secreto de ese mismo cliente
//   ALLOWED_ORIGIN        (texto)   https://daniurquijo2.github.io

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "https://daniurquijo2.github.io").replace(/\/$/, "");
    const cors = {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const reply = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/") return reply({ ok: true, app: "App Semanal" });
    if (origin !== allowed) return reply({ error: "Origen no permitido" }, 403);
    if (request.method !== "POST") return reply({ error: "Método no permitido" }, 405);
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return reply({ error: "Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en Cloudflare" }, 500);
    }

    let body;
    try { body = await request.json(); } catch { return reply({ error: "Petición no válida" }, 400); }
    const key = await aesKey(env.GOOGLE_CLIENT_SECRET);

    try {
      if (path === "/exchange") {
        const { code, code_verifier, redirect_uri } = body;
        if (!code || !code_verifier || !redirect_uri || !redirect_uri.startsWith(allowed + "/")) {
          return reply({ error: "Petición no válida" }, 400);
        }
        const r = await google(TOKEN_URL, {
          client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
          code, code_verifier, redirect_uri, grant_type: "authorization_code",
        });
        if (!r.ok) return reply({ error: "Google no aceptó la conexión: " + (r.data.error_description || r.data.error || r.status) }, 400);
        if (!r.data.refresh_token) return reply({ error: "Google no devolvió un permiso permanente. Vuelve a conectar." }, 400);
        const session = await seal(key, r.data.refresh_token);
        return reply({ access_token: r.data.access_token, expires_in: r.data.expires_in, scope: r.data.scope || "", session });
      }

      if (path === "/refresh") {
        const refresh = await open(key, body.session);
        if (!refresh) return reply({ error: "reconnect" }, 401);
        const r = await google(TOKEN_URL, {
          client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
          refresh_token: refresh, grant_type: "refresh_token",
        });
        if (!r.ok) {
          if (r.data.error === "invalid_grant") return reply({ error: "reconnect" }, 401);
          return reply({ error: "Google no respondió: " + (r.data.error || r.status) }, 502);
        }
        return reply({ access_token: r.data.access_token, expires_in: r.data.expires_in, scope: r.data.scope || "" });
      }

      if (path === "/revoke") {
        const refresh = await open(key, body.session);
        if (refresh) await google(REVOKE_URL, { token: refresh });
        return reply({ ok: true });
      }
    } catch (e) {
      return reply({ error: "Error del intermediario: " + (e && e.message || e) }, 500);
    }
    return reply({ error: "No encontrado" }, 404);
  },
};

async function google(url, fields) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

// El permiso permanente se guarda cifrado en el navegador; solo este Worker puede leerlo.
async function aesKey(secret) {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("app-semanal:" + secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function seal(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return b64(iv) + "." + b64(ct);
}
async function open(key, token) {
  try {
    const [iv, ct] = String(token || "").split(".");
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ct));
    return new TextDecoder().decode(pt);
  } catch { return null; }
}
