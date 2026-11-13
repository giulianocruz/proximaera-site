# Registro de publicação — catálogo de apps da Próxima Era

**Data:** 13/11/2026 · **Destino:** `https://proximaera.com.br/aplicativos/` · **Resultado:** PUBLICADO E VALIDADO.

## Escopo implantado

Acesso SSH configurado previamente no PC Insano (`proximaera-vps`), com autenticação por chave existente e verificação de host. **Nenhuma credencial foi compartilhada ou alterada.**

Diretório na VPS: `/opt/proximaera/site/aplicativos/`.

A rotina `ops/deploy-apps-catalog-20261113.sh` efetuou preflight e aplicou **somente três arquivos**, fixados no commit do catálogo `4c96e181f2647a6a07cd5ac475143ba8dc31dd90`:

| Arquivo publicado | SHA-256 verificado na VPS e por HTTPS |
| --- | --- |
| `aplicativos/index.html` | `347a29c974819f9db066b394845f3d28ccd2f390d1f49309ec7c01e6c8f7e938` |
| `aplicativos/apps.css` | `434844e84acc078521e6a812b35cb1e00fb1cb527b6ffa560428cb78e5734d8c` |
| `aplicativos/apps-hub.js` | `535272e8a4c9418d828c84ea7c8f5cddfdde91c84bf7545593835a9c5e814512` |

**Backup conservado na VPS**:

```text
/opt/proximaera/backups/apps-catalog-20261113T202801Z-1295565
```

Contém `originals.tar.gz` do HTML/CSS anteriores e `target-commit.txt`. Não fazer limpeza desse diretório enquanto o rollback precisar permanecer disponível.

## Evidências de sucesso

1. O `--check` na VPS foi aprovado antes do deploy: conteúdo do site existente igual ao snapshot e três arquivos-alvo de GitHub válidos.
2. A rotina de aplicação imprimiu `PUBLICADO: 3 arquivos atualizados` e confirmou a pasta de backup.
3. Uma verificação SSH independente confirmou que **os três arquivos estão no filesystem da VPS com os hashes previstos**; o backup original existe.
4. `node ops/smoke-apps-public.cjs --after`: **30 verificações aprovadas** na origem HTTPS pública, incluindo HTML, CSS, JS, links de Boleto Rush, páginas Crônicas do Abismo, Retro, contato e Fecha Negócio.
5. `node tests/apps-catalog-browser.cjs --live`: aprovado em **375, 768 e 1440 pixels**, sem overflow horizontal, com a arte lazy-loaded do Retro carregada e manifesto da versão beta exibido.
6. `ops/rollback-apps-catalog-20261113.sh --check BACKUP` foi executado na própria VPS: `CHECK OK: backup valido e versao publicada exata`. **Não foi executado rollback.**

## Anomalia pós-publicação e correção do script

O envio do Bash por pipeline PowerShell anexou uma linha residual com `\r` ao final. Depois de `PUBLICADO`, a shell retornou código 127 devido a `$'\r': command not found`. **Esse código não significa falha de instalação**: o filesystem, os três hashes HTTP e a checagem de rollback comprovaram que a atualização estava instalada e estável.

Para evitar essa mensagem em execuções futuras, os scripts de deploy e rollback foram atualizados no repositório com `exit 0` explícito ao final. A instalação de produção usou a versão anterior do script com os mesmos hashes e política de backup; **não executar a aplicação novamente apenas para eliminar o aviso histórico**.

## Segurança e escopo não alterado

- A home institucional, `/fecha-negocio/`, `/contato.html`, `/retro/`, a antiga `/apps/`, políticas, e `sitemap.xml` permaneceram intocados pelo script.
- Nenhuma campanha, cobrança, e-mail, plataforma de anúncios ou download de terceiros foi ativado.
- Os links de download do Retro levam ao portal beta oficial existente. Nada adiciona ROMs, BIOS ou emuladores.

## Reversão (somente em caso de defeito confirmado)

```bash
# Executar na VPS autorizada após revisar a situação atual:
bash ops/rollback-apps-catalog-20261113.sh --check \
  /opt/proximaera/backups/apps-catalog-20261113T202801Z-1295565

# Somente se necessário e depois de confirmar que nenhum outro deploy alterou os arquivos:
sudo bash ops/rollback-apps-catalog-20261113.sh --apply \
  /opt/proximaera/backups/apps-catalog-20261113T202801Z-1295565
```

O comando remoto por `bash -s` lê o script transmitido pelo computador; o arquivo de rollback não foi instalado permanentemente na VPS. A verificação `--check` executada desta maneira foi aprovada.

## Próximo passo de engenharia

A versão está em produção **antes de sua integração ao branch principal**. É fundamental revisar e reconciliar a PR #35 com as alterações institucionais concorrentes, para evitar regressões no próximo deploy integral. Não fazer merge automático de `feature/site-finalizacao-institucional-20261112` na `main` sem verificar a diferença de conteúdo.
