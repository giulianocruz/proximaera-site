# Próxima Era — site institucional

Landing page inicial da marca **Próxima Era**, criada a partir da identidade aprovada em 04/09/2026.

## Estado

- Site estático e responsivo.
- Sem dependências, build ou serviços pagos.
- Logo e mascote são desenhados em CSS/SVG para manter o projeto leve.
- Contato provisório: `contato@proximaera.com.br`.
- Domínio definitivo: `proximaera.com.br`.

## Arquivos

- `index.html` — conteúdo e estrutura.
- `styles.css` — identidade visual e responsividade.
- `script.js` — menu mobile, cabeçalho e animações de entrada.

## Deploy

O diretório pode ser servido diretamente por Nginx/Caddy, Coolify, GitHub Pages, Cloudflare Pages, Netlify ou Vercel, sem etapa de compilação.

Quando o DNS de `proximaera.com.br` estiver propagado, apontar o domínio para o serviço de deploy escolhido e ativar HTTPS.

## Próximos passos

1. Mover este diretório para um repositório dedicado `proxima-era` quando a estação remota/GitHub permitir criação de repositório.
2. Configurar deploy automático.
3. Apontar `proximaera.com.br` e `www.proximaera.com.br`.
4. Criar endereço público `contato@proximaera.com.br`.
5. Substituir os status de projetos pelos dados reais conforme a operação evoluir.

## Radar — produto Próxima Era

- Página institucional: /radar/ (radar/index.html).
- O botão de uso aponta para o app legado em https://elitewp.com.br/radar até a migração segura das sessões e pagamentos.
- A rota comercial no domínio Próxima Era é estática; nunca substituir arbitrariamente o app autenticado por iframe ou proxy sem revisar cookies, OAuth, CSRF e callbacks.
