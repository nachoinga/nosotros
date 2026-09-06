# Nuestro 10 de marzo — cómo completarla

Todo se edita en **un solo lugar**: el bloque `CONFIG` que está arriba de todo
en `index.html`. No hace falta tocar nada más.

Abrí `index.html` con el Bloc de notas (o cualquier editor) y buscá `const CONFIG`.

## Cómo funciona el "modo borrador"

Cada cosa sin completar tiene esta línea:

    pendiente: true

Mientras esté ahí, se ve en gris punteado y aparece contada en el panel rosa
de abajo a la derecha, que te dice **cuánto te falta**. Ese panel lo ves solo vos.

Cuando completás algo, **borrá esa línea** y listo.

Al final, cambiá la última línea del bloque:

    modoBorrador: false

Con eso desaparece el panel y también todo lo que hayas dejado sin llenar.
Recién ahí pasale la página.

## Lo que conviene completar

1. **Los nombres** — `nombres: { ella: "", yo: "" }`. Sin esto no aparece la línea de nombres.
2. **La hora del primer mensaje** — si te acordás, cambiá `inicio` de
   `"2026-03-10T00:00:00"` a la hora real. El contador se vuelve exacto.
3. **La historia** — el 10 de marzo ya está. Agregá los otros días.
4. **Cosas tuyas** — seis detalles de ella. Es la sección que más pega.
5. **Las fotos** — metelas en la carpeta `fotos/` y poné el nombre del archivo
   en `src`. Por ejemplo: `src: "fotos/primera-cita.jpg"`.
6. **Los planes** — la lista de cosas para hacer juntos.
7. **El cierre** — el bloque `final`, lo último que lee. Son tres campos:
   `frase` (grande, en cursiva), `texto` (la aclaración, dos renglones) y
   `firma` (manuscrita). Corto a propósito: es un sello, no una carta.
   El número de días que aparece ahí se calcula solo, no lo toques.

## La historia: tres formas de contarla

La sección de historia tiene ahora tres piezas distintas, y ninguna tiene límite
de cantidad.

### 1. `historia` — los bloques con fecha

Los momentos importantes, cada uno con su fecha, título y texto. Para agregar
uno más, copiá y pegá un bloque entero:

    {
      fecha: "2026-04-22",
      titulo: "Título del momento",
      texto: "Lo que pasó ese día."
    },

Podés poner los que quieras. No hay tope.

### 2. `sueltos` — los de una línea

Para todo lo que no da para un bloque entero pero igual querés que esté.
Aparecen abajo de la línea de tiempo, en dos columnas, chiquitos:

    { texto: "Esa vez que nos reímos media hora de nada." },

Ideal para meter veinte o treinta cosas sin que la página se haga eterna.

### 3. `cierre` — el tramo abierto

Este es el que reemplazó a "el día que dijimos que sí". No tiene fecha de final:
arranca en `desde` y llega **hasta hoy**, contando los días solo. Es la forma de
decir "de acá en adelante pasaron un montón de cosas más" sin explicarlas una
por una.

    cierre: {
      desde: "2026-03-18",
      titulo: "Y de ahí en adelante, todo",
      texto: "..."
    },

Cambiá `desde` por la fecha real en que quedó todo claro entre ustedes.
El punto de la línea de tiempo se dibuja como un anillo abierto en vez de
relleno, y el hilo se desvanece abajo, porque la historia sigue.

El texto que tiene ahora lo escribí yo. Cambialo por lo tuyo.

## Para verla

Doble click en `index.html`. Se abre en el navegador.

El contador arranca el 10 de marzo de 2026 y sube solo: si ella entra la semana
que viene, el número va a ser más grande. Los títulos también se actualizan
solos ("Cinco meses" → "Seis meses" → "Siete meses"), así que la página sigue
sirviendo el año que viene sin que la toques.
