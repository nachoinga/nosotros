// Pruebas del aviso del día 10.   Correr:  node --test worker/aviso.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/* ── texto del aviso (aviso-texto.js) ─────────────────────────────── */
const { armarAviso, mesesCumplidos } = require("../aviso-texto.js");

const INICIO = "2026-03-10T00:00:00";
const datos = (quien) => ({
  inicio: INICIO,
  quien,
  nombres: { ella: "Florencia", yo: "Ignacio" },
  textos: {
    ella: { titulo: "💗 +1 mes juntos", texto: "Hoy cumplimos {n} meses. Te amo con mi corazoncito." },
    yo: { titulo: "💗 +1 mes juntos", texto: "Hoy cumplimos {n} meses." },
  },
});

test("mesesCumplidos cuenta por calendario", () => {
  const i = new Date(INICIO);
  assert.equal(mesesCumplidos(i, new Date("2026-12-10T10:00:00")), 9);
  assert.equal(mesesCumplidos(i, new Date("2026-11-10T10:00:00")), 8);
  assert.equal(mesesCumplidos(i, new Date("2027-03-10T10:00:00")), 12);
  assert.equal(mesesCumplidos(i, new Date("2026-12-09T23:00:00")), 8);
});

test("aviso para ella el día 10", () => {
  const a = armarAviso(datos("Florencia"), new Date("2026-12-10T10:00:00"));
  assert.equal(a.titulo, "💗 +1 mes juntos");
  assert.equal(a.cuerpo, "Hoy cumplimos 9 meses. Te amo con mi corazoncito.");
});

test("aviso para él el día 10", () => {
  const a = armarAviso(datos("Ignacio"), new Date("2026-12-10T10:00:00"));
  assert.equal(a.cuerpo, "Hoy cumplimos 9 meses.");
});

test("si no es día 10 es una prueba, no un 'hoy cumplimos' falso", () => {
  const a = armarAviso(datos("Florencia"), new Date("2026-12-11T10:00:00"));
  assert.equal(a.titulo, "Prueba del aviso del día 10");
  assert.ok(!a.cuerpo.includes("cumplimos"));
});

test("sin datos guardados igual muestra algo", () => {
  const a = armarAviso(null, new Date("2026-12-10T10:00:00"));
  assert.ok(a.titulo.length > 0 && a.cuerpo.length > 0);
});

test("un nombre desconocido usa el texto corto", () => {
  const a = armarAviso(datos("Otra persona"), new Date("2026-12-10T10:00:00"));
  assert.equal(a.cuerpo, "Hoy cumplimos 9 meses.");
});

/* ── worker: suscripciones, firma VAPID y envío ───────────────────── */
const { hostPermitido, firmarVapid, guardarSuscripcion, enviarAvisos } =
  await import("./borrar.js");

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const desb64u = (s) => Buffer.from(s, "base64url");

/* un KV de mentira: sólo get y put */
const kvFalso = (inicial = {}) => {
  const m = new Map(Object.entries(inicial));
  return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => void m.set(k, v), _m: m };
};
const pedidoJson = (cuerpo) => new Request("https://x.test/suscribir", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
});
const sub = (n, host = "web.push.apple.com") => ({ endpoint: `https://${host}/wpush/${n}`, keys: { p256dh: "a", auth: "b" } });

test("hostPermitido acepta sólo servicios de avisos conocidos por https", () => {
  assert.equal(hostPermitido("https://web.push.apple.com/x"), true);
  assert.equal(hostPermitido("https://fcm.googleapis.com/fcm/send/x"), true);
  assert.equal(hostPermitido("https://updates.push.services.mozilla.com/x"), true);
  assert.equal(hostPermitido("https://par02p.notify.windows.com/x"), true);
  assert.equal(hostPermitido("http://web.push.apple.com/x"), false);
  assert.equal(hostPermitido("https://evil.com/"), false);
  assert.equal(hostPermitido("https://web.push.apple.com.evil.com/x"), false);
  assert.equal(hostPermitido("no es una url"), false);
});

test("firmarVapid arma un JWT ES256 que se verifica con la clave pública", async () => {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", par.privateKey);
  const publica = b64u(await crypto.subtle.exportKey("raw", par.publicKey));
  const ahora = Math.floor(Date.now() / 1000);

  const cab = await firmarVapid("https://web.push.apple.com/wpush/abc", jwk, publica, ahora);
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(cab);
  assert.ok(m, "formato del encabezado: " + cab);
  assert.equal(m[2], publica);

  const [h, p, s] = m[1].split(".");
  assert.deepEqual(JSON.parse(desb64u(h)), { typ: "JWT", alg: "ES256" });
  const carga = JSON.parse(desb64u(p));
  assert.equal(carga.aud, "https://web.push.apple.com");
  assert.equal(carga.sub, "https://nachoinga.github.io/nosotros/");
  assert.ok(carga.exp > ahora && carga.exp <= ahora + 12 * 3600);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, par.publicKey,
    desb64u(s), new TextEncoder().encode(h + "." + p));
  assert.equal(ok, true);
});

test("guardarSuscripcion: no duplica, rechaza hosts raros y tope de 20", async () => {
  const env = { MENSAJES: kvFalso() };
  let r = await guardarSuscripcion(env, pedidoJson({ de: "Florencia", sub: sub(1) }));
  assert.equal(r.status, 200);
  r = await guardarSuscripcion(env, pedidoJson({ de: "Florencia", sub: sub(1) }));
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(await env.MENSAJES.get("avisos")).length, 1);

  r = await guardarSuscripcion(env, pedidoJson({ de: "X", sub: sub(2, "evil.com") }));
  assert.equal(r.status, 400);
  r = await guardarSuscripcion(env, pedidoJson({ de: "X" }));
  assert.equal(r.status, 400);

  for (let i = 2; i <= 20; i++) await guardarSuscripcion(env, pedidoJson({ de: "X", sub: sub(i) }));
  assert.equal(JSON.parse(await env.MENSAJES.get("avisos")).length, 20);
  r = await guardarSuscripcion(env, pedidoJson({ de: "X", sub: sub(21) }));
  assert.equal(r.status, 409);
  r = await guardarSuscripcion(env, pedidoJson({ de: "Florencia", sub: sub(1) }));
  assert.equal(r.status, 200, "una ya anotada se actualiza aunque esté lleno");
});

test("guardarSuscripcion sin KV responde 501", async () => {
  const r = await guardarSuscripcion({}, pedidoJson({ de: "X", sub: sub(1) }));
  assert.equal(r.status, 501);
});

test("enviarAvisos manda a todos, borra sólo los vencidos y no se corta si uno falla", async () => {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", par.privateKey);
  const publica = b64u(await crypto.subtle.exportKey("raw", par.publicKey));
  const lista = [1, 2, 3, 4].map((n) => ({ ...sub(n), de: "X" }));
  const env = { MENSAJES: kvFalso({ avisos: JSON.stringify(lista) }),
    VAPID_PRIVADA: JSON.stringify(jwk), VAPID_PUBLICA: publica };

  const llamadas = [];
  const fetchFalso = async (url, op) => {
    llamadas.push({ url, op });
    if (url.endsWith("/2")) return new Response(null, { status: 410 });
    if (url.endsWith("/3")) throw new Error("sin red");
    return new Response(null, { status: 201 });
  };

  const res = await enviarAvisos(env, fetchFalso);
  assert.deepEqual(res, { enviados: 2, borrados: 1 });
  assert.equal(llamadas.length, 4);
  for (const { op } of llamadas) {
    assert.equal(op.method, "POST");
    assert.equal(op.body, undefined, "el aviso va vacío");
    assert.ok(op.headers.TTL);
    assert.match(op.headers.Authorization, /^vapid t=.+, k=.+$/);
  }
  const quedan = JSON.parse(await env.MENSAJES.get("avisos")).map((s) => s.endpoint.split("/").pop());
  assert.deepEqual(quedan, ["1", "3", "4"]);
});

test("enviarAvisos sin suscriptores no hace nada", async () => {
  const res = await enviarAvisos({ MENSAJES: kvFalso(), VAPID_PRIVADA: "{}", VAPID_PUBLICA: "x" },
    async () => { throw new Error("no debería llamar"); });
  assert.deepEqual(res, { enviados: 0, borrados: 0 });
});
