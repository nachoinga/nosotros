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
