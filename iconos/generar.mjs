// Dibuja los íconos de la app (un corazón rosa sobre fondo rosa claro).
// No usa dependencias: arma los PNG a mano con zlib, que viene con Node.
//
// Para volver a generarlos:   node iconos/generar.mjs

import { deflateSync, crc32 } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FONDO = [0xfc, 0xe3, 0xeb];   // --rosa-suave
const CORAZON = [0xb0, 0x2a, 0x5b]; // --rosa-hondo

const chunk = (tipo, datos) => {
  const t = Buffer.from(tipo, "ascii");
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, datos])) >>> 0);
  return Buffer.concat([largo, t, datos, crc]);
};

// ¿Está el punto (x, y) dentro del corazón? (x, y en unidades del corazón)
const dentro = (x, y) => Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y <= 0;

/** Devuelve un PNG (Buffer) cuadrado de `lado` px, con el corazón ocupando
 *  (1 - 2*margen) del ancho. */
export function dibujar(lado, margen) {
  const escala = (lado * (1 - 2 * margen)) / 2.3;
  const cx = lado / 2, cy = lado / 2 + 0.1 * escala;
  const filas = [];
  const SS = 3; // supersampling 3x3 para suavizar los bordes
  for (let py = 0; py < lado; py++) {
    const fila = Buffer.alloc(1 + lado * 3); // 1er byte: filtro 0
    for (let px = 0; px < lado; px++) {
      let n = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = (px + (sx + .5) / SS - cx) / escala;
        const y = -(py + (sy + .5) / SS - cy) / escala;
        if (dentro(x, y)) n++;
      }
      const a = n / (SS * SS);
      for (let c = 0; c < 3; c++) {
        fila[1 + px * 3 + c] = Math.round(FONDO[c] * (1 - a) + CORAZON[c] * a);
      }
    }
    filas.push(fila);
  }
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(lado, 0); cabecera.writeUInt32BE(lado, 4);
  cabecera[8] = 8; cabecera[9] = 2; // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", cabecera),
    chunk("IDAT", deflateSync(Buffer.concat(filas))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const aca = dirname(fileURLToPath(import.meta.url));
  const salidas = [
    ["icono-192.png", 192, 0.14],
    ["icono-512.png", 512, 0.14],
    ["icono-maskable-512.png", 512, 0.28], // el sistema recorta los bordes: más aire
    ["apple-touch-icon.png", 180, 0.14],
  ];
  for (const [nombre, lado, margen] of salidas) {
    writeFileSync(join(aca, nombre), dibujar(lado, margen));
    console.log("listo", nombre);
  }
}
