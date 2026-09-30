# Respaldo de las fotos que suben a la nube.
# Se fija que esten todas en la carpeta respaldo\ y baja solo las que faltan.
# Lo corre solo el Programador de tareas de Windows, una vez por dia.

$ErrorActionPreference = "Stop"
$base     = $PSScriptRoot
$destino  = Join-Path $base "respaldo"
$registro = Join-Path $destino "_registro.txt"

function Anotar($texto) {
  $linea = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm"), $texto
  Write-Host $linea
  if (Test-Path $destino) { Add-Content -Path $registro -Value $linea -Encoding UTF8 }
}

# Los datos se leen del index.html, asi no hay que escribirlos en dos lugares
$html  = Get-Content (Join-Path $base "index.html") -Raw -Encoding UTF8
$cloud = [regex]::Match($html, 'cloudName:\s*"([^"]*)"').Groups[1].Value
$tag   = [regex]::Match($html, 'etiqueta:\s*"([^"]*)"').Groups[1].Value
if (-not $tag) { $tag = "nosotros" }

if (-not $cloud) {
  Write-Host "Todavia no hay cloudName en index.html: no hay nada que respaldar."
  exit 0
}

New-Item -ItemType Directory -Force -Path $destino | Out-Null

$url = "https://res.cloudinary.com/$cloud/image/list/$tag.json"
try {
  $lista = Invoke-RestMethod -Uri $url -TimeoutSec 60
} catch {
  Anotar ("No se pudo leer la lista de fotos: " + $_.Exception.Message)
  exit 1
}

$nuevas = 0
$yaEstaban = 0
$fallaron = 0

foreach ($r in $lista.resources) {
  $limpio  = ($r.public_id -replace '[\/:*?"<>|]', '-')
  $fecha   = try { ([datetime]$r.created_at).ToString("yyyy-MM-dd") } catch { "sin-fecha" }
  $archivo = Join-Path $destino ("{0}_{1}.{2}" -f $fecha, $limpio, $r.format)

  if (Test-Path $archivo) { $yaEstaban++; continue }

  # se baja el original, sin recortes ni transformaciones
  $origen = "https://res.cloudinary.com/$cloud/image/upload/v$($r.version)/$($r.public_id).$($r.format)"
  try {
    Invoke-WebRequest -Uri $origen -OutFile $archivo -TimeoutSec 180
    $nuevas++
  } catch {
    $fallaron++
    Anotar ("No se pudo bajar " + $r.public_id + ": " + $_.Exception.Message)
  }
}

$total = (Get-ChildItem -Path $destino -File | Where-Object { $_.Name -ne "_registro.txt" }).Count
$resumen = "Respaldo: $nuevas nuevas, $yaEstaban ya estaban"
if ($fallaron -gt 0) { $resumen += ", $fallaron fallaron" }
$resumen += ". Guardadas en total: $total."
Anotar $resumen
