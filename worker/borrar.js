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

export default {
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
