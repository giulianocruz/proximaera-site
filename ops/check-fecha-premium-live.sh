#!/usr/bin/env bash
# Somente leitura: verifica recursos públicos da landing; não faz deploy.
set -uo pipefail
BASE="${PROXIMAERA_SITE_URL:-https://proximaera.com.br}"
BASE="${BASE%/}"
TMP="$(mktemp -d /tmp/fecha-v2-public-check.XXXXXXXX)"
trap 'rm -rf -- "$TMP"' EXIT
RESOURCES=(
  fecha-negocio/
  fecha-negocio/preview.js
  assets/premium/fecha-v2.css
  assets/premium/fecha-hero-v2.webp
  assets/premium/fecha-servicos-v2.webp
  assets/premium/fecha-processo-v2.webp
  assets/premium/fecha-planos-v2.webp
  assets/premium/fecha-beneficios-v2.webp
  assets/premium/fecha-conversao-v2.webp
)
bad=0
for index in "${!RESOURCES[@]}"; do
  item="${RESOURCES[$index]}"
  status="$(curl --fail-with-body --silent --show-error --location --retry 1 --connect-timeout 8 --max-time 20 --output "$TMP/$index" --write-out '%{http_code}' "$BASE/$item" 2>"$TMP/$index.error" || true)"
  if [[ "$status" == 200 ]]; then
    echo "HTTP_200 $item"
  else
    echo "AUSENTE_OU_INACESSIVEL HTTP_${status:-000} $item"
    bad=$((bad+1))
  fi
done
if [[ -s "$TMP/0" ]] && grep -Fq 'fecha-hero-v2.webp' "$TMP/0" && grep -Fq 'fecha-v2.css' "$TMP/0"; then
  echo "HTML_PREMIUM_SIM"
else
  echo "HTML_PREMIUM_NAO_CONFIRMADO"
  bad=$((bad+1))
fi
if [[ -s "$TMP/0" ]] && grep -Fq 'wa.me/5514998193831' "$TMP/0"; then
  echo "WHATSAPP_PREVISTO_PRESENTE"
else
  echo "WHATSAPP_PREVISTO_NAO_CONFIRMADO"
  bad=$((bad+1))
fi
if [[ "$bad" -eq 0 ]]; then
  echo "RECURSOS_PUBLICOS_OK: ainda exige QA de interacao e consentimento."
else
  echo "PUBLICACAO_NAO_CONFIRMADA: $bad verificacoes pendentes."
fi
# Este diagnóstico informativo não deve bloquear a CI do código nem criar
# uma falsa afirmação de deploy concluído.
exit 0
