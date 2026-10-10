#!/usr/bin/env bash
# Radar Próxima Era: deploy cirúrgico, preservando edições existentes no site.
# bash ops/deploy-radar-product.sh --check
# sudo bash ops/deploy-radar-product.sh --apply
set -Eeuo pipefail
MODE="${1:-}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || { echo "Uso: --check|--apply" >&2; exit 2; }
ROOT="/opt/proximaera/site"
RAW="https://raw.githubusercontent.com/giulianocruz/proximaera-site"
RELEASE_SHA="c31552e2dd71fb1eb5cd4ad55f70c7e4ce788173"
FILES=(index.html projetos/radar.html sitemap.xml radar/index.html)
TMP="$(mktemp -d /tmp/radar-product.XXXXXXXX)"
BACKUP=""
MUTATING=0
HAD_PAGE=0
cleanup() {
  code=$?
  trap - EXIT
  if [[ "$MUTATING" -eq 1 && "$code" -ne 0 && -n "$BACKUP" ]]; then
    echo "Erro no deploy: restaurando originais." >&2
    tar -xzf "$BACKUP/originals.tar.gz" -C "$ROOT" || true
    if [[ "$HAD_PAGE" -eq 0 ]]; then rm -f "$ROOT/radar/index.html"; fi
  fi
  rm -rf "$TMP"
  exit "$code"
}
trap cleanup EXIT
for cmd in curl tar cmp python3 sha256sum install; do command -v "$cmd" >/dev/null || { echo "Falta: $cmd" >&2; exit 1; }; done
[[ -d "$ROOT" ]] || { echo "Diretório não encontrado: $ROOT" >&2; exit 1; }
[[ -f "$ROOT/index.html" && -f "$ROOT/projetos/radar.html" && -f "$ROOT/sitemap.xml" ]] || { echo "Arquivos do site ausentes; abortado." >&2; exit 1; }
mkdir -p "$TMP/staged/radar" "$TMP/staged/projetos"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 25 \
  "$RAW/$RELEASE_SHA/radar/index.html" -o "$TMP/staged/radar/index.html"
test -s "$TMP/staged/radar/index.html"

# O script modifica apenas links conhecidos; não copia a homepage inteira do Git.
# Se um ponto de edição não for reconhecido, falha em vez de sobrescrever conteúdo novo.
python3 - "$ROOT" "$TMP/staged" <<'PY'
from pathlib import Path
import sys

root, stage = (Path(p) for p in sys.argv[1:3])

def render(relative, replacements):
    content = (root / relative).read_text(encoding="utf-8")
    original = content
    for before, after, label in replacements:
        if before in content:
            content = content.replace(before, after)
        elif after not in content:
            raise SystemExit("Ponto de edição não reconhecido (" + label + "): " + relative)
    (stage / relative).write_text(content, encoding="utf-8")
    print(("READY_TO_PATCH" if content != original else "ALREADY_CURRENT") + " " + relative)

render("index.html", [
    ('href="https://radar.elitewp.com.br" target="_blank" rel="noopener"', 'href="radar/"', "home external link"),
    ('href="projetos/radar.html"', 'href="radar/"', "project tile link"),
])
render("projetos/radar.html", [
    ('href="https://radar.elitewp.com.br" target="_blank" rel="noopener"', 'href="../radar/"', "project visit link"),
])
sitemap = (root / "sitemap.xml").read_text(encoding="utf-8")
entry = '  <url><loc>https://proximaera.com.br/radar/</loc><lastmod>2026-10-10</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>\n'
if '<loc>https://proximaera.com.br/radar/</loc>' not in sitemap:
    anchor = '</urlset>'
    if anchor not in sitemap:
        raise SystemExit("Sitemap não contém urlset final")
    sitemap = sitemap.replace(anchor, entry + anchor, 1)
    print("READY_TO_PATCH sitemap.xml")
else:
    print("ALREADY_CURRENT sitemap.xml")
(stage / "sitemap.xml").write_text(sitemap, encoding="utf-8")
PY

grep -Fq 'Radar · Um produto Próxima Era' "$TMP/staged/radar/index.html"
grep -Fq 'https://elitewp.com.br/radar' "$TMP/staged/radar/index.html"
grep -Fq 'href="radar/"' "$TMP/staged/index.html"
grep -Fq 'href="../radar/"' "$TMP/staged/projetos/radar.html"
grep -Fq '<loc>https://proximaera.com.br/radar/</loc>' "$TMP/staged/sitemap.xml"
if [[ -e "$ROOT/radar/index.html" ]]; then
  HAD_PAGE=1
  cmp -s "$ROOT/radar/index.html" "$TMP/staged/radar/index.html" || {
    echo "Existe /radar/index.html diferente. Recusando sobrescrever." >&2; exit 3;
  }
else
  echo "READY_TO_CREATE radar/index.html"
fi

# O snapshot evita corrida com alterações de outros agentes durante este deploy.
(cd "$ROOT" && sha256sum index.html projetos/radar.html sitemap.xml) > "$TMP/source.sha256"
if [[ "$MODE" == "--check" ]]; then
  echo "Dry-run aprovado; produção não alterada."
  exit 0
fi
[[ "$(id -u)" -eq 0 ]] || { echo "Publicação exige acesso administrativo autorizado." >&2; exit 4; }
(cd "$ROOT" && sha256sum --check --status "$TMP/source.sha256") || {
  echo "Site mudou durante a preparação. Reinicie o processo." >&2; exit 3;
}
BACKUP="/opt/proximaera/backups/radar-product-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP"
tar -czf "$BACKUP/originals.tar.gz" -C "$ROOT" index.html projetos/radar.html sitemap.xml
test -s "$BACKUP/originals.tar.gz"
MUTATING=1
mkdir -p "$ROOT/radar"
for file in index.html projetos/radar.html sitemap.xml radar/index.html; do
  dest="$ROOT/$file"
  staged="$(mktemp "$dest.XXXXXXXX")"
  install -m 644 "$TMP/staged/$file" "$staged"
  mv -f "$staged" "$dest"
  cmp -s "$dest" "$TMP/staged/$file"
  echo "PUBLISHED $file"
done
echo "$RELEASE_SHA" > "$BACKUP/release_sha"
MUTATING=0
echo "Deploy local concluído. Verifique GET /radar/ pelo domínio e links da home."
echo "Backup: $BACKUP"
