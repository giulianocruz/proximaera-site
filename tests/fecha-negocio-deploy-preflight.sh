#!/usr/bin/env bash
# Testa merge de produção personalizado e conflito real sem tocar na VPS.
set -Eeuo pipefail
TMP="$(mktemp -d /tmp/fecha-deploy-check.XXXXXXXX)"
trap 'rm -rf "$TMP"' EXIT
BASE="https://raw.githubusercontent.com/giulianocruz/proximaera-site/d974e2a196ca6f43d6658bdf85d6a3070ad93f0d"
for scenario in safe conflict; do
  mkdir -p "$TMP/$scenario/fecha-negocio"
  for file in fecha-negocio/index.html fecha-negocio/preview.js; do
    curl --fail --silent --show-error --location --retry 2 --max-time 30 "$BASE/$file" -o "$TMP/$scenario/$file"
  done
done

# Simula uma personalização da navegação que deve permanecer intacta.
sed -i 's/>Ver exemplo</>Conhecer exemplo</' "$TMP/safe/fecha-negocio/index.html"
grep -Fq 'Conhecer exemplo' "$TMP/safe/fecha-negocio/index.html"
before_html="$(sha256sum "$TMP/safe/fecha-negocio/index.html")"
before_js="$(sha256sum "$TMP/safe/fecha-negocio/preview.js")"
PROXIMAERA_SITE_ROOT="$TMP/safe" bash ops/deploy-fecha-premium-v2.sh --check
test "$before_html" = "$(sha256sum "$TMP/safe/fecha-negocio/index.html")"
test "$before_js" = "$(sha256sum "$TMP/safe/fecha-negocio/preview.js")"

# Simula conflito na mesma linha que receberia a classe premium. Deve abortar.
sed -i 's/<body>/<body data-personalizacao="existente">/' "$TMP/conflict/fecha-negocio/index.html"
grep -Fq 'data-personalizacao="existente"' "$TMP/conflict/fecha-negocio/index.html"
before_conflict="$(sha256sum "$TMP/conflict/fecha-negocio/index.html")"
if PROXIMAERA_SITE_ROOT="$TMP/conflict" bash ops/deploy-fecha-premium-v2.sh --check >"$TMP/conflict.log" 2>&1; then
  echo "FAIL: conflito inesperadamente aceito" >&2
  exit 1
fi
grep -Fq 'CONFLITO_DE_PRODUCAO' "$TMP/conflict.log"
test "$before_conflict" = "$(sha256sum "$TMP/conflict/fecha-negocio/index.html")"
echo "OK: drift preservado, conflito bloqueado e --check sem escrita"
