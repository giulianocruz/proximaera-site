#!/usr/bin/env bash
# Deploy cirurgico da landing Fecha Negocio V2. Nao publica a raiz inteira.
# Uso: bash ops/deploy-fecha-premium-v2.sh --check
#      sudo bash ops/deploy-fecha-premium-v2.sh --apply
set -Eeuo pipefail

MODE="${1:-}"
if [[ "$MODE" != "--check" && "$MODE" != "--apply" ]]; then
  echo "Uso: $0 --check|--apply" >&2
  exit 2
fi

ROOT="${PROXIMAERA_SITE_ROOT:-/opt/proximaera/site}"
BASE_SHA="d974e2a196ca6f43d6658bdf85d6a3070ad93f0d"
TARGET_SHA="89bdf28e76d27f820b09e01f635c6c818e2dce8e"
SOURCE="https://raw.githubusercontent.com/giulianocruz/proximaera-site"
FILES=(
  assets/premium/fecha-hero-v2.webp
  assets/premium/fecha-servicos-v2.webp
  assets/premium/fecha-processo-v2.webp
  assets/premium/fecha-planos-v2.webp
  assets/premium/fecha-beneficios-v2.webp
  assets/premium/fecha-conversao-v2.webp
  assets/premium/fecha-v2.css
  fecha-negocio/preview.js
  fecha-negocio/index.html
)
OLD_TEXT=(fecha-negocio/index.html fecha-negocio/preview.js)
[[ -d "$ROOT" ]] || { echo "Diretorio de producao ausente: $ROOT" >&2; exit 1; }
command -v curl >/dev/null
command -v tar >/dev/null
command -v sha256sum >/dev/null
TMP="$(mktemp -d /tmp/fecha-premium-v2.XXXXXXXX)"
BACKUP=""
DONE=0

cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$MODE" == "--apply" && "$DONE" == 0 && -n "$BACKUP" && -f "$BACKUP/originals.tar.gz" ]]; then
    echo "ERRO: restaurando backup da landing..." >&2
    tar -xzf "$BACKUP/originals.tar.gz" -C "$ROOT" || true
    if [[ -f "$BACKUP/new-files.txt" ]]; then
      while IFS= read -r new_file; do
        [[ -z "$new_file" ]] || rm -f -- "$ROOT/$new_file"
      done < "$BACKUP/new-files.txt"
    fi
  fi
  rm -rf -- "$TMP"
  exit "$status"
}
trap cleanup EXIT

fetch_at() {
  local revision="$1" file="$2" destination="$3"
  mkdir -p "$(dirname "$destination")"
  curl --fail --silent --show-error --location --retry 2 --max-time 30 \
    "$SOURCE/$revision/$file" -o "$destination"
  test -s "$destination"
}

echo "Baixando pacote fixado em $TARGET_SHA"
for file in "${FILES[@]}"; do
  fetch_at "$TARGET_SHA" "$file" "$TMP/new/$file"
done

for file in "${FILES[@]}"; do
  if [[ "$file" == *.webp ]]; then
    test "$(head -c 4 "$TMP/new/$file")" == "RIFF"
    test "$(dd if="$TMP/new/$file" bs=1 skip=8 count=4 2>/dev/null)" == "WEBP"
  fi
done
grep -Fq 'fecha-hero-v2.webp' "$TMP/new/fecha-negocio/index.html"
grep -Fq 'fecha-v2.css' "$TMP/new/fecha-negocio/index.html"
grep -Fq 'wa.me/5514998193831' "$TMP/new/fecha-negocio/index.html"

for file in "${OLD_TEXT[@]}"; do
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "Arquivo existente obrigatorio ausente: $file" >&2
    exit 1
  fi
  if ! cmp -s "$ROOT/$file" "$TMP/new/$file"; then
    fetch_at "$BASE_SHA" "$file" "$TMP/baseline/$file"
    if ! cmp -s "$ROOT/$file" "$TMP/baseline/$file"; then
      echo "DRIFT EM PRODUCAO: $file difere da base auditada. Nao sobrescrever." >&2
      exit 1
    fi
  fi
done

for file in "${FILES[@]}"; do
  if [[ -e "$ROOT/$file" && "$file" != "fecha-negocio/index.html" && "$file" != "fecha-negocio/preview.js" ]]; then
    if ! cmp -s "$ROOT/$file" "$TMP/new/$file"; then
      echo "CONFLITO: $file ja existe diferente. Requer revisao." >&2
      exit 1
    fi
  fi
  if [[ -f "$ROOT/$file" ]] && cmp -s "$ROOT/$file" "$TMP/new/$file"; then
    echo "ATUAL $file"
  else
    echo "PENDENTE $file"
  fi
done
if [[ "$MODE" == "--check" ]]; then
  echo "Preflight completo, VPS inalterada."
  DONE=1
  exit 0
fi

[[ "$(id -u)" == "0" ]] || { echo "Publicacao requer sudo/root." >&2; exit 1; }
BACKUP="/opt/proximaera/backups/fecha-v2-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP"
originals=()
for file in "${FILES[@]}"; do
  if [[ -f "$ROOT/$file" ]]; then
    originals+=("$file")
  else
    echo "$file" >> "$BACKUP/new-files.txt"
  fi
done
if [[ "${#originals[@]}" -gt 0 ]]; then
  tar -czf "$BACKUP/originals.tar.gz" -C "$ROOT" "${originals[@]}"
else
  tar -czf "$BACKUP/originals.tar.gz" --files-from /dev/null
fi
printf '%s\n' "$TARGET_SHA" > "$BACKUP/target-sha.txt"

# A ordem publica imagens, CSS e JS primeiro; HTML por ultimo.
for file in "${FILES[@]}"; do
  dest="$ROOT/$file"
  if [[ -f "$dest" ]] && cmp -s "$dest" "$TMP/new/$file"; then
    continue
  fi
  mkdir -p "$(dirname "$dest")"
  stage="$dest.pe-v2-new-$$"
  cp -- "$TMP/new/$file" "$stage"
  if [[ -f "$dest" ]]; then
    chmod --reference="$dest" "$stage"
    chown --reference="$dest" "$stage"
  else
    chmod 0644 "$stage"
  fi
  mv -f -- "$stage" "$dest"
  cmp -s "$dest" "$TMP/new/$file"
done

DONE=1
echo "DEPLOY OK. Backup: $BACKUP/originals.tar.gz"
echo "Pendente homologacao HTTP, mobile, desktop, WhatsApp e consentimento."
