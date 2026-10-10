#!/usr/bin/env bash
# Radar Próxima Era — publicação estática limitada, com dry-run e rollback.
# bash ops/deploy-radar-product.sh --check
# sudo bash ops/deploy-radar-product.sh --apply
set -Eeuo pipefail
MODE="$1"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || { echo "Uso: --check|--apply" >&2; exit 2; }
ROOT="/opt/proximaera/site"
RAW="https://raw.githubusercontent.com/giulianocruz/proximaera-site"
RELEASE_SHA="c31552e2dd71fb1eb5cd4ad55f70c7e4ce788173"
BASE_SHA="f3060d0670fab8e2407bace7a2d18c870d7de202"
FILES=(index.html projetos/radar.html sitemap.xml radar/index.html)
PREVIOUS=(index.html projetos/radar.html sitemap.xml)
TMP="$(mktemp -d /tmp/radar-product.XXXXXXXX)"
BACKUP=""
MUTATING=0
HAD_PAGE=0
cleanup() {
  code=$?
  trap - EXIT
  if [[ "$MUTATING" -eq 1 && "$code" -ne 0 && -n "$BACKUP" ]]; then
    echo "Falha detectada: restaurando backup." >&2
    tar -xzf "$BACKUP/originals.tar.gz" -C "$ROOT" || true
    if [[ "$HAD_PAGE" -eq 0 ]]; then rm -f "$ROOT/radar/index.html"; fi
  fi
  rm -rf "$TMP"
  exit "$code"
}
trap cleanup EXIT
command -v curl >/dev/null
command -v tar >/dev/null
command -v cmp >/dev/null
[[ -d "$ROOT" ]] || { echo "Raiz inexistente: $ROOT" >&2; exit 1; }
fetch() {
  ref="$1"; path="$2"; dest="$3"
  mkdir -p "$(dirname "$dest")"
  curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 30 "$RAW/$ref/$path" -o "$dest"
  test -s "$dest"
}
for file in index.html projetos/radar.html sitemap.xml radar/index.html; do
  fetch "$RELEASE_SHA" "$file" "$TMP/new/$file"
done
for file in index.html projetos/radar.html sitemap.xml; do
  fetch "$BASE_SHA" "$file" "$TMP/base/$file"
done
grep -Fq 'Radar · Um produto Próxima Era' "$TMP/new/radar/index.html"
grep -Fq 'https://elitewp.com.br/radar' "$TMP/new/radar/index.html"
grep -Fq 'https://proximaera.com.br/radar/' "$TMP/new/radar/index.html"
grep -Fq 'href="radar/"' "$TMP/new/index.html"
grep -Fq 'href="../radar/"' "$TMP/new/projetos/radar.html"
grep -Fq '<loc>https://proximaera.com.br/radar/</loc>' "$TMP/new/sitemap.xml"
for file in index.html projetos/radar.html sitemap.xml; do
  [[ -f "$ROOT/$file" ]] || { echo "Ausente: $file" >&2; exit 1; }
  if cmp -s "$ROOT/$file" "$TMP/new/$file"; then
    echo "ALREADY_CURRENT $file"
  elif cmp -s "$ROOT/$file" "$TMP/base/$file"; then
    echo "READY_TO_UPDATE $file"
  else
    echo "PRODUCTION_DRIFT $file: arquivo não coincide com baseline, recusando overwrite" >&2
    exit 3
  fi
done
if [[ -e "$ROOT/radar/index.html" ]]; then
  HAD_PAGE=1
  cmp -s "$ROOT/radar/index.html" "$TMP/new/radar/index.html" || { echo "PRODUCTION_DRIFT radar/index.html" >&2; exit 3; }
else
  echo "READY_TO_CREATE radar/index.html"
fi
if [[ "$MODE" == "--check" ]]; then
  echo "Dry-run concluído; produção inalterada."
  exit 0
fi
[[ "$(id -u)" -eq 0 ]] || { echo "Exige administração autorizada; não mudar permissões." >&2; exit 4; }
BACKUP="/opt/proximaera/backups/radar-product-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP"
tar -czf "$BACKUP/originals.tar.gz" -C "$ROOT" index.html projetos/radar.html sitemap.xml
test -s "$BACKUP/originals.tar.gz"
MUTATING=1
mkdir -p "$ROOT/radar"
for file in index.html projetos/radar.html sitemap.xml radar/index.html; do
  dest="$ROOT/$file"
  staged="$(mktemp "$dest.XXXXXXXX")"
  install -m 644 "$TMP/new/$file" "$staged"
  mv -f "$staged" "$dest"
  cmp -s "$dest" "$TMP/new/$file"
  echo "PUBLISHED $file"
done
echo "$RELEASE_SHA" > "$BACKUP/release_sha"
MUTATING=0
echo "Publicação concluída; validar GET https://proximaera.com.br/radar/ e demais links."
echo "Backup: $BACKUP"
