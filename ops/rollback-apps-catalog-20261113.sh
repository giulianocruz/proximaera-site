#!/usr/bin/env bash
# Rollback manual e conservador, restrito ao backup criado pelo deploy do catalogo.
# bash ops/rollback-apps-catalog-20261113.sh --check /opt/proximaera/backups/apps-catalog-...
# sudo bash ops/rollback-apps-catalog-20261113.sh --apply /opt/proximaera/backups/apps-catalog-...
set -Eeuo pipefail
MODE="${1:-}"
BACKUP_ARG="${2:-}"
if [[ ( "$MODE" != "--check" && "$MODE" != "--apply" ) || -z "$BACKUP_ARG" ]]; then
  echo "Uso: $0 --check|--apply DIRETORIO_BACKUP" >&2
  exit 2
fi
SITE_ROOT="${PROXIMAERA_SITE_ROOT:-/opt/proximaera/site}"
BACKUP_ROOT="${PROXIMAERA_APPS_BACKUP_ROOT:-/opt/proximaera/backups}"
COMMIT="4c96e181f2647a6a07cd5ac475143ba8dc31dd90"
BASE_INDEX="8ea6e783b1e85a06a9be78168f0ecce9b9e55ed480c5e9fd76c44fb907b66967"
BASE_CSS="9412358ddbc7d7676c597378706b133fc4e0022d1aeaab0eeb9934f93fbba55d"
NEW_INDEX="347a29c974819f9db066b394845f3d28ccd2f390d1f49309ec7c01e6c8f7e938"
NEW_CSS="434844e84acc078521e6a812b35cb1e00fb1cb527b6ffa560428cb78e5734d8c"
NEW_JS="535272e8a4c9418d828c84ea7c8f5cddfdde91c84bf7545593835a9c5e814512"
[[ -d "$SITE_ROOT/aplicativos" && -d "$BACKUP_ROOT" && -d "$BACKUP_ARG" ]] || {
  echo "Diretorio obrigatorio ausente" >&2; exit 3;
}
SITE_ROOT="$(cd "$SITE_ROOT" && pwd -P)"
BACKUP_ROOT="$(cd "$BACKUP_ROOT" && pwd -P)"
BACKUP="$(cd "$BACKUP_ARG" && pwd -P)"
[[ "$(dirname "$BACKUP")" == "$BACKUP_ROOT" && "$(basename "$BACKUP")" == apps-catalog-* ]] || {
  echo "Backup fora do diretorio de release esperado" >&2; exit 3;
}
[[ -f "$BACKUP/originals.tar.gz" && -f "$BACKUP/target-commit.txt" ]] || {
  echo "Backup incompleto" >&2; exit 3;
}
[[ "$(cat "$BACKUP/target-commit.txt")" == "$COMMIT" ]] || {
  echo "Backup pertence a outro commit" >&2; exit 3;
}
for cmd in sha256sum tar mktemp install mv; do
  command -v "$cmd" >/dev/null || { echo "Falta $cmd" >&2; exit 3; }
done
# Permitir SOMENTE os dois arquivos originalmente alterados.
listing="$(tar -tzf "$BACKUP/originals.tar.gz" | LC_ALL=C sort)"
expected="$(printf '%s\n' aplicativos/apps.css aplicativos/index.html)"
[[ "$listing" == "$expected" ]] || { echo "Conteudo do backup inesperado" >&2; exit 3; }
hash_of(){ sha256sum "$1" | cut -d' ' -f1; }
has_hash(){ [[ -f "$1" && "$(hash_of "$1")" == "$2" ]]; }
[[ ! -L "$SITE_ROOT/aplicativos/index.html" && ! -L "$SITE_ROOT/aplicativos/apps.css" && ! -L "$SITE_ROOT/aplicativos/apps-hub.js" ]] || {
  echo "Symlink inesperado" >&2; exit 3;
}
if has_hash "$SITE_ROOT/aplicativos/index.html" "$BASE_INDEX" \
  && has_hash "$SITE_ROOT/aplicativos/apps.css" "$BASE_CSS" \
  && [[ ! -e "$SITE_ROOT/aplicativos/apps-hub.js" ]]; then
  echo "ROLLBACK JA APLICADO: nada a alterar"
  exit 0
fi
if ! has_hash "$SITE_ROOT/aplicativos/index.html" "$NEW_INDEX" \
  || ! has_hash "$SITE_ROOT/aplicativos/apps.css" "$NEW_CSS" \
  || ! has_hash "$SITE_ROOT/aplicativos/apps-hub.js" "$NEW_JS"; then
  echo "DRIFT: arquivos atuais nao sao o release esperado. Abortado sem sobrescrever." >&2
  exit 7
fi
TMP="$(mktemp -d)"
trap 'rm -rf -- "$TMP"' EXIT
tar -xzf "$BACKUP/originals.tar.gz" -C "$TMP"
has_hash "$TMP/aplicativos/index.html" "$BASE_INDEX" || {
  echo "Backup original HTML nao confere ao snapshot" >&2; exit 5;
}
has_hash "$TMP/aplicativos/apps.css" "$BASE_CSS" || {
  echo "Backup original CSS nao confere ao snapshot" >&2; exit 5;
}
echo "CHECK OK: backup valido e versao publicada exata. Pronto para restaurar."
[[ "$MODE" == "--apply" ]] || exit 0
[[ "$(id -u)" == "0" ]] || { echo "Use sudo/root" >&2; exit 4; }
command -v flock >/dev/null || { echo "Falta flock" >&2; exit 4; }
LOCK="/run/lock/proximaera-apps-catalog.lock"
exec 9>"$LOCK"
flock -n 9 || { echo "Publicacao/rollback concorrente. Abortado." >&2; exit 8; }
has_hash "$SITE_ROOT/aplicativos/index.html" "$NEW_INDEX" || exit 7
has_hash "$SITE_ROOT/aplicativos/apps.css" "$NEW_CSS" || exit 7
has_hash "$SITE_ROOT/aplicativos/apps-hub.js" "$NEW_JS" || exit 7

# Preservar a versao atual para recuperar se a propria reversao falhar.
umask 077
tar -czf "$BACKUP/pre-rollback.tar.gz" -C "$SITE_ROOT" \
  aplicativos/index.html aplicativos/apps.css aplicativos/apps-hub.js
MUTATING=1
FINISHED=0
restore_release(){
  local status=$?
  trap - EXIT
  if [[ "$MUTATING" == 1 && "$FINISHED" == 0 ]]; then
    echo "FALHA NO ROLLBACK: restaurando o release anterior" >&2
    tar -xzf "$BACKUP/pre-rollback.tar.gz" -C "$SITE_ROOT" || true
  fi
  rm -rf -- "$TMP"
  exit "$status"
}
trap restore_release EXIT
for f in aplicativos/index.html aplicativos/apps.css; do
  dest="$SITE_ROOT/$f"
  staged="$(mktemp "$SITE_ROOT/aplicativos/.rollback-new.XXXXXXXX")"
  install -m 644 "$TMP/$f" "$staged"
  mv -f -- "$staged" "$dest"
done
rm -f -- "$SITE_ROOT/aplicativos/apps-hub.js"
has_hash "$SITE_ROOT/aplicativos/index.html" "$BASE_INDEX"
has_hash "$SITE_ROOT/aplicativos/apps.css" "$BASE_CSS"
[[ ! -e "$SITE_ROOT/aplicativos/apps-hub.js" ]]
FINISHED=1
echo "ROLLBACK CONCLUIDO: HTML/CSS restaurados e JS do release removido."
exit 0
