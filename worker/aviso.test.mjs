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
