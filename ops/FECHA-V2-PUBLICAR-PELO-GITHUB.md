# Publicar a Página Fecha Negócio V2 sem Desktop Commander

**Estado:** a página pública existente responde, mas a auditoria em 11/11/2026 encontrou HTTP 404 para o novo CSS e as seis artes WebP. O código V2 está na `main`; isso não significa que foi publicado na VPS.

Este workflow é **manual** e só executa na branch `main`, com a confirmação literal `PUBLICAR_FECHA_V2`. Pull requests executam apenas testes e **nunca** acessam SSH ou publicam a página.

## Configuração única, feita pelo proprietário da infraestrutura

No repositório `giulianocruz/proximaera-site`, abra **Settings → Secrets and variables → Actions** e configure os seguintes segredos (ou utilize segredos do ambiente `production`):

| Nome | Conteúdo |
| --- | --- |
| `PROXIMAERA_DEPLOY_HOST` | Host/IP real e atual da VPS, confirmado no painel do provedor |
| `PROXIMAERA_DEPLOY_USER` | Conta SSH autorizada, com `sudo -n` para o script de publicação |
| `PROXIMAERA_DEPLOY_SSH_KEY` | Chave privada SSH dessa conta, exclusiva para deploy, sem expô-la em conversas |
| `PROXIMAERA_DEPLOY_KNOWN_HOSTS` | Linha(s) de `known_hosts` verificadas **fora da conexão de deploy**, conferindo a impressão digital no painel ou outro canal confiável |
| `PROXIMAERA_DEPLOY_PORT` | Opcional: porta SSH; omitir para usar 22 |

Use uma chave dedicada de acesso restrito. **Não envie a chave privada, token ou senha pelo chat.** É recomendável criar proteção/revisão no ambiente GitHub `production`.

## Acionamento

1. Abra **Actions → Publicar Fecha Negocio V2 na VPS (manual)**.
2. Selecione **Run workflow**, branch `main`, informe exatamente `PUBLICAR_FECHA_V2` e confirme.
3. O job valida o pacote e os testes estáticos. Na VPS, realiza um `--check` (somente leitura). Se encontrar conflitos de personalização, interrompe sem alterar a produção.
4. Somente com o preflight aprovado, publica os nove arquivos previstos por `ops/deploy-fecha-premium-v2.sh`; o próprio script faz backup e usa rollback em falhas da operação.
5. Depois consulta HTTP da página, CSS, JavaScript e dos seis WebP. O sucesso da Action indica a cópia e a disponibilidade HTTP, **não dispensa** a inspeção visual e do consentimento.

## Critérios para ativar Meta Ads

- Revisar a página pública em 390px e 1366px.
- Trocar entre Beleza, Serviços e Consultoria, incluindo as páginas de exemplo.
- Abrir apenas a URL do WhatsApp, sem enviar mensagem de teste a terceiros.
- Verificar valores e condições de pagamento, consentimento de cookies, carregamento condicionado de GA4/Meta Pixel e ausência de erros JS.
- Confirmar explicitamente a ativação da campanha e orçamento; este workflow **não** altera anúncios.

## Segurança / falhas

- O deploy não ocorre por `push` nem pelo sucesso da CI. É sempre `workflow_dispatch` com confirmação.
- Se faltar qualquer segredo, a Action encerra antes de abrir SSH.
- A conexão exige verificação de chave de host via `known_hosts` e não usa `StrictHostKeyChecking=no`.
- A publicação não faz deploy da raiz inteira, nem altera o Admin, a home ou campanhas.
- Regras de backup/rollback estão em [FECHA-NEGOCIO-V2-RELEASE.md](./FECHA-NEGOCIO-V2-RELEASE.md).
