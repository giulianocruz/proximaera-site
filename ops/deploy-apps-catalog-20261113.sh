#!/usr/bin/env bash
# Release cirurgica /aplicativos/ -- somente 3 arquivos, por commit fixo.
# --check: verifica conteudo remoto e integridade local, sem alterar o site.
# --apply: exige root, backup, guarda contra drift e rollback em erro.
set -Eeuo pipefail
MODE="${1:-}"
if [[ "$MODE" != "--check" && "$MODE" != "--apply" ]]; then
  echo "Uso: bash ops/deploy-apps-catalog-20261113.sh --check|--apply" >&2
  exit 2
fi

SITE_ROOT="${PROXIMAERA_SITE_ROOT:-/opt/proximaera/site}"
BACKUP_ROOT="${PROXIMAERA_APPS_BACKUP_ROOT:-/opt/proximaera/backups}"
COMMIT="4c96e181f2647a6a07cd5ac475143ba8dc31dd90"
RAW="https://raw.githubusercontent.com/giulianocruz/proximaera-site/$COMMIT"
# Publica JavaScript primeiro, CSS depois e HTML por último: evita 404 transitório
# do script antes de o HTML passar a referenciá-lo.
FILES=(aplicativos/apps-hub.js aplicativos/apps.css aplicativos/index.html)
BASE_INDEX="8ea6e783b1e85a06a9be78168f0ecce9b9e55ed480c5e9fd76c44fb907b66967"
BASE_CSS="9412358ddbc7d7676c597378706b133fc4e0022d1aeaab0eeb9934f93fbba55d"
NEW_INDEX="347a29c974819f9db066b394845f3d28ccd2f390d1f49309ec7c01e6c8f7e938"
NEW_CSS="434844e84acc078521e6a812b35cb1e00fb1cb527b6ffa560428cb78e5734d8c"
NEW_JS="535272e8a4c9418d828c84ea7c8f5cddfdde91c84bf7545593835a9c5e814512"
[[ -d "$SITE_ROOT" && -d "$SITE_ROOT/aplicativos" ]] || {
  echo "ABORTADO: diretorio do site nao encontrado" >&2; exit 3;
}
SITE_ROOT="$(cd "$SITE_ROOT" && pwd -P)"
for f in "${FILES[@]}"; do
  [[ ! -L "$SITE_ROOT/$f" ]] || { echo "ABORTADO: symlink inesperado $f" >&2; exit 3; }
done
for cmd in curl sha256sum tar install mktemp mv cmp; do
  command -v "$cmd" >/dev/null || { echo "Falta utilitario $cmd" >&2; exit 3; }
done
if [[ "$MODE" == "--apply" && "$(id -u)" != "0" ]]; then
  echo "ABORTADO: publicacao requer sudo/root; --check e livre" >&2; exit 4
fi

TMP="$(mktemp -d)"
BACKUP=""
MUTATING=0
COMPLETE=0
STAGED=()
cleanup() {
  local code=$?
  trap - EXIT
  if [[ "$MUTATING" == 1 && "$COMPLETE" == 0 && -f "$BACKUP/originals.tar.gz" ]]; then
    echo "FALHA: restaurando HTML e CSS originais" >&2
    tar -xzf "$BACKUP/originals.tar.gz" -C "$SITE_ROOT" || true
    rm -f -- "$SITE_ROOT/aplicativos/apps-hub.js"
  fi
  for staged in "${STAGED[@]}"; do rm -f -- "$staged" || true; done
  rm -rf -- "$TMP"
  exit "$code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

hash_of() { sha256sum "$1" | cut -d' ' -f1; }
need_hash() {
  local filename="$1" expected="$2" actual
  [[ -f "$filename" ]] || return 1
  actual="$(hash_of "$filename")"
  [[ "$actual" == "$expected" ]]
}
# SHA-256 fixos evitam publicar algo diferente do commit revisado.
printf '%s\n' "Baixando 3 arquivos fixados no commit $COMMIT"
for f in "${FILES[@]}"; do
  mkdir -p "$TMP/stage/$(dirname "$f")"
  curl --proto '=https' --proto-redir '=https' --tlsv1.2 --fail --silent --show-error \
    --location --max-time 25 --retry 2 "$RAW/$f" -o "$TMP/stage/$f"
  [[ -s "$TMP/stage/$f" ]] || { echo "Arquivo remoto ausente $f" >&2; exit 5; }
done
need_hash "$TMP/stage/aplicativos/index.html" "$NEW_INDEX" || { echo "Hash alvo invalido HTML" >&2; exit 5; }
need_hash "$TMP/stage/aplicativos/apps.css" "$NEW_CSS" || { echo "Hash alvo invalido CSS" >&2; exit 5; }
need_hash "$TMP/stage/aplicativos/apps-hub.js" "$NEW_JS" || { echo "Hash alvo invalido JS" >&2; exit 5; }
grep -Fq 'Boleto Rush!' "$TMP/stage/aplicativos/index.html"
grep -Fq 'Abismo' "$TMP/stage/aplicativos/index.html"
grep -Fq 'href="../retro/?utm_source=proximaera' "$TMP/stage/aplicativos/index.html"
grep -Fq 'href="../retro/privacidade.html"' "$TMP/stage/aplicativos/index.html"

# Se os 3 arquivos ja forem identicos, tratar como operacao idempotente.
if need_hash "$SITE_ROOT/aplicativos/index.html" "$NEW_INDEX" \
   && need_hash "$SITE_ROOT/aplicativos/apps.css" "$NEW_CSS" \
   && need_hash "$SITE_ROOT/aplicativos/apps-hub.js" "$NEW_JS"; then
  echo "JA PUBLICADO: nenhum arquivo sera substituido."
  exit 0
fi

# A base publica conferida em 13/11/2026 e um guardrail, nao um merge.
# Caso outra sessao mude qualquer arquivo, abortar sem tocar na producao.
if ! need_hash "$SITE_ROOT/aplicativos/index.html" "$BASE_INDEX" \
   || ! need_hash "$SITE_ROOT/aplicativos/apps.css" "$BASE_CSS" \
   || [[ -e "$SITE_ROOT/aplicativos/apps-hub.js" ]]; then
  echo "DRIFT: site mudou ou apps-hub.js ja existe. Nao sobrescrever." >&2
  exit 7
fi
echo "PREFLIGHT OK: versao atual confere e 3 arquivos alvo validados."
[[ "$MODE" == "--apply" ]] || exit 0

# Serializa apenas esta rotina. Outros deploys devem ter sua propria guarda.
command -v flock >/dev/null || { echo "Falta utilitario flock" >&2; exit 4; }
LOCK="/run/lock/proximaera-apps-catalog.lock"
exec 9>"$LOCK"
flock -n 9 || { echo "Ja existe publicacao do catalogo em andamento" >&2; exit 8; }
# Segunda verificacao reduz janela de corrida entre check e escrita.
need_hash "$SITE_ROOT/aplicativos/index.html" "$BASE_INDEX" || exit 7
need_hash "$SITE_ROOT/aplicativos/apps.css" "$BASE_CSS" || exit 7
[[ ! -e "$SITE_ROOT/aplicativos/apps-hub.js" ]] || exit 7

umask 077
BACKUP="$BACKUP_ROOT/apps-catalog-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$BACKUP"
tar -czf "$BACKUP/originals.tar.gz" -C "$SITE_ROOT" \
    aplicativos/index.html aplicativos/apps.css
echo "$COMMIT" > "$BACKUP/target-commit.txt"

MUTATING=1
for f in "${FILES[@]}"; do
  target="$SITE_ROOT/$f"
  tmp_target="$(mktemp "$SITE_ROOT/aplicativos/.apps-new.XXXXXXXX")"
  STAGED+=("$tmp_target")
  install -m 644 "$TMP/stage/$f" "$tmp_target"
  mv -f -- "$tmp_target" "$target"
done
need_hash "$SITE_ROOT/aplicativos/index.html" "$NEW_INDEX"
need_hash "$SITE_ROOT/aplicativos/apps.css" "$NEW_CSS"
need_hash "$SITE_ROOT/aplicativos/apps-hub.js" "$NEW_JS"
COMPLETE=1
echo "PUBLICADO: 3 arquivos atualizados. BACKUP: $BACKUP"
echo "Verifique HTTP e interface no celular. Nao alterar /apps/, /retro/, contato ou anuncios."
exit 0
