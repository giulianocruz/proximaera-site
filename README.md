# Próxima Era — site institucional e portfólio

Site público: https://proximaera.com.br/ · Repositório: `giulianocruz/proximaera-site`.

## Situação operacional (auditoria de 03/11/2026)

- **No ar:** home, Radar, catálogo de aplicativos/jogos, contato, editorial, Botucatu, ofertas, privacidade e sitemap.
- **Radar:** `/radar/` voltou a responder HTTP 200 após publicação cirúrgica, com backup/rollback.
- **Portfólio:** `/aplicativos/` mostra Boleto Rush!, MyEggs, República dos Malandros e Brasil em Apuros com estágios transparentes. Não inventar links de instalação/publicação.
- **JavaScript:** corrigidas em produção duas chamadas GA4 malformadas em 42 páginas, preservando o HTML de cada página. Backup em `/opt/proximaera/backups/ga-inline-*/originals.tar.gz`.
- **Validação visual:** 4 páginas × 2 larguras (390 px e 1366 px), 8/8 sem erros JS, imagens quebradas ou rolagem horizontal. Menu móvel da home foi acionado com sucesso.
- **Contato comercial — funcional sem API:** o formulário em produção utiliza por padrão **envio assistido**: botão `Preparar mensagem`, dados preservados e links preparados para WhatsApp/e-mail; o visitante confirma o envio no aplicativo escolhido. Não tenta `POST /api/contact` nem simula registro no CRM. O modo automático só pode ser reativado após validação do backend, pelo atributo explícito `data-contact-crm="enabled"` no elemento HTML.
- **Integração automática de leads — pendência administrativa separada:** a versão do Admin implantada (ERP Core 0.1.8) não possui `/api/public-contact` nem as funções do DB da rota existente no repositório mais recente. [proximaera-admin #6](https://github.com/giulianocruz/proximaera-admin/issues/6). Não atualizar o ERP inteiro sem migração segura.
- **Validação de publicação:** sitemap público com 49/49 URLs respondendo corretamente, sem redirecionamentos; 8/8 testes HTTP, 8/8 verificações de viewport e teste real de preparo de mensagem (nenhum POST ao CRM; sem leads artificiais).

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

## Conciliação comercial e testes (09/11/2026)

- O conteúdo de produção de `/fecha-negocio/` tem consentimento de marketing antes de GA4 e Meta Pixel; o código-fonte foi conciliado com essa implementação, sem sobrepor personalizações da home em produção.
- Referências antigas de WhatsApp foram corrigidas no código-fonte da home, contato, soluções e páginas comerciais; todas apontam ao canal comercial `+55 14 99642-8874`.
- A política de privacidade no código-fonte reflete o modo **assistido** do formulário, sem prometer registro automático no CRM. A revisão foi publicada pontualmente em 09/11/2026, após conferência de hash, com backup em `/opt/proximaera/backups/privacy-assisted-20261109T172837Z/` e verificação HTTP 200.
- `node --test tests/*.test.cjs` inclui smoke HTTP da landing, modelos e rastreamento dos CTAs; testes em Chrome para desktop/celular e consentimento estão em `tests/fecha-negocio-browser.cjs` e `tests/fecha-negocio-consent-browser.cjs` (requerem `PUPPETEER_MODULE` e `CHROME_PATH`).
- `node ops/compare-production.cjs` compara os arquivos públicos com o código-fonte e **não** modifica a VPS. Diferenças de produção devem ser analisadas individualmente antes de qualquer deploy.
- A campanha Meta Ads continua uma tarefa separada: validar destino real da landing, WhatsApp comercial, evento de conversão e orçamento antes de ativar gastos.

## Critério de entrega e próximas ações

**Versão institucional mínima viável/publicável:** operacional para apresentação de portfólio e recebimento de mensagens por WhatsApp ou e-mail. O formulário não captura leads automaticamente no ERP, e isso deve permanecer explícito.

1. **Próximo projeto da fila:** Chama Sofia, depois Umbandando. Evitar prolongar indefinidamente o polimento deste site.
2. **Melhoria posterior e independente:** [restaurar a integração CRM (issue #6)](https://github.com/giulianocruz/proximaera-admin/issues/6) por release testada e reversível; não bloquear os serviços comerciais básicos pela indisponibilidade desse módulo.
3. **Antes de grandes publicações futuras:** conciliar diferenças de rota, telefone e conteúdo entre produção e GitHub, preservando personalizações do servidor.

**Fora do escopo:** Sistema Imagem (já entregue), Keli Hofbauer (pausada até pagamento) e demais sites de clientes. Próxima Era Commander é um projeto separado.
