# Proxima Era Retro - instalador V4 do dashboard privado/offline.
# Requer o alias SSH autorizado "proximaera-vps" no Windows Insano.
# Nada e publicado no site, e o banco SQLite nunca e escrito por este script.
[CmdletBinding()]
param(
    [switch]$Verificar,
    [switch]$NaoAbrir
)

$ErrorActionPreference = 'Stop'
$sshAlias = 'proximaera-vps'
$privateHtml = '/opt/proximaera/tools/private-reports/retro-dashboard.html'
$localRoot = Join-Path $env:LOCALAPPDATA 'ProximaEra\RetroDashboard'
$localHtml = Join-Path $localRoot 'retro-dashboard.html'

# O commit e os dois Git blobs sao fixos: nenhum codigo arbitrario e executado.
# SHA de destino: atualizacao de integridade ja integrada na main em PR #45.
$remote = @'
set -Eeuo pipefail
mode="${1:-apply}"
case "$mode" in check|apply) ;; *) echo 'Modo invalido' >&2; exit 2 ;; esac
report=/opt/proximaera/tools/retro-download-report.py
target=/opt/proximaera/tools/retro-dashboard-private.py
private=/opt/proximaera/tools/private-reports
backup_dir=/opt/proximaera/tools/backups
new_blob=c2a627479cc627928313bd6b30b1abcecdb1d34e
approved_v2=a9336cfbccdf91c7b7b9edde35075ac45a0fcaac
commit=926ae8f4053a1ed6c2f289dda2c24a4b53322f6a
url=https://raw.githubusercontent.com/giulianocruz/proximaera-site/$commit/ops/retro-dashboard-private.py

# Isolamento estrito de pastas administrativas.
test "$(id -u)" = 0 || { echo 'Conta SSH sem privilegio autorizado' >&2; exit 4; }
test -d /opt/proximaera/tools && test ! -L /opt/proximaera/tools || { echo 'Pasta administrativa invalida' >&2; exit 7; }
test -f "$report" && test ! -L "$report" || { echo 'Relatorio SQLite ausente ou symlink' >&2; exit 4; }
test ! -L "$target" || { echo 'Gerador existente e symlink' >&2; exit 7; }
test ! -L "$private" || { echo 'Pasta do painel e symlink' >&2; exit 7; }

# Preflight: nao altera codigos ou relatorios de producao.
staging="$(mktemp /tmp/retro-dashboard-v4.XXXXXXXX.py)"
backup=''
changed=0
old_exists=0
candidate=''
cleanup() {
  result=$?
  if test "$result" -ne 0 && test "$changed" = 1; then
    if test "$old_exists" = 1; then
      cp -p -- "$backup" "$target" || true
    else
      rm -f -- "$target" || true
    fi
    echo 'Falha: gerador anterior restaurado' >&2
  fi
  test -z "$candidate" || rm -f -- "$candidate" || true
  rm -f -- "$staging"
}
trap cleanup EXIT

curl --proto '=https' --proto-redir '=https' --tlsv1.2 --fail --location --silent --show-error --max-time 30 "$url" -o "$staging"
python3 - "$staging" "$new_blob" <<'PY'
import ast, hashlib, pathlib, sys
p=pathlib.Path(sys.argv[1]); b=p.read_bytes()
blob=hashlib.sha1(('blob '+str(len(b))+'\0').encode('ascii')+b).hexdigest()
if blob != sys.argv[2]:
    sys.exit('ABORTADO: blob Git diferente: '+blob)
ast.parse(b.decode('utf-8'))
print('Codigo autenticado e sintaxe Python valida')
PY

current=absent
if test -e "$target"; then
  current="$(python3 - "$target" <<'PY'
import hashlib,pathlib,sys
b=pathlib.Path(sys.argv[1]).read_bytes()
print(hashlib.sha1(('blob '+str(len(b))+'\0').encode('ascii')+b).hexdigest())
PY
)"
fi
if test "$current" != absent && test "$current" != "$approved_v2" && test "$current" != "$new_blob"; then
  echo 'Gerador na VPS nao e versao conhecida: nao sobrescrever' >&2; exit 7
fi

# Verificar permissao e disponibilidade do banco sem registrar novos eventos.
python3 - <<'PY'
from pathlib import Path
import sqlite3
p=Path('/opt/proximaera-retro-downloads/metrics/counters.sqlite3')
if not p.is_file() or p.is_symlink():
    raise SystemExit('Banco SQLite persistente ausente ou symlink')
c=sqlite3.connect('file:'+str(p)+'?mode=ro',uri=True,timeout=8)
try:
    c.execute('PRAGMA query_only=ON')
    if c.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
        raise SystemExit('Banco de metricas invalido')
finally: c.close()
print('Banco SQLite acessivel em modo somente leitura')
PY

if test "$mode" = check; then
  echo "PREFLIGHT_OK installed=$current target=$new_blob"
  exit 0
fi

if test "$current" != "$new_blob"; then
  if test "$current" != absent; then
    install -d -m 700 "$backup_dir"
    # Backups nunca sao sobrescritos. Permite sucessivas revisoes seguras.
    backup="$(mktemp "$backup_dir/retro-dashboard-before-v4.XXXXXXXX.py")"
    cp -p -- "$target" "$backup"
    old_exists=1
  fi
  temp_install="$(mktemp /opt/proximaera/tools/.retro-dashboard-install.XXXXXXXX.py)"
  install -m 750 "$staging" "$temp_install"
  changed=1
  mv -f -- "$temp_install" "$target"
  echo 'Gerador versionado instalado com backup e rollback'
else
  echo 'Gerador aprovado ja instalado, atualizando apenas os agregados offline'
fi

# Construa um novo snapshot em arquivo reservado, sem substituir a versao boa.
install -d -m 700 "$private"
candidate="$(mktemp "$private/.retro-dashboard-candidate.XXXXXXXX.html")"
rm -f -- "$candidate"
python3 "$target" --days 90 --output "$candidate"
python3 - "$candidate" <<'PY'
import json,pathlib,re,sys
p=pathlib.Path(sys.argv[1]); b=p.read_bytes()
if len(b)<3000: sys.exit('Dashboard muito pequeno; arquivo anterior preservado')
html=b.decode('utf-8')
if 'Retro Analytics' not in html or 'data-json' not in html:
    sys.exit('Marcadores de integridade ausentes; arquivo anterior preservado')
if "connect-src 'none'" not in html:
    sys.exit('CSP offline ausente; arquivo anterior preservado')
m=re.search(r'<script id="data-json" type="application/json">(.*?)</script>',html,re.S)
if not m: sys.exit('JSON offline ausente; arquivo anterior preservado')
data=json.loads(m.group(1))
if data.get('source')!='persistent_sqlite_read_only':
    sys.exit('Origem de dados nao confiavel')
if data['downloads']['complete']<0:sys.exit('Metrica invalida')
print('Novo snapshot verificado, respostas completas:',data['downloads']['complete'])
PY
test "$(stat -c %a "$candidate")" = 600
# Troca atomica no mesmo sistema de arquivos. Nenhum novo cron/HTTP.
mv -f -- "$candidate" "$private/retro-dashboard.html"
candidate=''
test "$(stat -c %a "$private/retro-dashboard.html")" = 600
test "$(stat -c %a "$private")" = 700
changed=0
echo 'PAINEL_PRIVADO_GERADO_E_VALIDADO'
exit 0
'@
$remote = $remote.Replace(([string][char]13+[string][char]10),[string][char]10)+[string][char]10
$mode = if ($Verificar) { 'check' } else { 'apply' }

function Invoke-RemoteBash([string]$Source,[string]$Mode) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'ssh.exe'
    $psi.Arguments = '-T -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=12 proximaera-vps bash -s -- '+$Mode
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $proc = [System.Diagnostics.Process]::Start($psi)
    try {
        $outTask = $proc.StandardOutput.ReadToEndAsync()
        $errTask = $proc.StandardError.ReadToEndAsync()
        $bytes = (New-Object System.Text.UTF8Encoding($false)).GetBytes($Source)
        $proc.StandardInput.BaseStream.Write($bytes,0,$bytes.Length)
        $proc.StandardInput.Close()
        $proc.WaitForExit()
        $stdout = $outTask.GetAwaiter().GetResult()
        $stderr = $errTask.GetAwaiter().GetResult()
        if ($stdout) { Write-Host $stdout }
        if ($proc.ExitCode -ne 0) { throw "SSH retornou codigo $($proc.ExitCode): $stderr" }
        if ($stderr) { Write-Warning $stderr }
    }
    finally { $proc.Dispose() }
}

Write-Host "[Retro] Validando painel na VPS ($mode)..." -ForegroundColor Cyan
Invoke-RemoteBash $remote $mode
if ($Verificar) { Write-Host '[Retro] Verificacao aprovada: nenhum gerador ou painel substituido.' -ForegroundColor Green; exit 0 }

Write-Host '[Retro] Copiando fotografia privada via SSH...' -ForegroundColor Cyan
$hashOutput = & ssh.exe -T -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=12 $sshAlias ('sha256sum '+$privateHtml)
if ($LASTEXITCODE -ne 0 -or -not $hashOutput) { throw 'Nao foi possivel verificar o snapshot privado' }
$remoteHash = (($hashOutput -join ' ') -split '\s+')[0].ToLowerInvariant()
if ($remoteHash -notmatch '^[0-9a-f]{64}$') { throw 'SHA remoto invalido' }
$encoded = & ssh.exe -T -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=12 $sshAlias ('base64 -w0 '+$privateHtml)
if ($LASTEXITCODE -ne 0 -or -not $encoded) { throw 'Falha de transporte; copia local anterior preservada' }
$bytes = [Convert]::FromBase64String(($encoded -join ''))
$sha = [System.Security.Cryptography.SHA256]::Create()
try { $localHash = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() }
finally { $sha.Dispose() }
if ($localHash -ne $remoteHash) { throw 'Snapshot alterado durante a copia; arquivo anterior preservado' }
if ($bytes.Length -lt 3000) { throw 'Snapshot HTML incompleto' }
$body = [Text.Encoding]::UTF8.GetString($bytes)
if (-not $body.Contains('Retro Analytics') -or -not $body.Contains('data-json')) { throw 'Conteudo remoto inesperado' }

# Evita salvar por link simbolico/reparse point. Copia antiga preservada em .bak.
if (Test-Path -LiteralPath $localRoot) {
    $item = Get-Item -LiteralPath $localRoot -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Pasta local redirecionada; abortado' }
}
[IO.Directory]::CreateDirectory($localRoot) | Out-Null
if (Test-Path -LiteralPath $localHtml) {
    $item = Get-Item -LiteralPath $localHtml -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Arquivo local redirecionado; abortado' }
}
$tmp = Join-Path $localRoot ('.retro-dashboard-'+[Guid]::NewGuid().ToString('N')+'.tmp')
$bak = Join-Path $localRoot 'retro-dashboard-anterior.html.bak'
try {
    [IO.File]::WriteAllBytes($tmp,$bytes)
    if (Test-Path -LiteralPath $localHtml) {
        [IO.File]::Replace($tmp,$localHtml,$bak,$true)
    } else {
        [IO.File]::Move($tmp,$localHtml)
    }
}
finally { if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force } }
Write-Host ('[Retro] Painel atualizado: '+$localHtml) -ForegroundColor Green
Write-Host ('[Retro] SHA-256: '+$localHash)
if (-not $NaoAbrir) { Start-Process -FilePath $localHtml }