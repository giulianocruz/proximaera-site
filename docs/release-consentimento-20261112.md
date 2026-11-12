# Release operacional — Próxima Era institucional (12/11/2026)

## Entrega em produção

- Unificação do consentimento do Google Analytics no rastreador `/tracking.js`.
- 41 HTML de produção deixaram de carregar diretamente `gtag.js` antes do consentimento.
- 12 dessas páginas passaram a referenciar `/tracking.js`; a página 404 deixou de carregar tags diretas e permanece sem instrumentação comercial.
- `tracking.js` foi ajustado para oferecer consentimento GA4 em páginas institucionais; o Meta Pixel padrão continua restrito a `/ofertas/`, `/fecha-negocio/` e `/diagnostico-gratuito/` quando autorizado.
- Backup verificado: `/opt/proximaera/backups/ga4-consent-unified-20261112T164734Z/`.
- Deploy e diferenças de produção preservados: não copiar todo o repositório para a VPS.

## Testes executados

- Dry-run: 42 arquivos (41 HTML e um JavaScript), 12 inserções de controlador e checagens de integridade.
- QA real com Chrome/Puppeteer, simulando visitante comum e bloqueando chamadas externas para não gerar dados de teste: `/`, `/editorial/`, `/contato.html`, `/fecha-negocio/` e `/diagnostico-gratuito/`.
- Nas cinco URLs: ausência de chamada ao GA4/Meta antes do consentimento; carregamento do GA4 após aceitar; carregamento Meta somente nas duas páginas comerciais verificadas; zero erros JS.
- `node tests/tracking-offers-consent.test.cjs tracking.js` — checagens em memória para aceita/nega/pendente, institucional, landing e diagnóstico.

## Alterações relacionadas feitas anteriormente no mesmo dia

- `/contato.html`: removida promessa incorreta de registro automático no CRM; backup `/opt/proximaera/backups/contact-copy-20261112T162540Z/`.
- `/`: menu e rodapé passam a levar ao catálogo `/aplicativos/`; backup `/opt/proximaera/backups/home-apps-nav-20261112T163304Z/`.
- Auditoria HTTP do sitemap (47 URLs) e de recursos vinculados (98 URLs): sem falhas HTTP detectadas. QA visual desktop e 390px em páginas principais: sem rolagem horizontal.

## Cuidados na continuidade

1. A home publicada difere do GitHub em links, conteúdo e tags; a folha `styles.css` também apresenta drift. Nunca sobrescreva a raiz do servidor com um clone sem conciliação.
2. A página Fecha Negócio usa o WhatsApp pessoal temporário +55 14 99819-3831. Não restaurar o número anterior.
3. O formulário institucional prepara mensagem para WhatsApp/e-mail, mas não registra automaticamente. Só habilitar CRM após testar backend administrativo e sem dados pessoais fictícios em produção.
4. O teste de consentimento em navegador bloqueia efetivamente o envio para terceiros; valida **tentativas de carregamento**, não dados coletados na GA4/Meta.
5. Se houver rollback da liberação de GA4, restaurar os 42 arquivos do backup mantendo permissões e hashes; não usar um checkout Git genérico.

## Código rastreável

Esta ramificação sincroniza o `tracking.js` publicado, o script de migração idempotente por guarda de hashes e as asserções atualizadas.

## Segunda etapa: contato institucional com registro compatível com a API

- Em `/contato.html`, formulário `#peIntakeForm` solicita nome, WhatsApp, interesse, consentimento, e campos opcionais. O formulário assistido `#contactForm` permanece disponível para mensagens detalhadas.
- O frontend `contact-intake-v1.js` envia ao backend existente `POST /api/contact` com campos aceitos na rota implantada: `name`, `phone`, `interest`, `privacyAccepted`, `marketingOptIn=false`, `acquisition` e `details.challenge`. Falhas oferecem link ao WhatsApp pessoal.
- Política de Privacidade atualizada para informar as duas formas de atendimento e o consentimento de analytics.
- Backup e hashes na VPS: `/opt/proximaera/backups/institutional-lead-20261112T170433Z/`.
- QA Chrome com intercetação do POST **sem gravar contatos fictícios**: sucesso simulado (201) em 390 px e erro simulado (503) em 1366 px, ambos com payload compatível, sem overflow nem erros JS.
- A validação de persistência de um lead real no banco da Central ainda depende de uma solicitação verdadeira; não declarar sucesso fim a fim baseado em HTTP 400 de teste ou resposta simulada.
