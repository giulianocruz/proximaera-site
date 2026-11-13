# Próxima Era — Retro na home e no catálogo de aplicativos

## Objetivo
A home institucional e o catálogo `/aplicativos/` não apresentavam o Próxima Era Retro, embora o portal `/retro/` já ofereça a beta 0.3.21 de Android e Windows.

## Entrega
- Home: cartão **Próxima Era Retro** no bloco Projetos em Destaque, com selo **Beta disponível**, marca vetorial própria e acesso a `/retro/`.
- `/aplicativos/`: segundo cartão junto de Boleto Rush!, usando uma captura de demonstração já publicada em `/retro/assets/biblioteca-demo.jpg`, com acesso a download, laboratório de testes e privacidade.
- Layout responsivo: dois cartões de produto em telas largas; uma coluna no celular e bloco institucional ocupando largura total.
- Textos claros: organizador e launcher, não emulação nativa de todas as plataformas; sem ROMs, BIOS nem jogos comerciais; versão numérica não fica fixa no catálogo.
- Não alterar o portal, os instaladores, serviços de clientes, preços ou canais de WhatsApp.

## Origem e diferenças de produção
A página principal no ar possui personalizações que ainda não estavam na `origin/main`, inclusive a navegação **Apps & Jogos** e apresentação de GueGames. A branch foi criada a partir da `origin/main` e recebeu apenas as versões ativas dos arquivos `index.html`, `aplicativos/index.html` e `aplicativos/apps.css`, além da integração Retro. Isso evita regredir mudanças existentes no site.

## Publicação segura
O script `ops/deploy-retro-crosslinks.cjs` é somente leitura por padrão e faz a pré-checagem das três impressões SHA-256 originalmente verificadas no servidor. `--apply` permite somente quatro arquivos:
- `index.html`
- `aplicativos/index.html`
- `aplicativos/apps.css`
- `assets/projects/proxima-era-retro.svg` (novo)

A publicação usa staging, cópia de segurança em `/opt/proximaera/backups/`, substituição atômica, validação SHA-256 e rollback em falha. Recusa atualização se qualquer arquivo da produção mudou depois da revisão. Não tem permissão lógica para substituir a raiz inteira do site.

## QA
- `node --test tests/retro-portfolio.test.cjs`: cinco testes de conteúdo, responsabilidade nas afirmações, SEO, responsividade declarada no CSS e disponibilidade HTTP das rotas do Retro.
- `node --test tests/production-smoke.test.cjs`: oito rotas institucionais públicas com HTTP 200.
- `node --test tests/radar-product.test.cjs`: regressão Radar.
- `node ops/apply-retro-integration.cjs`: idempotente, verificado em duas execuções.
- `node ops/deploy-retro-crosslinks.cjs`: preflight SSH somente leitura validado; sem publicação na execução padrão.
- O teste de navegação visual local por Electron não foi conclusivo neste ambiente; após publicar, validar HTTP, links reais e conteúdo em ambos os tamanhos de tela. Não afirmar QA visual aprovado sem sua execução.

## Rollback
Em caso de regressão, restaurar apenas os três arquivos anteriores do backup emitido pelo deploy e remover o novo SVG se criado por esta publicação. Conferir então HTTP 200 nas rotas institucional e Apps & Jogos.
