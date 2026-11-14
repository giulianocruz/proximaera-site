# Próxima Era Retro: instala e abre o painel administrativo offline (V2).
# Executar no PC Insano, com o alias SSH autorizado "proximaera-vps".
# NÃO altera webroot, Nginx, Docker, SQLite, downloads, marketing ou crons.
[CmdletBinding()]
param([switch]$NaoAbrir)

$ErrorActionPreference = 'Stop'
$remoteHtml = '/opt/proximaera/tools/private-reports/retro-dashboard.html'
$localDir = Join-Path $env:USERPROFILE 'Documents\ProximaEraRetroDashboard'
$localHtml = Join-Path $localDir 'retro-dashboard.html'

# Commit e blob Git fixos: qualquer divergência aborta antes da instalação.
# PowerShell 5.1: transmitir bytes UTF-8 para Bash evita CR residual.
$install = @'
set -Eeuo pipefail
source_file=/opt/proximaera/tools/retro-download-report.py
target=/opt/proximaera/tools/retro-dashboard-private.py
expected_blob=a9336cfbccdf91c7b7b9edde35075ac45a0fcaac
commit=07fe9083c93fe2ffee4e886972558469cbe750dd
url=https://raw.githubusercontent.com/giulianocruz/proximaera-site/$commit/ops/retro-dashboard-private.py
test "$(id -u)" = 0 || { echo "ABORTADO: requer administrador SSH autorizado" >&2; exit 4; }
test -f "$source_file" || { echo "ABORTADO: relatorio SQLite ausente" >&2; exit 4; }
test ! -L "$target" || { echo "ABORTADO: destino remoto e symlink" >&2; exit 4; }
tmp="$(mktemp /tmp/retro-dashboard-XXXXXXXX.py)"
trap 'rm -f -- "$tmp"' EXIT
curl --proto '=https' --proto-redir '=https' --tlsv1.2 -fLsS --max-time 25 "$url" -o "$tmp"
python3 - "$tmp" "$expected_blob" <<'PY'
import hashlib, pathlib, sys
raw = pathlib.Path(sys.argv[1]).read_bytes()
blob = hashlib.sha1(('blob '+str(len(raw))+'\0').encode('ascii')+raw).hexdigest()
if blob != sys.argv[2]:
    sys.exit('ABORTADO: git blob diferente '+blob)
print('Integridade confirmada:',blob)
PY
python3 -m py_compile "$tmp"
if test -e "$target"; then
  cmp -s "$tmp" "$target" || { echo "ABORTADO: ferramenta instalada diferente; revisar antes de sobrescrever" >&2; exit 7; }
  echo "Gerador ja instalado, sem alteracao."
else
  install -m 750 "$tmp" "$target"
  echo "Gerador privado instalado."
fi
python3 "$target" --days 90
html=/opt/proximaera/tools/private-reports/retro-dashboard.html
test -s "$html"
test "$(stat -c %a "$html")" = 600
test "$(stat -c %a "$(dirname "$html")")" = 700
echo "PAINEL PRIVADO GERADO E VALIDADO"
exit 0
'@
$install = $install.Replace(([string][char]13 + [string][char]10), [string][char]10) + [string][char]10

Write-Host '[Retro] Validando gerador na VPS...' -ForegroundColor Cyan
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'ssh.exe'
$psi.Arguments = '-T -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10 proximaera-vps bash -s'
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
$proc = [System.Diagnostics.Process]::Start($psi)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$bytes = $utf8.GetBytes($install)
$proc.StandardInput.BaseStream.Write($bytes,0,$bytes.Length)
$proc.StandardInput.Close()
$output = $proc.StandardOutput.ReadToEnd()
$err = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()
if ($output) { Write-Host $output }
if ($proc.ExitCode -ne 0) { throw "Falha na VPS (codigo $($proc.ExitCode)): $err" }
if ($err) { Write-Warning $err }

Write-Host '[Retro] Copiando o painel por SSH autenticado...' -ForegroundColor Cyan
$b64 = & ssh.exe -T -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10 proximaera-vps ('base64 -w0 ' + $remoteHtml)
if ($LASTEXITCODE -ne 0 -or -not $b64) { throw 'Falha no transporte: a cópia anterior permanece preservada.' }
$raw = [Convert]::FromBase64String(($b64 -join ''))
if ($raw.Length -lt 3000) { throw 'Arquivo recebido incompleto.' }
$text = [Text.Encoding]::UTF8.GetString($raw)
if (-not $text.Contains('Retro Analytics') -or -not $text.Contains('data-json')) {
    throw 'O conteúdo recebido não é o painel aprovado.'
}
[IO.Directory]::CreateDirectory($localDir) | Out-Null
if ((Test-Path -LiteralPath $localHtml) -and ((Get-Item -LiteralPath $localHtml -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Destino local aponta para reparse point; recusado.'
}
$tmp = Join-Path $localDir '.retro-dashboard.tmp'
try {
    [IO.File]::WriteAllBytes($tmp,$raw)
    Move-Item -LiteralPath $tmp -Destination $localHtml -Force
} finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}
Write-Host ('[Retro] Painel local pronto: ' + $localHtml) -ForegroundColor Green
if (-not $NaoAbrir) { Start-Process -FilePath $localHtml }
