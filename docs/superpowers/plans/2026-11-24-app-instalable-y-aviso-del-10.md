# App instalable + aviso del día 10 — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la página se instale como app y que el día 10 a las 10:00 (Argentina) llegue a Florencia y a Ignacio un aviso "+1 mes juntos".

**Architecture:** Un `sw.js` mínimo (sin caché) recibe un push **vacío** que manda el worker de Cloudflare con un cron; el service worker arma el texto leyendo de IndexedDB lo que la página guardó (inicio, quién es, textos del `CONFIG`). La firma VAPID (ES256) se hace con WebCrypto dentro del worker existente.

**Tech Stack:** HTML/CSS/JS sin dependencias (un solo `index.html` + `sw.js`), Cloudflare Worker + KV `MENSAJES` + cron, Node 18+ sólo para generar íconos/claves y para `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-24-app-instalable-y-aviso-del-10-design.md`

## Global Constraints

- Todo texto que Ignacio edite va en `CONFIG`, nunca hardcodeado más abajo. Textos de Ignacio: no se "mejoran".
- Rutas **relativas** (la página vive en `/nosotros/`).
- `sw.js` **sin `fetch` ni caché**: la página no puede quedar vieja.
- Hora: cron `0 13 10 * *` (13:00 UTC = 10:00 Argentina). Aviso para ella: título `💗 +1 mes juntos`, texto `Hoy cumplimos {n} meses. Te amo con mi corazoncito.`; para él: mismo título, `Hoy cumplimos {n} meses.`
- Contacto VAPID `sub`: `https://nachoinga.github.io/nosotros/` (nada de mails).
- `VAPID_PRIVADA` no entra jamás al repo ni a la página. La pega Ignacio; Claude no escribe claves en campos.
- Nunca romper: `figure,figcaption{margin:0}`, la clase `primavera` previa al primer dibujado, el techo de peso al comprimir, el "día N" por fecha de calendario, y el `data-theme` previo al primer dibujado.
- Tras tocar el `<script>` principal: `sed -n '/^(() => {$/,/^})();$/p' index.html > "$TEMP/m.js" && node --check "$TEMP/m.js"`.
- Probar local con `python -m http.server 8123 --bind 127.0.0.1`, midiendo el DOM con JS (no con capturas) y a 390×844. Los fetch al worker sólo andan desde `nachoinga.github.io`.
- Publicar = `git add … && git commit && git push`, y confirmar que el build de Pages es el commit correcto.

## Review Focus

- El aviso llega un día que no es 10 (retraso, prueba): muestra "Prueba del aviso del día 10", no un "Hoy cumplimos" falso.
- IndexedDB vacío o ilegible cuando llega el push (nunca abrió la app tras activar): igual se muestra un aviso genérico (iPhone revoca el permiso si no se muestra nada).
- Una suscripción vencida (404/410) no frena el envío a las demás y se borra de la lista.
- Suscribir un `endpoint` de un host no permitido, o el mismo dos veces: se rechaza / no se duplica; más de 20: se rechaza.
- Navegador sin `Notification`/`PushManager` o iPhone sin instalar: la tarjeta explica qué hacer y no tira error en consola.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `iconos/generar.mjs` | Dibuja los PNG del corazón sin dependencias (zlib de Node). Se corre una vez. |
| `iconos/*.png` | 192, 512, maskable 512, apple-touch 180. |
| `manifest.webmanifest` | Datos de la app instalable. |
| `aviso-texto.js` | Lógica pura `armarAviso`, usable en el service worker y en Node (UMD). |
| `sw.js` | Evento `push` y `notificationclick`. Sin `fetch`. |
| `worker/borrar.js` | Se le suman `POST /suscribir` y `scheduled`, con firma VAPID. |
| `worker/aviso.test.mjs` | Pruebas Node del worker (`node --test`). |
| `index.html` | `CONFIG.nube.app` y `CONFIG.nube.aviso`, etiquetas del `<head>`, tarjeta, registro del SW, activación. |

---

### Task 1: Íconos, manifiesto y etiquetas del `<head>`

**Files:**
- Create: `iconos/generar.mjs`, `iconos/icono-192.png`, `iconos/icono-512.png`, `iconos/icono-maskable-512.png`, `iconos/apple-touch-icon.png`, `manifest.webmanifest`
- Modify: `index.html:3-21` (`<head>`)

**Interfaces:**
- Produces: `manifest.webmanifest` servido en `./manifest.webmanifest`; íconos en `./iconos/…`.

- [ ] **Step 1: Escribir `iconos/generar.mjs`**: sin dependencias, escribe los 4 PNG con `node:zlib`. Corazón con la inecuación `(x²+y²−1)³ − x²y³ < 0` en color `#B02A5B` sobre `#FCE3EB`, con supersampling 3×3. El maskable deja el corazón dentro del 60 % central. Firma: `dibujar(lado:number, margen:number): Buffer` (PNG) y escribe los archivos al correrlo.
- [ ] **Step 2: Correr** `node iconos/generar.mjs`. Esperado: 4 archivos; verificar con `node -e` que cada PNG empieza con la firma `89 50 4E 47` y que el ancho (bytes 16–19) es 192/512/512/180.
- [ ] **Step 3: Crear `manifest.webmanifest`**: `name` "Nuestro 10 de marzo", `short_name` "Nosotros", `start_url` `./`, `scope` `./`, `display` `standalone`, `background_color` `#FFF7F9`, `theme_color` `#B02A5B`, `lang` `es`, los tres íconos (el maskable con `purpose: "maskable"`).
- [ ] **Step 4: En el `<head>` de `index.html`** agregar: `<link rel="manifest" href="manifest.webmanifest">`, `<meta name="theme-color" content="#B02A5B">`, `<link rel="apple-touch-icon" href="iconos/apple-touch-icon.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-title" content="Nosotros">`, `<meta name="apple-mobile-web-app-status-bar-style" content="default">`.
- [ ] **Step 5: Verificar** con el servidor local: `fetch("manifest.webmanifest")` parsea como JSON y cada `icons[i].src` responde 200 (medido por JS en la consola del panel).
- [ ] **Step 6: Commit**: `git add iconos manifest.webmanifest index.html && git commit -m "App instalable: íconos, manifiesto y etiquetas"`.

### Task 2: Lógica pura del texto del aviso

**Files:**
- Create: `aviso-texto.js`, `worker/aviso.test.mjs` (sólo la parte de texto en esta tarea)

**Interfaces:**
- Produces: `armarAviso(datos: DatosAviso|null, ahora: Date) -> {titulo:string, cuerpo:string}` donde `DatosAviso = {inicio:string, quien:string, nombres:{ella:string,yo:string}, textos:{ella:{titulo:string,texto:string}, yo:{titulo:string,texto:string}}}`; exporta además `mesesCumplidos(inicio:Date, ahora:Date) -> number`. Sale por `module.exports` si existe, y por `self.AvisoTexto = {armarAviso, mesesCumplidos}` en el service worker.

- [ ] **Step 1: Pruebas que fallan** (`node:test`, cargando `aviso-texto.js` con `createRequire`):
  - `mesesCumplidos(new Date("2026-03-10T00:00:00"), new Date("2026-12-10T10:00:00"))` es `9`; con `2026-11-10` es `8`; con `2027-03-10` es `12`.
  - `armarAviso(datos(quien "Florencia"), 2026-12-10 10:00)` devuelve título `💗 +1 mes juntos` y cuerpo `Hoy cumplimos 9 meses. Te amo con mi corazoncito.`; con `quien "Ignacio"` el cuerpo es `Hoy cumplimos 9 meses.`
  - Día distinto de 10 (`2026-12-11`): título `Prueba del aviso del día 10`.
  - `armarAviso(null, fecha)` devuelve un título y cuerpo no vacíos (genérico `💗 Hoy es 10`/texto corto), sin tirar error.
  - `quien` que no coincide con ninguno de `nombres`: usa el texto de `yo` (el más corto).
- [ ] **Step 2: Correr** `node --test worker/aviso.test.mjs` → FALLA (módulo inexistente).
- [ ] **Step 3: Implementar** `aviso-texto.js`. `mesesCumplidos` usa la misma regla que la página (`mesesEnteros` con `sumarMeses`, recortando al último día del mes). `{n}` se reemplaza por el número en el texto.
- [ ] **Step 4: Correr** el mismo comando → PASA.
- [ ] **Step 5: Commit**: `git commit -m "Texto del aviso: lógica pura con pruebas"`.

### Task 3: Service worker, tarjeta de instalación y publicar la parte A

**Files:**
- Create: `sw.js`
- Modify: `index.html` (`CONFIG.nube.app`; sección HTML `#app`; CSS; registro del SW y botón de instalar)

**Interfaces:**
- Consumes: `AvisoTexto.armarAviso` (Task 2), vía `importScripts("aviso-texto.js")`.
- Produces: `sw.js` registrado con `navigator.serviceWorker.register("sw.js")`; `CONFIG.nube.app = { titulo, texto, boton, ios, listo }`; elemento `<section id="app" hidden>` con `<div id="app-estado">`.

- [ ] **Step 1: Crear `sw.js`** con `importScripts("aviso-texto.js")`, un `install` que hace `skipWaiting()`, un `activate` que hace `clients.claim()`, **sin handler de `fetch`**, y por ahora un `notificationclick` que enfoca o abre `./`. El `push` se agrega en Task 6.
- [ ] **Step 2: `CONFIG.nube.app`** (textos de ejemplo, de Ignacio los edita): `titulo` "Llevala en el celu", `texto`, `boton` "Instalar", `ios` "En iPhone: tocá Compartir y después «Agregar a inicio»", `listo` "Ya la tenés instalada".
- [ ] **Step 3: HTML + CSS + JS** de la tarjeta, antes del `<footer>`: oculta si `matchMedia("(display-mode: standalone)").matches` o `navigator.standalone`. En Android guarda el evento `beforeinstallprompt` y muestra el botón "Instalar" que llama a `prompt()`; en iPhone (detectado con `/iphone|ipad/i` en `navigator.userAgent`) muestra el texto `ios`. Registra el SW si `"serviceWorker" in navigator`. Estética de la página (variables `--rosa-*`, que ya cubre claro/oscuro/primavera).
- [ ] **Step 4: Verificar** local, a 390×844 y en escritorio: el SW queda `activated` (`navigator.serviceWorker.getRegistration()` por JS), `scrollWidth <= clientWidth`, y en la consola no hay errores salvo los CORS del worker. Chequear sintaxis del script.
- [ ] **Step 5: Publicar**: `git add sw.js aviso-texto.js index.html docs && git commit -m "App instalable: service worker y tarjeta de instalación" && git push`; confirmar `gh api repos/nachoinga/nosotros/pages/builds/latest --jq '.status + " " + .commit'` contra `git rev-parse HEAD` (y que `4d0278e`, el botón claro/oscuro, ya está construido).
- [ ] **Step 6: Pedirle a Ignacio** que la instale en los dos teléfonos (iPhone: Compartir ▸ Agregar a inicio) y que confirme que abre sin la barra del navegador.

### Task 4: Worker — suscripciones, firma VAPID y envío programado

**Files:**
- Modify: `worker/borrar.js`
- Modify: `worker/aviso.test.mjs`
- Create (no versionar): claves en el *scratchpad*

**Interfaces:**
- Produces (exportados por nombre además del `default`, para probar): `hostPermitido(endpoint:string): boolean`; `firmarVapid(endpoint:string, privadaJwk:object, publicaB64:string, ahoraSeg:number): Promise<string>` → valor del encabezado `Authorization`; `guardarSuscripcion(entorno, pedido): Promise<Response>`; `enviarAvisos(entorno, fetchFn?): Promise<{enviados:number, borrados:number}>`. El `default` suma `scheduled(evento, entorno, ctx)` que llama a `enviarAvisos`.
- Consumes: KV `MENSAJES`, clave `avisos` (lista JSON de `{endpoint, keys, de}`); secreto `VAPID_PRIVADA` (JWK en JSON) y variable `VAPID_PUBLICA` (base64url de 65 bytes).

- [ ] **Step 1: Generar claves** con un script de una línea de Node (`crypto.subtle.generateKey` ECDSA P-256): pública en base64url de 65 bytes (`exportKey("raw")`), privada como JWK. Guardarlas **sólo en el scratchpad**; mostrar a Ignacio la pública y entregarle la privada para que la pegue.
- [ ] **Step 2: Pruebas que fallan**:
  - `hostPermitido("https://web.push.apple.com/x")`, `fcm.googleapis.com`, `updates.push.services.mozilla.com` y `*.notify.windows.com` son `true`; `http://…`, `https://evil.com/` y un host que sólo *termina* parecido (`web.push.apple.com.evil.com`) son `false`.
  - `firmarVapid` devuelve `vapid t=<jwt>, k=<publica>`; el JWT tiene 3 partes, `alg` `ES256`, `aud` igual al origen del `endpoint`, `exp` ≤ ahora+12 h, `sub` `https://nachoinga.github.io/nosotros/`, y la firma **verifica** con la clave pública (`crypto.subtle.verify`).
  - `guardarSuscripcion`: dos POST con el mismo `endpoint` dejan 1 elemento; un host no permitido da 400; la suscripción 21 da 409.
  - `enviarAvisos` con un `fetchFn` simulado que responde 201, 410 y 201: envía a las tres, **borra sólo la del 410** de la lista y no corta el envío; cada pedido es `POST`, sin cuerpo, con `TTL` y `Authorization`.
- [ ] **Step 3: Correr** `node --test worker/aviso.test.mjs` → FALLA.
- [ ] **Step 4: Implementar** en `worker/borrar.js` lo descrito. Enrutar `POST /suscribir` antes del candado del borrado; los CORS existentes ya sirven. `scheduled` va en el mismo objeto `default`. Encabezado `Urgency: high`, `TTL: 3600`.
- [ ] **Step 5: Correr** el test → PASA; y `node --check worker/borrar.js` (se renombra la copia a `.mjs` temporal si hace falta).
- [ ] **Step 6: Commit**: `git commit -m "Worker: suscripciones y envío del aviso del día 10"`. **Ojo:** esto todavía no despliega nada.

### Task 5: Página — activar el aviso y guardar los datos para el celular

**Files:**
- Modify: `index.html` (`CONFIG.nube.aviso`; tarjeta `#app`; script)

**Interfaces:**
- Consumes: `POST {borrarUrl}/suscribir` (Task 4); `CONFIG.nombres`, `CONFIG.nube.quienes`, `CONFIG.inicio`.
- Produces: IndexedDB `nosotros-aviso`, almacén `datos`, clave `config` = `DatosAviso` (el de Task 2); `CONFIG.nube.aviso = { clavePublica, boton, quien, listo, noSoportado, ella:{titulo,texto}, yo:{titulo,texto} }`.

- [ ] **Step 1: `CONFIG.nube.aviso`** con la clave pública de Task 4 y los textos de las Global Constraints (`{n}` como marcador).
- [ ] **Step 2: Función `guardarDatosAviso(): Promise<void>`** que escribe `DatosAviso` en IndexedDB; se llama **en cada carga** si `Notification.permission === "granted"`.
- [ ] **Step 3: Flujo del botón "Activar el aviso del día 10"** dentro de `#app-estado`: pide quién es con los botones de `nube.quienes`, `Notification.requestPermission()` desde el toque, `registration.pushManager.subscribe({userVisibleOnly:true, applicationServerKey})`, `POST /suscribir` con `{de, sub}`, guarda `localStorage["aviso-activado"]="1"`, llama a `guardarDatosAviso()`, muestra `listo`. Visible sólo si está soportado y (corre como app o no es iPhone); si no, muestra `noSoportado` o la instrucción de instalar. Si el permiso es `denied`, lo dice sin error.
- [ ] **Step 4: Verificar local**: sin `Notification` (simulado borrando `window.Notification`) la tarjeta no tira error; con permiso otorgado, `guardarDatosAviso()` deja el objeto leíble en IndexedDB (leído por JS). Sintaxis OK, 390×844 sin desborde, claro y oscuro.
- [ ] **Step 5: Commit**: `git commit -m "Página: activar el aviso del día 10"`.

### Task 6: El service worker recibe el aviso

**Files:**
- Modify: `sw.js`

**Interfaces:**
- Consumes: IndexedDB `nosotros-aviso`/`datos`/`config` (Task 5), `AvisoTexto.armarAviso` (Task 2).

- [ ] **Step 1: Evento `push`**: `event.waitUntil` de leer `config` (si falla, `null`), llamar `armarAviso(datos, new Date())` y `self.registration.showNotification(titulo, {body: cuerpo, icon: "iconos/icono-192.png", badge: "iconos/icono-192.png", tag: "aviso-del-10"})`. **Siempre** muestra algo.
- [ ] **Step 2: Verificar** el `push` simulando el evento en un contexto Node mínimo (stub de `self`, `indexedDB` ausente → debe caer a `null` y mostrar el genérico) o, si el panel lo permite, con las herramientas de desarrollador. Resultado esperado: se llama `showNotification` exactamente una vez.
- [ ] **Step 3: Commit y publicar** (`push` + confirmar el build, como en Task 3).

### Task 7: Cloudflare con Ignacio logueado

**Files:** ninguno del repo (se toca el panel de Cloudflare).

- [ ] **Step 1:** Abrir `dash.cloudflare.com` en el navegador del panel; Ignacio inicia sesión (usuario, contraseña y verificación son suyos).
- [ ] **Step 2:** Con el visto bueno de Ignacio en cada paso: abrir el worker `tight-water-2041` ▸ Edit code ▸ pegar el contenido de `worker/borrar.js` ▸ Deploy.
- [ ] **Step 3:** Settings ▸ Variables: agregar `VAPID_PUBLICA` (texto). Ignacio pega él mismo `VAPID_PRIVADA` como **Secret**. Re-desplegar.
- [ ] **Step 4:** Settings ▸ Triggers ▸ Cron: `0 13 10 * *`.
- [ ] **Step 5: Probar**: Ignacio activa el aviso en los dos teléfonos (ya con la app instalada). Cambiar el cron a unos minutos adelante (UTC), esperar el aviso en ambos teléfonos (debe decir "Prueba del aviso del día 10") y **devolver el cron a `0 13 10 * *`**; confirmarlo mirando el panel.

### Task 8: Documentación

**Files:** Modify `CLAUDE.md`, `PARA-VOS.md`, `worker/LEEME.md`.

- [ ] **Step 1:** `CLAUDE.md`: nuevas filas en "Qué es cada archivo" (`sw.js`, `aviso-texto.js`, `manifest.webmanifest`, `iconos/`, `worker/aviso.test.mjs`), nueva pieza "App y aviso del 10", el cambio a la regla de un solo archivo, el aviso de que `worker/borrar.js` ahora también tiene el cron, y lo que hay que reactivar si cambia la clave pública.
- [ ] **Step 2:** `PARA-VOS.md`: cómo instalarla, cómo activar el aviso, dónde se editan los textos y qué hacer si no llega.
- [ ] **Step 3:** `worker/LEEME.md`: el cron, `VAPID_PUBLICA`/`VAPID_PRIVADA` y cómo probar moviendo el cron.
- [ ] **Step 4:** Commit y push; confirmar el build.

## Autorevisión

- **Cobertura del diseño:** Parte A → Tasks 1 y 3; Parte B página → 5; worker → 4; service worker → 6; Cloudflare y prueba real → 7; documentación → 8; texto y regla del día → 2.
- **Consistencia de nombres:** `armarAviso`, `mesesCumplidos`, `DatosAviso`, `guardarDatosAviso`, `hostPermitido`, `firmarVapid`, `guardarSuscripcion`, `enviarAvisos` se usan igual en todas las tareas.
- **Proporción:** el plan es más corto que el código que describe; los cuerpos de funciones no están escritos.
