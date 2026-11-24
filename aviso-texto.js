/* Arma el texto del aviso del día 10.
   Es lógica pura: la usa el service worker (sw.js) y también las pruebas
   de Node (worker/aviso.test.mjs). No toca el DOM ni la red.

   La cuenta de meses repite la de index.html (sumarMeses / mesesEnteros);
   si se cambia una, hay que cambiar la otra. */
(function (raiz) {
  "use strict";

  /* suma n meses sin pasarse del último día del mes (31 de enero + 1 = 28/29 de febrero) */
  function sumarMeses(d, n) {
    var r = new Date(d.getFullYear(), d.getMonth(), 1,
      d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    r.setMonth(r.getMonth() + n);
    var ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(d.getDate(), ultimo));
    return r;
  }

  /* meses enteros que pasaron entre dos fechas, por calendario */
  function mesesCumplidos(inicio, ahora) {
    var m = (ahora.getFullYear() - inicio.getFullYear()) * 12 +
            (ahora.getMonth() - inicio.getMonth());
    if (sumarMeses(inicio, m) > ahora) m--;
    return Math.max(0, m);
  }

  /* datos: lo que la página guardó en IndexedDB (o null si no hay nada).
     Devuelve siempre un título y un cuerpo: iPhone revoca el permiso si
     llega un aviso y no se muestra nada. */
  function armarAviso(datos, ahora) {
    if (!datos || !datos.textos || !datos.inicio) {
      return { titulo: "💗 Hoy es día 10", cuerpo: "Feliz día 10." };
    }
    if (ahora.getDate() !== 10) {
      return {
        titulo: "Prueba del aviso del día 10",
        cuerpo: "Si ves esto, el aviso funciona. El de verdad llega el día 10."
      };
    }
    var n = mesesCumplidos(new Date(datos.inicio), ahora);
    var esElla = datos.nombres && datos.quien === datos.nombres.ella;
    var t = (esElla ? datos.textos.ella : datos.textos.yo) || {};
    return {
      titulo: String(t.titulo || "💗 +1 mes juntos"),
      cuerpo: String(t.texto || "Hoy cumplimos {n} meses.").replace("{n}", n)
    };
  }

  var api = { armarAviso: armarAviso, mesesCumplidos: mesesCumplidos };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.AvisoTexto = api;
})(typeof self !== "undefined" ? self : this);
