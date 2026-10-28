#!/usr/bin/env bash
# Próxima Era — publicação cirúrgica do portfólio de apps e privacidade Boleto Rush
# bash ops/deploy-boleto-rush-privacy.sh --check
# sudo bash ops/deploy-boleto-rush-privacy.sh --apply
set -Eeuo pipefail
MODE="$1"
if [[ "$MODE" != "--check" && "$MODE" != "--apply" ]]; then echo "Use --check ou --apply"; exit 2; fi
ROOT="/opt/proximaera/site"
COMMIT="fce5eacbf76206111b0f55c29ecfbca6b67bf1c7"
RAW="https://raw.githubusercontent.com/giulianocruz/proximaera-site/$COMMIT"
FILES="aplicativos/apps.css aplicativos/index.html aplicativos/boleto-rush/privacidade.html assets/apps/boleto-rush-icon.png assets/apps/boleto-rush-banner.jpg"
PATCH="index.html projetos/guegames.html sitemap.xml"
TMP="$(mktemp -d /tmp/pe-boleto-policy.XXXXXXXX)"
trap 'rm -rf "$TMP"' EXIT
test -d "$ROOT" || { echo "Site não encontrado em $ROOT"; exit 1; }
mkdir -p "$TMP/stage"
for f in $FILES; do
  mkdir -p "$TMP/stage/$(dirname "$f")"
  curl -fLsS --max-time 30 "$RAW/$f" -o "$TMP/stage/$f"
  test -s "$TMP/stage/$f"
  if test -e "$ROOT/$f" && ! cmp -s "$TMP/stage/$f" "$ROOT/$f"; then
    echo "Conflito: página/arte já existe e difere: $f"; exit 3
  fi
done
grep -Fq "Boleto Rush!" "$TMP/stage/aplicativos/index.html"
grep -Fq "Google Mobile Ads SDK" "$TMP/stage/aplicativos/boleto-rush/privacidade.html"
grep -Fq "contato@proximaera.com.br" "$TMP/stage/aplicativos/boleto-rush/privacidade.html"
mkdir -p "$TMP/patch/projetos"
python3 - "$ROOT" "$TMP/patch" <<'PY'
from pathlib import Path
import sys
root, stage = map(Path, sys.argv[1:3])
def patch(file, rules):
    s = (root / file).read_text(encoding="utf-8")
    for old, new, guard in rules:
        if guard in s: continue
        if s.count(old) != 1: raise SystemExit(f"Estrutura inesperada: {file} / {old[:55]}")
        s = s.replace(old, new, 1)
    (stage / file).write_text(s, encoding="utf-8")
    print("VALIDATED", file)

patch("index.html", [
 ('      <a href="#projetos">Projetos</a>',
  '      <a href="#projetos">Projetos</a>\n      <a href="aplicativos/">Aplicativos</a>',
  '<a href="aplicativos/">Aplicativos</a>'),
 ('<a class="project-card reveal project-link" href="projetos/guegames.html"><img class="project-logo" src="assets/projects/guegames.svg" alt="" /><h3>GueGames</h3><p>Jogos, protótipos e experiências interativas.</p><footer><span class="status exp">Experimental</span><b>Conhecer →</b></footer></a>',
  '<a class="project-card reveal project-link" href="projetos/guegames.html"><img class="project-logo" src="assets/projects/guegames.svg" alt="" /><h3>GueGames</h3><p>Jogos e experiências interativas, incluindo Boleto Rush! para Android.</p><footer><span class="status exp">Em testes</span><b>Conhecer →</b></footer></a>',
  'incluindo Boleto Rush! para Android.'),
 ('      </div>\n    </section>\n\n    <section class="home-editorial" id="editorial">',
  '      </div><p style="text-align:center;margin-top:28px"><a href="aplicativos/" class="button ghost" style="color:#dff9ff;border:1px solid #668c98">Portfólio de aplicativos e jogos →</a></p>\n    </section>\n\n    <section class="home-editorial" id="editorial">',
  'Portfólio de aplicativos e jogos →'),
 ('<a href="privacidade.html">Privacidade</a><a href="termos.html">Termos de uso</a>',
  '<a href="aplicativos/">Aplicativos</a><a href="privacidade.html">Privacidade</a><a href="termos.html">Termos de uso</a>',
  '<a href="aplicativos/">Aplicativos</a><a href="privacidade.html">Privacidade</a>')
])
patch("projetos/guegames.html", [
 ('<span class="project-coming">Ainda não possui endereço público próprio.</span>',
  '<p><strong>Boleto Rush!</strong> — jogo casual Android com modos Clássico e Maratona, recordes e anúncios recompensados opcionais, em fase de testes.</p><p><a href="../aplicativos/">Ver portfólio de aplicativos →</a></p><p><a href="../aplicativos/boleto-rush/privacidade.html">Política de privacidade do Boleto Rush! →</a></p>',
  'Política de privacidade do Boleto Rush! →')
])
patch("sitemap.xml", [
 ('</urlset>',
  '  <url><loc>https://proximaera.com.br/aplicativos/</loc><lastmod>2026-10-28</lastmod><changefreq>monthly</changefreq></url>\n  <url><loc>https://proximaera.com.br/aplicativos/boleto-rush/privacidade.html</loc><lastmod>2026-10-28</lastmod><changefreq>monthly</changefreq></url>\n</urlset>',
  '<loc>https://proximaera.com.br/aplicativos/boleto-rush/privacidade.html</loc>')
])
PY
for f in $PATCH; do test -f "$ROOT/$f"; done
if [[ "$MODE" == "--check" ]]; then
  echo "Preflight OK: produção não alterada."
  exit 0
fi
test "$(id -u)" = 0 || { echo "Use sudo para publicar."; exit 4; }
BACKUP="/opt/proximaera/backups/boleto-policy-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP"
tar -czf "$BACKUP/originals.tgz" -C "$ROOT" $PATCH
for f in $FILES; do
  mkdir -p "$ROOT/$(dirname "$f")"
  if test ! -e "$ROOT/$f"; then install -m 644 "$TMP/stage/$f" "$ROOT/$f"; fi
done
for f in $PATCH; do
  staged="$(mktemp "$ROOT/$f.XXXXXXXX")"
  install -m 644 "$TMP/patch/$f" "$staged"
  mv -f "$staged" "$ROOT/$f"
done
echo "PUBLICADO. Backup: $BACKUP"
echo "https://proximaera.com.br/aplicativos/"
echo "https://proximaera.com.br/aplicativos/boleto-rush/privacidade.html"
