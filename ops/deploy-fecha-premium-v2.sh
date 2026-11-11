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
TARGET_SHA="b3f9d95fd167a62b804cfb1936eca211d9a1bfbc"
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
command -v git >/dev/null
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

# Constrói em uma pasta temporária a versão que será aplicada. Se houver
# personalizações da produção, faz merge de 3 vias com a base aprovada.
# Conflito = abortar sem modificar o servidor; jamais forçar --ours/--theirs.
for file in "${OLD_TEXT[@]}"; do
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "Arquivo existente obrigatorio ausente: $file" >&2
    exit 1
  fi
  mkdir -p "$TMP/staged/$(dirname "$file")"
  if cmp -s "$ROOT/$file" "$TMP/new/$file"; then
    cp -- "$ROOT/$file" "$TMP/staged/$file"
    echo "TEXTO_ATUAL $file"
    continue
  fi
  fetch_at "$BASE_SHA" "$file" "$TMP/baseline/$file"
  if cmp -s "$ROOT/$file" "$TMP/baseline/$file"; then
    cp -- "$TMP/new/$file" "$TMP/staged/$file"
    echo "BASE_EXATA $file"
  else
    if git merge-file -p "$ROOT/$file" "$TMP/baseline/$file" "$TMP/new/$file" > "$TMP/staged/$file"; then
      echo "MERGE_SEM_CONFLITO $file (personalizacoes preservadas)"
    else
      echo "CONFLITO_DE_PRODUCAO: $file. Nao publicar; requer revisao manual." >&2
      exit 1
    fi
  fi
done
# Exigir que a versão mesclada realmente contenha as alterações essenciais.
grep -Fq 'fecha-hero-v2.webp' "$TMP/staged/fecha-negocio/index.html"
grep -Fq 'fecha-v2.css' "$TMP/staged/fecha-negocio/index.html"
grep -Fq 'class="fecha-negocio-page"' "$TMP/staged/fecha-negocio/index.html"
grep -Fq 'target.dataset.showcase=name' "$TMP/staged/fecha-negocio/preview.js"

for file in "${FILES[@]}"; do
  if [[ -e "$ROOT/$file" && "$file" != "fecha-negocio/index.html" && "$file" != "fecha-negocio/preview.js" ]]; then
    if ! cmp -s "$ROOT/$file" "$TMP/new/$file"; then
      echo "CONFLITO: $file ja existe diferente. Requer revisao." >&2
      exit 1
    fi
  fi
  candidate="$TMP/new/$file"
  if [[ "$file" == "fecha-negocio/index.html" || "$file" == "fecha-negocio/preview.js" ]]; then
    candidate="$TMP/staged/$file"
  fi
  if [[ -f "$ROOT/$file" ]] && cmp -s "$ROOT/$file" "$candidate"; then
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
  candidate="$TMP/new/$file"
  if [[ "$file" == "fecha-negocio/index.html" || "$file" == "fecha-negocio/preview.js" ]]; then
    candidate="$TMP/staged/$file"
  fi
  if [[ -f "$dest" ]] && cmp -s "$dest" "$candidate"; then
    continue
  fi
  mkdir -p "$(dirname "$dest")"
  stage="$dest.pe-v2-new-$"
  cp -- "$candidate" "$stage"
  if [[ -f "$dest" ]]; then
    chmod --reference="$dest" "$stage"
    chown --reference="$dest" "$stage"
  else
    chmod 0644 "$stage"
  fi
  mv -f -- "$stage" "$dest"
  cmp -s "$dest" "$candidate"
done

DONE=1
echo "DEPLOY OK. Backup: $BACKUP/originals.tar.gz"
echo "Pendente homologacao HTTP, mobile, desktop, WhatsApp e consentimento."
