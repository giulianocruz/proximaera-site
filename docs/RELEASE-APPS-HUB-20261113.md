# Site Próxima Era — catálogo de aplicativos e jogos (13/11/2026)

## Escopo seguro
A rota `/aplicativos/` agora funciona como catálogo de seis projetos:
- **Em testes:** Boleto Rush! e Crônicas do Abismo, com links legais/página já existentes.
- **Em desenvolvimento:** Próxima Era Retro (Windows/Android), República dos Malandros, Brasil em Apuros! e MyEggs (Roblox).
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

A rota `/apps/` é legado independente e **não foi redirecionada/removida**, pois suas páginas filhas contêm conteúdo e políticas que precisam ser preservados. Após homologação e inventário do deploy, pode-se pensar em consolidar o índice, sem excluir URLs profundas.

## Testes
```
node --test tests/apps-catalog.test.cjs
node --test tests/institutional-contact-intake.test.cjs tests/commercial-contact.test.cjs tests/fecha-negocio-premium-demos.test.cjs tests/apps-catalog.test.cjs
git diff --check
```
12 testes locais aprovaram em 13/11/2026, incluindo proteção do WhatsApp comercial, demos, captação de leads e catálogo.

## Publicação
**Ainda não publicada.** A branch `feature/catalogo-apps-20261113` deriva da branch de finalização institucional `feature/site-finalizacao-institucional-20261112`. Não implantar a branch inteira na produção sem reconciliação com o site publicado: há commits de contato/consentimento nesta linha ainda não presentes na `main`.

Para publicação segura: revisão de PR, backup da página anterior, deploy isolado apenas de `aplicativos/index.html`, `aplicativos/apps.css` e, se necessário, da página pai que linka o catálogo; smoke por HTTP, mobile 390px, navegação teclado e rollback disponível. Não rodar sincronização com exclusão de conteúdo legado `/apps/`.
