# Próxima Era — site institucional e portfólio

Site público: https://proximaera.com.br/ · Repositório: `giulianocruz/proximaera-site`.

## Situação operacional (auditoria de 03/11/2026)

- **No ar:** home, Radar, catálogo de aplicativos/jogos, contato, editorial, Botucatu, ofertas, privacidade e sitemap.
- **Radar:** `/radar/` voltou a responder HTTP 200 após publicação cirúrgica, com backup/rollback.
- **Portfólio:** `/aplicativos/` mostra Boleto Rush!, MyEggs, República dos Malandros e Brasil em Apuros com estágios transparentes. Não inventar links de instalação/publicação.
- **JavaScript:** corrigidas em produção duas chamadas GA4 malformadas em 42 páginas, preservando o HTML de cada página. Backup em `/opt/proximaera/backups/ga-inline-*/originals.tar.gz`.
- **Validação visual:** 4 páginas × 2 larguras (390 px e 1366 px), 8/8 sem erros JS, imagens quebradas ou rolagem horizontal. Menu móvel da home foi acionado com sucesso.
- **Contato:** a versão do Admin implantada não possui `/api/public-contact`: `POST /api/contact` retorna HTTP 404. A rota existe no GitHub de `proximaera-admin`, mas não no build em execução. **Pendente:** [proximaera-admin #6](https://github.com/giulianocruz/proximaera-admin/issues/6). Não afirmar captura automática de leads até a correção.
- **Contingência de contato:** `contact.js` apresenta links explícitos de WhatsApp/e-mail quando o backend falha, sem descartar a mensagem nem simular sucesso. Comportamentos de erro e sucesso testados em navegador com requisições interceptadas (sem criar leads falsos).

## Desenvolvimento e testes

O site é majoritariamente estático e não depende de build para páginas HTML/CSS/JS. Testes locais (Node.js):

```bash
node tests/radar-product.test.cjs
node tests/offer-funnel.test.cjs
node tests/tracking-offers-consent.test.cjs
node tests/production-smoke.test.cjs
```

O teste `production-smoke.test.cjs` verifica o domínio público; depende de internet e de produção disponível. Testes em navegador foram executados via Puppeteer no computador autorizado, sem submissão real do formulário.

## Publicação segura e diferenças entre GitHub e produção

A produção contém personalizações que não estão no repositório. **Nunca sobrescrever a raiz do site inteiro com uma cópia do GitHub** sem comparar os arquivos. Em particular, a home em produção utiliza também o caminho `/apps/` (além de `/aplicativos/`), e existem canais de contato configurados diretamente em produção que devem ser preservados até validação do proprietário.

Procedimento padrão: comparar arquivo a arquivo → testes/dry-run → backup verificável em `/opt/proximaera/backups/` → alteração mínima e atômica → validar HTTP, navegação, scripts e contatos → manter rollback. As rotinas anteriores de publicação de Radar e das políticas Boleto Rush estão em `ops/`.

## Próxima ação para concluir

1. Resolver a integração automática do formulário no Admin por release controlada e teste end-to-end, conforme a issue #6. Não atualizar o ERP inteiro às cegas.
2. Conciliar diferenças de rota, contato e conteúdo entre produção e repositório sem perder personalizações.
3. Validar novamente navegação mobile e fluxos comerciais; então considerar a versão institucional entregue e avançar ao projeto Chama Sofia.

**Fora do escopo:** Sistema Imagem (já entregue), Keli Hofbauer (pausada até pagamento) e demais sites de clientes. Próxima Era Commander é um projeto separado.
