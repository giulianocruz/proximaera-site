#!/usr/bin/env bash
# Proxima Era: limited deployment for marketing funnel.
# Read-only test: bash ops/deploy-marketing-funnel.sh --check
# Publish: sudo bash ops/deploy-marketing-funnel.sh --apply
set -Eeuo pipefail

MODE="$1"
if [[ "$MODE" != "--check" && "$MODE" != "--apply" ]]; then
  echo "Usage: $0 --check|--apply" >&2
  exit 2
fi
ROOT="/opt/proximaera/site"
COMMIT="2c9d877575d1fc68fbaa7f8f3f5564010bf9d330"
RAW="https://raw.githubusercontent.com/giulianocruz/proximaera-site/$COMMIT"
FILES=(
  tracking.js
  ofertas/offer.js
  ofertas/order-status.js
  ofertas/recover.js
  ofertas/recuperar/index.html
  ofertas/google-ai-pro/index.html
  ofertas/canva-pro/index.html
  ofertas/combo-criador/index.html
  ofertas/pedido/index.html
)
TESTS=(tests/tracking-offers-consent.test.cjs tests/offer-funnel.test.cjs)
TMP="$(mktemp -d /tmp/pe-marketing-deploy.XXXXXXXX)"
BACKUP=""
DONE=0

cleanup() {
  code=$?
  trap - EXIT
  if [[ "$MODE" == "--apply" && "$DONE" -eq 0 && -n "$BACKUP" && -f "$BACKUP/originals.tar.gz" ]]; then
    echo "Deploy failed; restoring original files." >&2
    tar -xzf "$BACKUP/originals.tar.gz" -C "$ROOT" || true
  fi
  rm -rf "$TMP"
  exit "$code"
}
trap cleanup EXIT
command -v curl >/dev/null
# The VPS has no host Node binary. Test with an already-pulled, isolated image.
run_node() {
  if command -v node >/dev/null 2>&1; then
    node "$@"
    return
  fi
  command -v docker >/dev/null || { echo "Neither host Node.js nor Docker is available." >&2; return 127; }
  local image="n8nio/n8n:2.10.2"
  docker image inspect "$image" >/dev/null 2>&1 || { echo "QA image $image missing; no implicit pulls." >&2; return 127; }
  docker run --rm --pull=never --network=none --read-only --cap-drop=ALL \
    --security-opt=no-new-privileges --user 0:0 \
    --mount "type=bind,source=$TMP,target=$TMP,readonly" \
    --mount "type=bind,source=$ROOT,target=$ROOT,readonly" \
    --entrypoint=node "$image" "$@"
}
command -v tar >/dev/null

echo "Fetching pinned commit $COMMIT"
for file in ${FILES[@]} ${TESTS[@]}; do
  mkdir -p "$TMP/$(dirname "$file")"
  curl --fail --silent --show-error --location --max-time 25 "$RAW/$file" -o "$TMP/$file"
done
run_node --check "$TMP/tracking.js"
run_node --check "$TMP/ofertas/offer.js"
run_node --check "$TMP/ofertas/order-status.js"
run_node --check "$TMP/ofertas/recover.js"
run_node "$TMP/tests/tracking-offers-consent.test.cjs" "$TMP/tracking.js"
run_node "$TMP/tests/offer-funnel.test.cjs" "$TMP/ofertas/offer.js" "$TMP/ofertas/order-status.js"
for file in ${FILES[@]}; do test -s "$TMP/$file"; done
grep -Fq '/tracking.js?v=20261008-ga4' "$TMP/ofertas/combo-criador/index.html"
grep -Fq '/ofertas/order-status.js?v=20261008-purchase' "$TMP/ofertas/pedido/index.html"
grep -Fq 'value="combo-criador"' "$TMP/ofertas/recuperar/index.html"
echo "Preflight passed."

if [[ "$MODE" == "--check" ]]; then
  echo "Read-only check completed; production unchanged."
  DONE=1
  exit 0
fi
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Publishing requires authorized sudo/root access." >&2
  exit 1
fi
for file in ${FILES[@]}; do test -f "$ROOT/$file"; done

BACKUP="/opt/proximaera/backups/marketing-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP"
tar -czf "$BACKUP/originals.tar.gz" -C "$ROOT" ${FILES[@]}
for file in ${FILES[@]}; do sha256sum "$ROOT/$file"; done >"$BACKUP/before.sha256"
echo "$COMMIT" >"$BACKUP/deployed-commit.txt"

echo "Publishing nine specific files with automatic rollback"
for file in ${FILES[@]}; do
  target="$ROOT/$file"
  temp_target="$target.pe-marketing-new-$$"
  cp -- "$TMP/$file" "$temp_target"
  chown --reference="$target" "$temp_target"
  chmod --reference="$target" "$temp_target"
  mv -f -- "$temp_target" "$target"
  cmp -s "$TMP/$file" "$target"
done
run_node --check "$ROOT/tracking.js"
run_node --check "$ROOT/ofertas/offer.js"
run_node --check "$ROOT/ofertas/order-status.js"
run_node --check "$ROOT/ofertas/recover.js"
DONE=1
echo "DEPLOY OK. Backup: $BACKUP/originals.tar.gz"
echo "Next: verify GA4 and the Pix checkout with real approved orders."
