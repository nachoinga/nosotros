# El ayudante para borrar fotos

Cloudinary no deja borrar sin la clave secreta, y esa clave no puede estar en
`index.html` porque la página es pública. Este archivo se sube a Cloudflare,
donde la clave queda guardada fuera del alcance de cualquiera.

Es gratis: el plan gratuito de Cloudflare da 100.000 pedidos por día.

## Pasos (una sola vez, ~10 minutos)

1. Creá una cuenta en **dash.cloudflare.com** (gratis).
2. Andá a **Workers & Pages → Create → Start with Hello World → Deploy**.
   Ponele de nombre `borrar-fotos`.
3. Entrá al worker → **Edit code**. Borrá todo lo que hay y pegá el contenido
   de `borrar.js`. Guardá y desplegá (**Deploy**).
4. En el worker, **Settings → Variables and Secrets → Add**, creá dos
   **secretos** (tipo Secret, no Text):
   - `API_KEY`    → tu API Key de Cloudinary
   - `API_SECRET` → tu API Secret de Cloudinary
   Los dos salen de cloudinary.com → Settings → API Keys.
   Desplegá de nuevo para que tome los secretos.
5. Copiá la dirección del worker. Va a ser algo como
   `https://borrar-fotos.TU-USUARIO.workers.dev`
6. Pegala en `index.html`, en `CONFIG.nube.borrarUrl`, y hacé push.

Listo: la crucecita aparece en todas las fotos del álbum.

## Qué NO puede hacer este ayudante

- Sólo borra fotos que estén en el álbum (etiqueta `nosotros`). Cualquier otro
  `public_id` lo rechaza con un 403.
- Sólo acepta pedidos que vengan de `https://nachoinga.github.io`.
- No puede subir, ni modificar, ni listar nada. Sólo borrar, y sólo del álbum.

Aun así, quien conozca la dirección de la página podría borrar una foto. Por
eso existe el respaldo diario en `respaldo/`: si pasa algo, están en tu disco.

---

## Para que ella pueda escribir mensajes

Hace falta darle un lugar donde guardarlos. Es gratis y son 4 clics.

1. En Cloudflare: **Storage & Databases → KV → Create**. Ponele de nombre
   `mensajes-nosotros`.
2. Volvé a tu worker → **Settings → Bindings → Add → KV namespace**:
   - Variable name: `MENSAJES`   (así, en mayúsculas)
   - KV namespace: `mensajes-nosotros`
3. Pegá de nuevo el contenido actualizado de `borrar.js` y **Deploy**.

Listo. La sección "Escribime algo" aparece sola en la página.

Si el KV no está, el worker responde 501 y la página simplemente no muestra
la sección: no se rompe nada.

Guarda los últimos 300 mensajes, de hasta 600 caracteres cada uno.

---

## Para el aviso del día 10

El worker también manda el aviso "+1 mes juntos" a los teléfonos que lo activaron.
Necesita tres cosas, todas en el worker (Settings):

1. **Variable `VAPID_PUBLICA`** (texto): la misma clave que está en
   `CONFIG.nube.aviso.clavePublica` de `index.html`.
2. **Secreto `VAPID_PRIVADA`**: la clave privada. **No está en ningún archivo del
   repo.** Si se pierde, se generan dos claves nuevas, se cambian las dos del
   worker y la pública del `index.html`, y hay que reactivar el aviso en cada
   teléfono.
3. **Cron:** Settings ▸ Trigger events ▸ Cron triggers ▸ `0 13 10 * *`. Son las
   13:00 UTC del día 10, es decir **las 10:00 de Argentina** (no hay horario de
   verano). Cloudflare muestra "At 01:00 PM, on day 10 of the month".

El KV `MENSAJES` guarda la clave `avisos` con los teléfonos anotados (máximo 20).
Los que ya no existen se borran solos la próxima vez que se manda.

### Cómo probarlo

1. Con el aviso activado en un celular, cambiar el cron a una hora puntual de hoy
   (ej. `58 13 * * *`), **con al menos 15 minutos de margen**: Cloudflare tarda en
   tomar el cambio. Un cambio guardado con 3 minutos de anticipación no salió.
2. A esa hora tiene que llegar "Prueba del aviso del día 10" (hoy no es 10, por
   eso dice "prueba" y no "Hoy cumplimos…").
3. **Devolver el cron a `0 13 10 * *`.** Si no, la prueba se repite todos los días.

### Pruebas automáticas

`node --test worker/aviso.test.mjs` (Node 22 o más nuevo) prueba el texto del
aviso, la firma, las suscripciones, el envío y el evento `push` del service worker.
