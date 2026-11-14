# Snapshot administrativo local, sem servidor público ou credenciais novas.
[CmdletBinding()]
param([switch]$Open)

$ErrorActionPreference = 'Stop'
$alias = 'proximaera-vps'
$reportCmd = 'python3 /opt/proximaera/tools/retro-dashboard-private.py'
$remoteFile = '/opt/proximaera/tools/private-reports/retro-dashboard.html'
$folder = Join-Path $env:USERPROFILE 'Documents\ProximaEraRetroDashboard'
$output = Join-Path $folder 'retro-dashboard.html'
$temp = Join-Path $folder '.retro-dashboard.tmp'

Write-Host '[RETRO] Atualizando o painel somente leitura na VPS...'
& ssh.exe -T -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=12 $alias $reportCmd
if ($LASTEXITCODE -ne 0) { throw 'Falha na geração remota; nenhum arquivo local foi substituído.' }

# Base64 evita diferenças de encoding em PowerShell 5.1 e falhas de SCP/SFTP.
Write-Host '[RETRO] Copiando o HTML privado para Documentos...'
$encoded = & ssh.exe -T -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=12 $alias ('base64 -w0 ' + $remoteFile)
if ($LASTEXITCODE -ne 0 -or -not $encoded) { throw 'Falha no transporte; a cópia anterior foi preservada.' }
$raw = [Convert]::FromBase64String(($encoded -join ''))
if ($raw.Length -lt 3000) { throw 'Snapshot incompleto; a cópia anterior foi preservada.' }
$utf8 = [Text.Encoding]::UTF8.GetString($raw)
if (-not $utf8.Contains('Retro Analytics') -or -not $utf8.Contains('data-json')) {
  throw 'Arquivo retornado não parece ser o painel esperado.'
}
[IO.Directory]::CreateDirectory($folder) | Out-Null
try {
  [IO.File]::WriteAllBytes($temp,$raw)
  Move-Item -LiteralPath $temp -Destination $output -Force
}
finally {
  if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force }
}
Write-Host ('[RETRO] Painel local pronto: ' + $output)
if ($Open) { Start-Process -FilePath $output }
