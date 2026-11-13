# Reconciliação seletiva do catálogo da Próxima Era com a main

**Data:** 13/11/2026 · **Site em produção:** https://proximaera.com.br/aplicativos/

## Contexto

O catálogo com seis projetos foi publicado na VPS a partir dos arquivos do commit `4c96e181f2647a6a07cd5ac475143ba8dc31dd90`, na branch de desenvolvimento `feature/catalogo-apps-20261113` e na PR #35. Uma atualização institucional independente também alterou a `main` em dois commits:
- `67d418b` — vitrine do Próxima Era Retro no institucional;
- `4be55a9` — entrada do Retro no sitemap e parâmetros de aquisição.

A PR #35 tem como base outra branch, `feature/site-finalizacao-institucional-20261112`, que ainda inclui alterações de formulário e consentimento não presentes na `main`. Não é seguro simplesmente mudar a base ou fazer merge integral dessa PR.

## Estratégia

Criar a branch `feature/catalogo-apps-main-sync-20261113` diretamente de `main` no commit `4be55a9fc23e620a92da1af11ab064ea6251cd64` e extrair **somente** os arquivos do catálogo, suas suítes de teste, os procedimentos de release e o registro da implantação. Isto mantém intactos:

- `index.html` — home institucional;
- `contato.html`, `contact.js`, `tracking.js`, `privacidade.html` — entrada comercial, analytics e consentimento da `main`;
- `sitemap.xml` — contém o Retro, alterado independentemente;
- `fecha-negocio/`, `assets/premium/` — campanhas e páginas comerciais;
- `/apps/`, `/retro/` e arquivos de downloads.

Arquivos que esta sincronização adiciona ou atualiza: `aplicativos/index.html`, `aplicativos/apps.css`, `aplicativos/apps-hub.js`, `tests/apps-catalog.test.cjs`, `tests/apps-catalog-browser.cjs`, `docs/RELEASE-APPS-HUB-20261113.md` e as rotinas/documentos específicos do catálogo em `ops/`. Não incluir outros arquivos.

## Integridade antes de integrar à main

1. Confirmar que os blobs Git de `aplicativos/index.html`, `apps.css` e `apps-hub.js` são idênticos aos blobs na branch original `feature/catalogo-apps-20261113`.
2. Confirmar hashes SHA-256 **das versões LF publicadas** com os três hashes registrados em `ops/APPS-CATALOGO-PUBLICADO-20261113.md`; no Windows, `core.autocrlf=true` pode tornar os hashes de checkout CRLF diferentes sem mudar o conteúdo do repositório.
3. Executar testes de catálogo, exemplos de Serviços/Consultoria e invariantes comerciais. Testar o portal com `node ops/smoke-apps-public.cjs --after`, que é somente leitura e deve apontar 30 verificações aprovadas.
4. Inspecionar o diff da PR e exigir **nenhuma mudança fora do catálogo e seus testes/documentação**.
5. Comparar novamente o SHA da `main` remota com o SHA em que a branch foi criada. Se mudou, reavaliar a diferença antes de fazer merge.

**Atenção:** a `main` dispara workflows GitHub Actions em eventos de push. Com franquia CI limitada, preferir a PR isolada para revisão e não iniciar merge ou workflows manualmente por padrão. Nenhuma alteração da `main` publica automaticamente o catálogo; ele já está no ar. Portanto não há motivo para redeploy nesta operação.

## Critério de conclusão

Uma PR enxuta, baseada em `main`, com os três blobs de frontend iguais aos do release publicado e testes aprovados. A PR original #35 pode continuar draft como histórico do desenvolvimento até a revisão dessa nova PR. Não fechar sem deixar referência cruzada.

## Resultado dos testes de reconciliação

- Os três blobs Git do catálogo na branch baseada na `main` são **exatamente iguais** aos da branch original que forneceu os arquivos publicados.
- `tests/apps-catalog.test.cjs` e `tests/retro-portfolio.test.cjs`: **10 testes aprovados**; a suíte do Retro foi atualizada para testar a estrutura real (cartões, imagem, avisos e versão dinâmica), sem alterar o HTML em produção.
- `tests/tracking-offers-consent.test.cjs`: passou quando invocado com o argumento esperado `tracking.js` a partir do diretório do repositório (essa é sua interface de execução documentada).
- Na regressão dos outros 12 arquivos de testes, **11 passaram e 1 falhou**: `tests/premium-assets.test.cjs` ainda espera que `fecha-negocio/index.html` contenha `assets/premium/fecha-processo.webp`, o que **já não ocorre na própria `main` antes desta reconciliação**. Esse teste e a landing não foram alterados; tratá-lo em correção independente para não introduzir mudanças na campanha comercial.
- `node ops/smoke-apps-public.cjs --after`: **30 verificações públicas aprovadas**, confirmando que a produção continua no release documentado.
- A `main` executa workflows nos eventos de `push`; não fazer merge automático da branch de reconciliação só para obter "main verde" enquanto houver custos/limites de Actions e teste preexistente falhando.

A revisão não modifica a produção: o catálogo já está publicado na VPS, e esta PR trata somente do histórico do GitHub.
