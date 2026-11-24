# App instalable + aviso del día 10 — diseño

Fecha: 2026-11-24. Estado: **borrador a la espera de aprobación**.
Cubre las ideas 8 y 9 de la lista. La 7 (mapa de lugares) va aparte, en su
propio diseño, después de estas dos.

## Para qué

Ignacio quiere que el día 10 de cada mes, a las 10 de la mañana, a Florencia
le llegue al teléfono una notificación tipo "+1 mes juntos… te amo con mi
corazoncito". Que se sienta como un regalo mensual, sin que ella tenga que
abrir nada. Que le llegue también a él, más simple, sólo el "+1 mes juntos".
Para que eso pase, la página tiene que poder instalarse como app (en iPhone es
condición para recibir avisos).

## Objetivos

- La página se instala en la pantalla de inicio del iPhone y del Android, con
  su ícono, y abre sin la barra del navegador.
- El día 10 a las 10:00 (Argentina) llega un aviso a cada teléfono que lo
  activó. El número de meses se calcula solo.
- Todo el texto editable sigue en el `CONFIG`. Para cambiar un texto del
  aviso no hay que tocar Cloudflare ni volver a desplegar nada.
- Activarlo es un toque guiado, hecho una sola vez por teléfono.

## Fuera de alcance

- Que la página funcione sin internet. No se cachea nada: la página sigue
  siempre al día.
- Más avisos que el del día 10 (nada de recordatorios, ni por mensaje nuevo).
- El mapa de lugares (idea 7).

## Lo que sería un fracaso aunque "ande"

- Que una página vieja se quede guardada y no se vean los cambios.
- Que se rompa algo de lo que ya anda: portada con música, gestos, mensajes,
  álbum, modo primavera, botón claro/oscuro.
- Que la clave privada de los avisos quede en el repo o en la página.
- Que un aviso llegue con el número de meses mal.

## Restricciones

- Hosting: GitHub Pages en `https://nachoinga.github.io/nosotros/`
  (subcarpeta, así que todo con rutas relativas).
- iPhone: avisos sólo en iOS 16.4 o más nuevo, con la app instalada y el
  permiso pedido desde un toque dentro de ella.
- Cloudflare gratis: disparo programado (cron) y KV permitidos.
- El worker no se despliega con un push: Ignacio (o Claude con él mirando) lo
  pega en Cloudflare.
- `index.html` deja de ser el único archivo del sitio: aparecen `sw.js`,
  `manifest.webmanifest` e `iconos/`. Es la única excepción a la regla de
  archivo único; el contenido sigue yendo al `CONFIG`.

## Enfoques considerados

El tema es cómo viaja el texto del aviso.

1. **Aviso vacío; el teléfono arma el mensaje (elegido).** El worker sólo
   despierta al service worker; éste calcula los meses y escribe el texto.
   Lo más simple y lo más difícil de romper (no hay cifrado del contenido en
   el worker).
2. Texto cifrado desde el worker. Los textos viven en Cloudflare, cambiarlos
   exige volver a pegar el worker, y suma código criptográfico delicado.
3. El worker lee un `aviso.json` publicado en la página. Cambiar el texto
   sería sólo un push, pero es lo más pesado de construir.

Ignacio le dejó la decisión técnica a Claude; la 1 fue la elección de Claude.

## Diseño

### Parte A — App instalable

- `manifest.webmanifest`: nombre "Nuestro 10 de marzo", nombre corto
  "Nosotros", `display: standalone`, `start_url` y `scope` relativos (`./`),
  colores del tema rosa, íconos 192 y 512 (más versión maskable).
- `iconos/`: PNG con el corazón de la página sobre fondo rosa (192, 512,
  maskable y el `apple-touch-icon` de 180). Se generan una vez con un script
  y se versionan.
- En `<head>`: `rel="manifest"`, `theme-color`, y las etiquetas
  `apple-mobile-web-app-*` para iPhone.
- `sw.js` mínimo: sólo escucha avisos. **Sin `fetch` ni caché.**
- Tarjeta en la página, "Llevarla en el celular": en Android un botón que usa
  el cuadro de instalación del navegador; en iPhone las instrucciones
  ("Compartir ▸ Agregar a inicio"). Desaparece si ya corre como app.
  Textos en `CONFIG.nube.app`.

### Parte B — Aviso del día 10

**En la página**
- Dentro de la app instalada aparece "Activar el aviso del día 10". Pide
  quién es (la lista `CONFIG.nube.quienes`), pide el permiso de avisos y
  crea la suscripción con la clave pública (`CONFIG.nube.aviso.clavePublica`).
- La manda al worker (`POST /suscribir` con el nombre y la suscripción).
- Guarda en IndexedDB lo que el service worker va a necesitar: `inicio`,
  quién es y los textos de `CONFIG.nube.aviso`. **Se vuelve a guardar cada
  vez que la app abre**, así un cambio de texto llega con sólo abrirla.

**En el worker (`worker/borrar.js`)**
- `POST /suscribir`: guarda en el KV `MENSAJES`, clave `avisos`, la lista de
  suscripciones (sin duplicar por `endpoint`). Límite chico (20). Sólo acepta
  `endpoint` https de servicios de avisos conocidos (Apple, Google, Mozilla,
  Microsoft).
- `scheduled`: cron `0 13 10 * *` (13:00 UTC = 10:00 en Argentina, sin horario
  de verano). Manda a cada suscripción un aviso **sin contenido**, firmado
  con la clave privada (VAPID, ES256 con WebCrypto). Borra las que respondan
  404 o 410.
- El campo de contacto de la firma usa la URL de la página, no un mail.
- Secreto nuevo: `VAPID_PRIVADA`. Las claves las genera Claude; el secreto lo
  pega Ignacio (Claude no escribe claves en campos).

**En `sw.js`**
- Al recibir el aviso lee de IndexedDB lo guardado. Si hoy es día 10, muestra
  "+1 mes juntos" y el texto de esa persona con `{n}` reemplazado por los
  meses cumplidos. Si hoy **no** es día 10, muestra "Prueba del aviso del
  día 10", para poder probar sin confundir.
- Siempre muestra algo: iPhone revoca el permiso si llega un aviso que no se
  muestra.
- Al tocarlo abre la página.

**Textos (primera versión, en `CONFIG.nube.aviso`)**
- Ella: "💗 +1 mes juntos" / "Hoy cumplimos {n} meses. Te amo con mi corazoncito."
- Él: "💗 +1 mes juntos" / "Hoy cumplimos {n} meses."

## Orden de trabajo

1. Parte A, probada local y publicada. Instalarla en los dos teléfonos.
2. Parte B: claves, worker, página, service worker; probar local lo que se
   pueda (los fetch al worker sólo andan desde `nachoinga.github.io`).
3. Cloudflare, con Ignacio logueado en el navegador del panel: pegar el
   worker, agregar el cron y el secreto. Prueba real: poner el cron unos
   minutos adelante, ver llegar el aviso a los dos teléfonos y devolverlo a
   `0 13 10 * *`.
4. Documentación: `CLAUDE.md`, `PARA-VOS.md`, `worker/LEEME.md`.

## Decisiones que tomó Claude al revisar el diseño (para que Ignacio las vea)

- El texto de cada persona se elige comparando el nombre con
  `CONFIG.nombres`: `aviso.ella` para Florencia, `aviso.yo` para Ignacio.
- Los textos del aviso viven en el `CONFIG` y viajan al celular por
  IndexedDB (cambio respecto de lo hablado, que decía "en `sw.js`"): así la
  fecha de inicio y los textos tienen un solo dueño.
- Android con Chrome puede recibir avisos sin instalar la app; la tarjeta
  igual propone instalarla.
- Prueba del aviso: mover el cron unos minutos adelante en Cloudflare, en vez
  de agregar una dirección de prueba que cualquiera podría usar para mandar
  avisos.

## Qué queda a criterio de quien construye

- Dibujo exacto del ícono (corazón sobre rosa).
- Redacción de las instrucciones de instalación en iPhone.
- Cómo se ve la tarjeta de activación, dentro de la estética de la página.
- Detalles de la firma VAPID y de los reintentos al enviar.

## Riesgos conocidos

- Los teléfonos pueden demorar un aviso unos minutos; no hay garantía de hora
  exacta.
- Si ella no instala la app o no acepta el permiso, no hay aviso. No hay
  alternativa en iPhone.
- Si se cambia la clave pública del `CONFIG`, hay que reactivar el aviso en
  cada teléfono.
