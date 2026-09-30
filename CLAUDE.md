# Nuestro 10 de marzo

Página de aniversario que Ignacio le hizo a Florencia. **Está terminada y en
producción.** Lo que viene de acá en adelante son retoques.

- **En vivo:** https://nachoinga.github.io/nosotros/
- **Repo:** `nachoinga/nosotros` (público, rama `main`, Pages desde la raíz)
- **Publicar:** `git add -A && git commit -m "..." && git push`. GitHub Pages
  tarda entre 1 y 7 minutos en reflejarlo. Verificar con
  `gh api repos/nachoinga/nosotros/pages/builds/latest --jq '.status + " " + .commit'`
  y comparar el commit, no sólo el estado.

## Cómo hablarle a Ignacio

Español rioplatense, con voseo. Los textos de la página son de él: no
"mejorarle" la redacción ni corregirle la ortografía salvo que lo pida. Si
algo que escribió tiene un error que se va a ver (una fecha mal, una palabra
cortada), avisarle en una línea y dejar que decida.

## La regla que ordena todo el archivo

`index.html` es **un solo archivo autocontenido**, ~2.300 líneas. Todo el
contenido vive en el objeto `CONFIG` de arriba de todo, con comentarios en
español. **Nada de contenido hardcodeado más abajo.** Si hay que agregar algo
que él vaya a editar, va al `CONFIG`.

El archivo tiene dos marcas, `<!--ARTIFACT-INICIO-->` y `<!--ARTIFACT-FIN-->`,
de cuando se publicaba como Artifact. Ya no se usa: el canal es GitHub Pages.

## Las piezas

| Sección | Qué hace |
|---|---|
| Portada | Tapa con una frase y el play. Al tocar entra Y arranca la música: ese toque es el gesto que el navegador exige para dejar sonar audio. |
| Contador | Segundos/minutos/horas/días/semanas/meses/años desde el 10/03/2026, con dígitos de ancho fijo. Meses y años por calendario real, no promedio. |
| Cinta métrica | Una marca por cada día 10. Se alarga sola dejando 2 meses de aire por delante; la aguja se mueve en vivo (~1 px cada 9 h). |
| Próximo diez | Cuenta regresiva al siguiente mes cumplido. |
| Historia | Línea de tiempo + "cosas sueltas" de una línea + un tramo abierto sin fecha de fin que cuenta días solo. Cada hito muestra qué día de lo nuestro fue. |
| Cosas tuyas, Momentos, Planes | Las 6 polaroids son los destacados. Los planes se tildan y se guardan en el teléfono de quien mira. |
| El álbum | Sección aparte, se abre a pantalla completa. Todas las fotos en miniatura, con subida y borrado. |
| El cierre | Bloque final en rosa fuerte, con los días contados en vivo. |

Todos los títulos y números se recalculan solos: la página no caduca.

## Modos

`CONFIG.primavera` decide cómo **arranca** cada día: `"auto"` (primavera sólo
el 21 de septiembre), `true` o `false`. El botón de la barra alterna en vivo
—colores, flores, sección, y hasta la canción— y lo que elija se guarda en
`localStorage` **sólo por ese día**.

En primavera suena `primaveraMusica` (Flores Amarillas) en vez de `musica`
(Puesto), con su propia frase de portada. Todo cuelga de la clase `primavera`
en `<html>`, que se pone **antes del primer dibujado** para que no parpadee.

## Las fotos (Cloudinary)

GitHub Pages sólo sirve archivos, no puede recibirlos. Por eso las fotos del
álbum van a Cloudinary: `cloudName: umxsjun3`, preset `nosotros` sin firma,
etiqueta `nosotros`. Se listan por `res.cloudinary.com/.../image/list/<tag>.json`
(404 = todavía no hay ninguna, no es un error).

Antes de subir, el navegador la achica a 1400 px y la recomprime con **techo
duro de peso**: si se pasa de 450 KB baja la calidad de a 0.1 hasta 0.5, y
recién después achica más. Así no importa qué celular la sacó. La grilla pide
miniaturas de 400×400; la grande sólo al abrir el visor.

**Borrar no se puede sin la clave secreta, y esa clave no puede ir en la
página porque es pública.** La crucecita aparece sólo si hay con qué: el token
de 10 minutos que devuelve la subida (hay que tildar "Return delete token" en
el preset) o un ayudante propio en `CONFIG.nube.borrarUrl`.

## Respaldo

`respaldo.ps1` baja a `respaldo/` las fotos que falten, leyendo el `cloudName`
del propio `index.html`. Corre solo todos los días a las 21:00 por el
Programador de tareas de Windows (tarea "Respaldo fotos nosotros"). Las
carpetas `respaldo/` y `fotos-originales/` están en `.gitignore`.

## Trampas que ya costaron caro

- **`<figure>` trae 40 px de margen lateral del navegador.** Las polaroids
  salían a 92 px en el celular sin que se notara. Está reseteado; no borrar
  `figure,figcaption{margin:0}`.
- **Al recomprimir hay que aplicar la rotación EXIF** o las fotos verticales
  quedan de costado.
- **El iPhone ignora `audio.volume` por software.** El código lo detecta y
  saltea el fundido en vez de quedar mudo.
- **El "día N" se calcula comparando fechas de calendario**, no restando
  horas: si no, el primer día da 2.
- **Las capturas del panel del navegador mienten** (llegan a destiempo o
  recortadas). Para verificar, medir el DOM con JavaScript, no mirar la foto.
- Después de tocar el `<script>` principal, comprobar la sintaxis:
  `sed -n '/^(() => {$/,/^})();$/p' index.html > /tmp/m.js && node --check /tmp/m.js`

## Cómo hacer un cambio sin romper nada

Seguir los seis pasos en orden. El 3 y el 6 son los que más veces salvaron
la página.

1. **Ubicar dónde va.** Si es texto, una foto, una fecha o una canción, va en
   el `CONFIG`. Sólo bajar al CSS o al JavaScript si el cambio es de
   comportamiento o de aspecto, no de contenido.

2. **Editar.** El archivo es grande: preferir ediciones puntuales sobre
   anclas únicas antes que reescribir bloques enteros.

3. **Comprobar la sintaxis del JavaScript.** Un paréntesis de más deja la
   página en blanco sin ningún error visible:
   ```bash
   sed -n '/^(() => {$/,/^})();$/p' index.html > /tmp/m.js && node --check /tmp/m.js
   ```

4. **Probarlo local**, nunca directo en producción:
   ```bash
   python -m http.server 8123 --bind 127.0.0.1
   ```
   Abrir `http://127.0.0.1:8123/index.html`. **Verificar midiendo el DOM con
   JavaScript, no mirando capturas** (ver "trampas"). Cosas útiles de medir:
   `document.documentElement.scrollWidth > clientWidth` (desborde lateral),
   anchos reales de los elementos que se tocaron, y que no haya errores en la
   consola.

5. **Probar a 390×844** si se tocó cualquier cosa visual: es el tamaño del
   iPhone 13, que es donde la mira ella.

6. **Publicar y confirmar que llegó.** El push no alcanza: hay que ver que el
   build terminó *y que es el commit correcto*:
   ```bash
   git add -A && git commit -m "..." && git push
   gh api repos/nachoinga/nosotros/pages/builds/latest --jq '.status + " " + .commit'
   ```
   Comparar contra `git rev-parse HEAD`. Puede tardar hasta 7 minutos.

**Nunca romper:** `figure,figcaption{margin:0}` del reset; la clase
`primavera` que se pone antes del primer dibujado; el techo de peso al
comprimir; el cálculo de "día N" por fecha de calendario.

## Si se empieza en otra máquina

El proyecto no depende de ninguna cuenta de Claude: vive en este repo, en
GitHub Pages y en Cloudinary. Clonando alcanza, salvo dos cosas que están en
`.gitignore` a propósito y son locales:

```powershell
git clone https://github.com/nachoinga/nosotros.git
# volver a programar el respaldo diario:
$a = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"<RUTA>\respaldo.ps1`""
$t = New-ScheduledTaskTrigger -Daily -At 9pm
$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Respaldo fotos nosotros" -Action $a -Trigger $t -Settings $s -Force
```

`fotos-originales/` (los originales sin comprimir) y `respaldo/` (las fotos
bajadas de la nube) no están en el repo. Si importan, copiarlas a mano.

## Pendientes

- [ ] Borrar de Cloudinary ~107 imágenes de prueba: etiquetas
      `prueba-limite`, `prueba-respaldo`, `prueba-borrado`, `prueba-album`.
      (Media Library → buscar `tag:...` → seleccionar todo → borrar.)
      No se ven en el álbum, usan etiquetas distintas a `nosotros`.
- [ ] Tildar "Return delete token" en el preset, para poder deshacer subidas.
- [ ] Opcional: Worker de Cloudflare para borrar cualquier foto cuando sea.
- [ ] Hay un typo suyo en la historia: "Mi cupleaños y tu regalo".
      Preguntarle antes de tocarlo.
