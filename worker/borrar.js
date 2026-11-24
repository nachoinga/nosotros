// Ayudante para borrar fotos del álbum.
// Guarda la clave secreta de Cloudinary FUERA de la página, que es pública.
// Sólo puede borrar fotos que estén en el álbum: cualquier otra cosa la rechaza.

const CLOUD = "umxsjun3";
const TAG = "nosotros";
const DESDE = "https://nachoinga.github.io";

const CABECERAS = {
  "Access-Control-Allow-Origin": DESDE,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const responder = (datos, estado) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "Content-Type": "application/json", ...CABECERAS },
  });

async function firmar(texto) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── mensajes ────────────────────────────────────────────────────────
// Necesita un KV llamado MENSAJES (ver LEEME.md). Si no está, devuelve 501
// y la página simplemente no muestra la sección.
const LIMITE = 300;

async function mensajes(pedido, entorno) {
  if (!entorno.MENSAJES) return responder({ error: "sin almacenamiento" }, 501);

  const guardados = JSON.parse((await entorno.MENSAJES.get("lista")) || "[]");

  if (pedido.method === "GET") return responder({ mensajes: guardados }, 200);

  const { de, texto } = await pedido.json().catch(() => ({}));
  const limpio = String(texto || "").trim().slice(0, 600);
  const quien = String(de || "").trim().slice(0, 40);
  if (!limpio || !quien) return responder({ error: "falta el mensaje" }, 400);

  const nuevos = [{ de: quien, texto: limpio, fecha: new Date().toISOString() },
                  ...guardados].slice(0, LIMITE);
  await entorno.MENSAJES.put("lista", JSON.stringify(nuevos));
  return responder({ mensajes: nuevos }, 200);
}

// ── aviso del día 10 ────────────────────────────────────────────────
// Los teléfonos que activaron el aviso quedan anotados en el mismo KV
// (clave "avisos"). El día 10, el cron manda a cada uno un aviso VACÍO,
// firmado con la clave privada (secreto VAPID_PRIVADA, variable
// VAPID_PUBLICA). El texto lo arma el propio teléfono.
const CONTACTO = "https://nachoinga.github.io/nosotros/";
const HOSTS_AVISO = [
  "web.push.apple.com",
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
];
const MAX_SUSCRIPCIONES = 20;

const enBase64Url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Sólo se aceptan direcciones de los servicios de avisos de siempre.
export function hostPermitido(endpoint) {
  let u;
  try { u = new URL(endpoint); } catch { return false; }
  if (u.protocol !== "https:") return false;
  return HOSTS_AVISO.includes(u.hostname) || u.hostname.endsWith(".notify.windows.com");
}

// Encabezado Authorization (VAPID, ES256) para un servicio de avisos.
export async function firmarVapid(endpoint, privadaJwk, publicaB64, ahoraSeg) {
  const codificar = new TextEncoder();
  const cabecera = enBase64Url(codificar.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const carga = enBase64Url(codificar.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: ahoraSeg + 12 * 3600,
    sub: CONTACTO,
  })));
  const clave = await crypto.subtle.importKey(
    "jwk", privadaJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, clave, codificar.encode(cabecera + "." + carga));
  return `vapid t=${cabecera}.${carga}.${enBase64Url(firma)}, k=${publicaB64}`;
}

export async function guardarSuscripcion(entorno, pedido) {
  if (!entorno.MENSAJES) return responder({ error: "sin almacenamiento" }, 501);
  const { de, sub } = await pedido.json().catch(() => ({}));
  if (!sub || !hostPermitido(sub.endpoint)) return responder({ error: "suscripcion invalida" }, 400);

  const lista = JSON.parse((await entorno.MENSAJES.get("avisos")) || "[]");
  const nueva = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: String((sub.keys || {}).p256dh || "").slice(0, 200),
      auth: String((sub.keys || {}).auth || "").slice(0, 100),
    },
    de: String(de || "").trim().slice(0, 40),
  };
  const i = lista.findIndex((s) => s.endpoint === sub.endpoint);
  if (i >= 0) lista[i] = nueva;
  else {
    if (lista.length >= MAX_SUSCRIPCIONES) return responder({ error: "no hay lugar" }, 409);
    lista.push(nueva);
  }
  await entorno.MENSAJES.put("avisos", JSON.stringify(lista));
  return responder({ ok: true, total: lista.length }, 200);
}

// Lo que corre el cron. Devuelve cuántos mandó y cuántos borró por vencidos.
export async function enviarAvisos(
  entorno,
  fetchFn = (url, op) => fetch(url, op),
  ahoraSeg = Math.floor(Date.now() / 1000)
) {
  if (!entorno.MENSAJES) return { enviados: 0, borrados: 0 };
  const lista = JSON.parse((await entorno.MENSAJES.get("avisos")) || "[]");
  if (!lista.length) return { enviados: 0, borrados: 0 };

  const privada = JSON.parse(entorno.VAPID_PRIVADA);
  const vencidas = new Set();
  let enviados = 0;

  for (const s of lista) {
    try {
      const autorizacion = await firmarVapid(s.endpoint, privada, entorno.VAPID_PUBLICA, ahoraSeg);
      const r = await fetchFn(s.endpoint, {
        method: "POST",
        headers: { Authorization: autorizacion, TTL: "3600", Urgency: "high" },
      });
      if (r.status === 404 || r.status === 410) vencidas.add(s.endpoint);
      else if (r.ok) enviados++;
    } catch {
      // un teléfono que falla no frena a los demás
    }
  }

  if (vencidas.size) {
    await entorno.MENSAJES.put("avisos",
      JSON.stringify(lista.filter((s) => !vencidas.has(s.endpoint))));
  }
  return { enviados, borrados: vencidas.size };
}

export default {
  async scheduled(evento, entorno, ctx) {
    ctx.waitUntil(enviarAvisos(entorno));
  },

  async fetch(pedido, entorno) {
    if (pedido.method === "OPTIONS") return new Response(null, { status: 204, headers: CABECERAS });

    const ruta = new URL(pedido.url).pathname.replace(/\/+$/, "");
    if (ruta === "/extrano") {
      if (!entorno.MENSAJES) return responder({ error: "sin almacenamiento" }, 501);
      let veces = Number((await entorno.MENSAJES.get("extrano")) || 0);
      if (pedido.method === "POST") {
        veces += 1;
        await entorno.MENSAJES.put("extrano", String(veces));
      }
      return responder({ veces }, 200);
    }

    if (ruta === "/mensajes") {
      if (pedido.method !== "GET" && pedido.method !== "POST")
        return responder({ error: "solo GET o POST" }, 405);
      return mensajes(pedido, entorno);
    }

    if (ruta === "/suscribir") {
      if (pedido.method !== "POST") return responder({ error: "solo POST" }, 405);
      return guardarSuscripcion(entorno, pedido);
    }

    if (pedido.method !== "POST") return responder({ error: "solo POST" }, 405);

    const { public_id } = await pedido.json().catch(() => ({}));
    if (!public_id) return responder({ error: "falta public_id" }, 400);

    // candado: sólo lo que está en el álbum
    const lista = await fetch(
      `https://res.cloudinary.com/${CLOUD}/image/list/${TAG}.json`
    ).then((r) => (r.ok ? r.json() : { resources: [] }));
    if (!lista.resources.some((r) => r.public_id === public_id)) {
      return responder({ error: "esa foto no es del album" }, 403);
    }

    const ts = Math.floor(Date.now() / 1000);
    const firma = await firmar(`public_id=${public_id}&timestamp=${ts}${entorno.API_SECRET}`);

    const datos = new FormData();
    datos.append("public_id", public_id);
    datos.append("timestamp", String(ts));
    datos.append("api_key", entorno.API_KEY);
    datos.append("signature", firma);

    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/destroy`, {
      method: "POST",
      body: datos,
    });
    return responder(await r.json().catch(() => ({})), r.status);
  },
};
