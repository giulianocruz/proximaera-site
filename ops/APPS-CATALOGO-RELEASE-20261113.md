# Próxima Era · catálogo de aplicativos — publicação conservadora

**Data:** 13/11/2026 · **PR:** #35 · **Situação:** scripts preparados; **nenhum deploy realizado**.

## Motivação

A rota pública `https://proximaera.com.br/aplicativos/` já contém Boleto Rush e a beta do Próxima Era Retro, com links para download, testes e privacidade. Esse conteúdo apareceu por publicação concorrente, depois do início da PR #35. A nova página amplia para seis projetos e preserva esses links, mas NÃO pode ser publicada usando uma sincronização ampla do repositório.

## Arquivos permitidos no release

1. `aplicativos/index.html` — catálogo completo de seis projetos.
2. `aplicativos/apps.css` — layout responsivo.
3. `aplicativos/apps-hub.js` — leitura sem cookies da versão beta em `/retro/version.json`; mantém texto estático se falhar.

**Não alterar:** `index.html` da home, `/apps/` (incluindo Crônicas do Abismo), `/retro/`, `fecha-negocio/`, formulários, analytics, anúncios, Pixel, pagamentos, chaves ou sitemap.

O script busca os três arquivos da versão Git **fixada** em `4c96e181f2647a6a07cd5ac475143ba8dc31dd90`, depois confere o SHA-256 de cada um. O uso da PR atualizada não altera essa referência sem revisão explícita.

## Operação na VPS autorizada — somente quando houver acesso SSH e revisão

Confira inicialmente que `/opt/proximaera/site` ainda é o diretório correto do conteúdo servido pelo Nginx/container. Faça o inventário de volumes e publicações concorrentes antes de atuar; não assuma que o root do servidor tem as credenciais apropriadas.

Do computador que possui este checkout (sem copiar segredos para a conversa):

```bash
# 1. SOMENTE LEITURA: confere os hashes dos arquivos publicados via HTTPS
node ops/check-apps-live-baseline.cjs

# 2. Preflight no próprio filesystem da VPS; SEM escrita na produção.
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes USUARIO_AUTORIZADO@HOST_AUTORIZADO \
  'bash -s -- --check' < ops/deploy-apps-catalog-20261113.sh

# 3. Só após revisão do resultado e autorização da publicação:
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes USUARIO_AUTORIZADO@HOST_AUTORIZADO \
  'sudo -n bash -s -- --apply' < ops/deploy-apps-catalog-20261113.sh
```

Os nomes de SSH são **placeholders**, não uma instrução para descobrir usuários por tentativa. Use somente credenciais existentes e autorizadas. O algoritmo falha se os hashes no servidor não forem exatamente os do snapshot confirmado, se o JS já existir, se houver symlink inesperado ou se o pacote remoto não corresponder ao commit fixado.

O modo `--apply` exige privilégios de administração, usa lock em `/run/lock/proximaera-apps-catalog.lock`, cria backup privado em `/opt/proximaera/backups/apps-catalog-<data>-<pid>`, instala os arquivos individualmente por rename e restaura os originais automaticamente em falhas detectadas antes da conclusão.

## QA após a implantação

```bash
curl -fsS https://proximaera.com.br/aplicativos/ | grep -F 'Crônicas do Abismo'
curl -fsS https://proximaera.com.br/aplicativos/apps-hub.js | grep -F '../retro/version.json'
curl -fsS -o /dev/null https://proximaera.com.br/retro/
curl -fsS -o /dev/null https://proximaera.com.br/apps/cronicas-do-abismo/
curl -fsS -o /dev/null https://proximaera.com.br/fecha-negocio/
```

Também inspecionar visualmente em celular e desktop, navegação pelo teclado, versão beta dinâmica, formulário de contato e vínculos de privacidade. O `--check` do script de deploy passa a indicar **JA PUBLICADO** se os três arquivos forem idênticos ao commit alvo; o guard de baseline HTTPS deve acusar drift após a publicação (comportamento esperado).

## Reversão explícita — somente se necessário

O comando de publicação imprime a pasta **BACKUP** exata. Não usar o backup de outro release e não executar se outro administrador já alterou o site.

```bash
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes USUARIO_AUTORIZADO@HOST_AUTORIZADO \
  'bash -s -- --check /opt/proximaera/backups/apps-catalog-PASTA_CONFIRMADA' \
  < ops/rollback-apps-catalog-20261113.sh

# Aplicar apenas após aprovar o rollback e verificar ausência de alterações concorrentes:
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes USUARIO_AUTORIZADO@HOST_AUTORIZADO \
  'sudo -n bash -s -- --apply /opt/proximaera/backups/apps-catalog-PASTA_CONFIRMADA' \
  < ops/rollback-apps-catalog-20261113.sh
```

O rollback exige que os três arquivos atuais correspondam **exatamente** ao release previsto, verifica o backup e a referência de commit, guarda antes uma cópia da versão instalada, restaura HTML/CSS e remove somente `apps-hub.js`. Se qualquer hash não bater, recusa a operação.

## Testes realizados no Insano em ambiente ISOLADO

- Git Bash `bash -n`: scripts de publicação e reversão sem erros de sintaxe.
- Teste do deploy `--check` com **cópia do HTML/CSS atualmente publicados**: aprovado (nenhum arquivo de produção modificado).
- Alteração artificial na cópia: deploy recusado com código 7, sem escrever JS.
- Teste do rollback `--check` com backup de fixture e três arquivos da revisão Git: aprovado.
- Alteração artificial no JS da fixture: rollback recusado com código 7.
- **Não foi testado `--apply` com root numa VPS de homologação; não afirmar que o deploy/rollback real foi validado fim a fim.**

## Portões obrigatórios antes de publicar

- [ ] Credenciais SSH de uma conta autorizada funcionando (tentativa anterior de `root` foi recusada)
- [ ] Diretório real da aplicação conferido no Nginx / volume Docker
- [ ] PR revisada, branch reavaliada contra produção e alterações concorrentes reconciliadas
- [ ] Permissão para realizar a publicação e janela sem outra operação de deploy
- [ ] `node ops/check-apps-live-baseline.cjs` passou na mesma janela
- [ ] `--check` na VPS passou sem drift
- [ ] Backup e restauração planejados; inspeção mobile após deploy

Não acionar GitHub Actions como mecanismo obrigatório enquanto a franquia do repositório estiver indisponível. Não reutilizar chaves privadas de outros projetos, contas ou clientes.
