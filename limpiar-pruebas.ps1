# Borra de Cloudinary las imagenes que quedaron de las pruebas.
#
# COMO USARLO (la clave nunca sale de tu maquina, no se la pasas a nadie):
#
#   1. Entra a cloudinary.com > Settings > API Keys
#   2. Copia tu API Key y tu API Secret
#   3. En PowerShell, en esta carpeta:
#
#        $env:CLOUDINARY_API_KEY    = "tu-api-key"
#        $env:CLOUDINARY_API_SECRET = "tu-api-secret"
#        .\limpiar-pruebas.ps1
#
#   4. Cerra esa ventana de PowerShell cuando termines y las variables
#      desaparecen solas.

$ErrorActionPreference = "Stop"

# Solo estas. Por seguridad el script se niega a tocar cualquier otra,
# para que no exista forma de que borre las fotos del album por error.
$ETIQUETAS = @("prueba-limite", "prueba-respaldo", "prueba-borrado", "prueba-album")
$INTOCABLE = "nosotros"

$base  = $PSScriptRoot
$html  = Get-Content (Join-Path $base "index.html") -Raw -Encoding UTF8
$cloud = [regex]::Match($html, 'cloudName:\s*"([^"]*)"').Groups[1].Value
if (-not $cloud) { Write-Host "No encontre el cloudName en index.html."; exit 1 }

$key    = $env:CLOUDINARY_API_KEY
$secret = $env:CLOUDINARY_API_SECRET
if (-not $key -or -not $secret) {
  Write-Host ""
  Write-Host "Faltan las credenciales. Antes de correr el script:" -ForegroundColor Yellow
  Write-Host '  $env:CLOUDINARY_API_KEY    = "tu-api-key"'
  Write-Host '  $env:CLOUDINARY_API_SECRET = "tu-api-secret"'
  Write-Host ""
  Write-Host "Las sacas de cloudinary.com > Settings > API Keys."
  exit 1
}

$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${key}:${secret}"))
$cab  = @{ Authorization = "Basic $auth" }
$api  = "https://api.cloudinary.com/v1_1/$cloud"

function Contar($tag) {
  try {
    $r = Invoke-RestMethod -Uri "$api/resources/image/tags/$tag`?max_results=500" -Headers $cab -TimeoutSec 60
    return @($r.resources).Count
  } catch { return -1 }
}

Write-Host ""
Write-Host "Nube: $cloud" -ForegroundColor Cyan
Write-Host "Revisando que hay..." -ForegroundColor Cyan
Write-Host ""

$total = 0
$hay = @{}
foreach ($t in $ETIQUETAS) {
  $n = Contar $t
  $hay[$t] = $n
  if ($n -lt 0) {
    Write-Host ("  {0,-18} no se pudo consultar (revisa las credenciales)" -f $t) -ForegroundColor Red
  } else {
    Write-Host ("  {0,-18} {1} imagenes" -f $t, $n)
    $total += $n
  }
}

$album = Contar $INTOCABLE
Write-Host ""
Write-Host ("  {0,-18} {1} fotos  <- ESTAS NO SE TOCAN" -f $INTOCABLE, $album) -ForegroundColor Green
Write-Host ""

if ($total -le 0) { Write-Host "No hay nada que borrar." -ForegroundColor Green; exit 0 }

Write-Host "Se van a borrar $total imagenes de prueba. Esto no se puede deshacer." -ForegroundColor Yellow
$rta = Read-Host "Escribi BORRAR para confirmar"
if ($rta -ne "BORRAR") { Write-Host "Cancelado. No se toco nada."; exit 0 }

$borradas = 0
foreach ($t in $ETIQUETAS) {
  if ($hay[$t] -le 0) { continue }
  # ultima defensa: jamas la etiqueta del album
  if ($t -eq $INTOCABLE) { continue }
  try {
    Invoke-RestMethod -Uri "$api/resources/image/tags/$t" -Method Delete -Headers $cab -TimeoutSec 120 | Out-Null
    Write-Host ("  borrada la etiqueta {0}" -f $t) -ForegroundColor Green
    $borradas += $hay[$t]
  } catch {
    Write-Host ("  fallo {0}: {1}" -f $t, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Listo: $borradas imagenes de prueba borradas." -ForegroundColor Green
Write-Host ("El album sigue con {0} fotos." -f (Contar $INTOCABLE)) -ForegroundColor Green
