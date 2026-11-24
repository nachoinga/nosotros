/* Service worker de "Nuestro 10 de marzo".

   Sirve para dos cosas: que la página se pueda instalar como app y recibir
   el aviso del día 10. A propósito NO tiene "fetch" ni caché: la página
   tiene que mostrarse siempre al día, nunca una copia vieja guardada. */
importScripts("aviso-texto.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/* Lo que la página dejó guardado (index.html la escribe en cada carga).
   Si algo falla devuelve null: el aviso se muestra igual, genérico. */
function leerDatos() {
  return new Promise((ok) => {
    try {
      const q = indexedDB.open("nosotros-aviso", 1);
      q.onupgradeneeded = () => q.result.createObjectStore("datos");
      q.onerror = () => ok(null);
      q.onsuccess = () => {
        try {
          const g = q.result.transaction("datos").objectStore("datos").get("config");
          g.onsuccess = () => { q.result.close(); ok(g.result || null); };
          g.onerror = () => ok(null);
        } catch (e) { ok(null); }
      };
    } catch (e) { ok(null); }
  });
}

/* El worker de Cloudflare manda un push vacío el día 10; el texto se arma
   acá. SIEMPRE se muestra algo: iPhone revoca el permiso si llega un push
   y no aparece ninguna notificación. */
self.addEventListener("push", (e) => {
  e.waitUntil(leerDatos().then((datos) => {
    const a = self.AvisoTexto.armarAviso(datos, new Date());
    return self.registration.showNotification(a.titulo, {
      body: a.cuerpo,
      icon: "iconos/icono-192.png",
      badge: "iconos/icono-192.png",
      tag: "aviso-del-10"
    });
  }));
});

/* al tocar un aviso se abre (o se trae al frente) la página */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
    for (const v of ventanas) if ("focus" in v) return v.focus();
    return self.clients.openWindow("./");
  }));
});
