# Site Próxima Era — catálogo de aplicativos e jogos (13/11/2026)

## Escopo seguro
A rota `/aplicativos/` agora funciona como catálogo de seis projetos:
- **Em testes:** Boleto Rush!, Crônicas do Abismo e **Próxima Era Retro** (beta Windows/Android). O Retro possui portal, status e manifesto de versão em produção, sem prometer compatibilidade de emuladores ou sincronização de saves concluída.
- **Em desenvolvimento:** República dos Malandros, Brasil em Apuros! e MyEggs (Roblox).
- Não existem links de download inventados, instalação de APK, redirecionamentos externos de APK ou alegações de publicação na Google Play sem confirmação.
- Página exclusivamente estática, com HTML sem JavaScript novo e CSS responsivo. Não muda formulários, preços, WhatsApp, analytics, Pix, admin ou páginas de clientes.
- Política do Boleto Rush em `/aplicativos/boleto-rush/privacidade.html` foi preservada; páginas públicas de Crônicas do Abismo seguem sob `/apps/cronicas-do-abismo/`.

## URLs verificadas via HTTP na origem pública em 13/11
- `https://proximaera.com.br/` 200
- `https://proximaera.com.br/fecha-negocio/` 200
- `https://proximaera.com.br/apps/` 200 — índice legado, preservado nesta rodada
- `https://proximaera.com.br/aplicativos/` 200 — versão anterior na produção
- `https://proximaera.com.br/apps/cronicas-do-abismo/` 200
- `https://proximaera.com.br/apps/cronicas-do-abismo/privacidade/` 200
- `https://proximaera.com.br/aplicativos/boleto-rush/privacidade.html` 200
- `https://proximaera.com.br/retro/` 200
- `https://proximaera.com.br/retro/status.html` 200
- `https://proximaera.com.br/retro/assets/biblioteca-demo.jpg` 200 (arte editorial)
- `https://proximaera.com.br/retro/version.json` 200 — versão 0.3.21, beta de 13/11/2026. Não fixar número no catálogo; acompanhar o manifesto do portal.

A rota `/apps/` é legado independente e **não foi redirecionada/removida**, pois suas páginas filhas contêm conteúdo e políticas que precisam ser preservados. Após homologação e inventário do deploy, pode-se pensar em consolidar o índice, sem excluir URLs profundas.

## Testes
```
node --test tests/apps-catalog.test.cjs
node --test tests/institutional-contact-intake.test.cjs tests/commercial-contact.test.cjs tests/fecha-negocio-premium-demos.test.cjs tests/apps-catalog.test.cjs
git diff --check
```
12 testes locais aprovaram em 13/11/2026, incluindo proteção do WhatsApp comercial, demos, captação de leads e catálogo. A suíte de navegador com Puppeteer (`node tests/apps-catalog-browser.cjs`, executada manualmente no Insano) também passou em **375, 768 e 1440 px**, sem rolagem horizontal e com o destaque Retro visível. Capturas de QA ficam no computador em `qa/apps-catalog/` e não são artefatos publicados.

## Publicação
**Ainda não publicada.** A branch `feature/catalogo-apps-20261113` deriva da branch de finalização institucional `feature/site-finalizacao-institucional-20261112`. Não implantar a branch inteira na produção sem reconciliação com o site publicado: há commits de contato/consentimento nesta linha ainda não presentes na `main`.

Para publicação segura: revisão de PR, backup da página anterior, deploy isolado apenas de `aplicativos/index.html`, `aplicativos/apps.css` e, se necessário, da página pai que linka o catálogo; smoke por HTTP, mobile 390px, navegação teclado e rollback disponível. Não rodar sincronização com exclusão de conteúdo legado `/apps/`.


## Reconciliação com produção — 13/11/2026, 15h43 (BRT)

A página pública `/aplicativos/` foi atualizada por outra publicação independente enquanto esta PR permanecia draft:
- O site de produção já exibe Boleto Rush e Próxima Era Retro, com **botão real para o portal beta**, laboratório e política de privacidade, mas não lista Crônicas do Abismo como cartão.
- O novo catálogo desenvolvido nesta branch inclui Crônicas e os três projetos em desenvolvimento e foi atualizado para **preservar os quatro caminhos do Retro já no ar**.
- A etiqueta de versão do Retro passa a consultar `/retro/version.json` no navegador, **somente via GET, sem cookies nem identificação do visitante**. Se a API estiver fora do ar ou retornar dados inválidos, mantém-se o texto estático; downloads continuam no portal.
- O sitemap público já indexa `/retro/`; a alteração local do sitemap foi **retirada** para evitar sobrescrever trabalho de outros deploys.

### Guarda de conflito com publicação simultânea
Execute `node ops/check-apps-live-baseline.cjs` imediatamente antes de qualquer publicação. Este comando é **somente leitura** e compara hashes SHA-256 do HTML e do CSS atualmente publicados contra o snapshot de 13/11. Se houve alteração, **parar e revisar o diff real**, sem sobrescrever a página.

A confirmação dos hashes **não autoriza deploy nem substitui backup**. A publicação deve modificar somente `aplicativos/index.html`, `aplicativos/apps.css` e `aplicativos/apps-hub.js`, com backup e rollback; não atualizar o sitemap, apagar `/apps/`, interromper os sites ativos nem alterar contato/ads. O acesso SSH do computador Insano não foi autenticado como root; nenhum acesso alternativo ou segredo foi usado.

### Verificações adicionais
- `node --test tests/apps-catalog.test.cjs`: também valida CTA com UTMs, políticas reais e manifesto beta.
- `node tests/apps-catalog-browser.cjs`: layout testado em 375px, 768px e 1440px no Insano (Puppeteer disponível localmente).
- `node ops/check-apps-live-baseline.cjs`: guarda de concorrência validada, sem escrita na produção.

A PR #35 continua em rascunho: não significa que esta versão do código está no ar.
