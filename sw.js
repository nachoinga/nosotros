/* Service worker de "Nuestro 10 de marzo".

   Sirve para dos cosas: que la página se pueda instalar como app y recibir
   el aviso del día 10. A propósito NO tiene "fetch" ni caché: la página
   tiene que mostrarse siempre al día, nunca una copia vieja guardada. */
importScripts("aviso-texto.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/* al tocar un aviso se abre (o se trae al frente) la página */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
    for (const v of ventanas) if ("focus" in v) return v.focus();
    return self.clients.openWindow("./");
  }));
});
