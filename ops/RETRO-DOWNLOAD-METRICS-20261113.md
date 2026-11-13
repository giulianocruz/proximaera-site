# Próxima Era Retro — auditoria privada de downloads

**Data:** 13/11/2026 · **Situação:** relatório de leitura desenvolvido para servidor já existente.

## Fonte e escopo

O domínio público `https://proximaera.com.br/retro/` usa `version.json` para habilitar arquivos Android e Windows e `releases.json` para listar versões. O contêiner Nginx de distribuição é **`proximaera-retro-downloads`**. Não instalar componentes extras nem alterar sua configuração nesta etapa.

O script `ops/retro-download-report.py` consulta somente:

- O manifesto público `https://proximaera.com.br/retro/version.json`, que informa nome e tamanho oficial dos dois arquivos da versão atual.
- `docker logs --since <janela> proximaera-retro-downloads`, lendo os registros de acesso disponíveis.
- `docker inspect` para a data de início da instância atual.

A execução não grava dados nem envia eventos ao site. O relatório contém apenas agregados por plataforma e status HTTP, sem IP, user-agent, URL de referência, e-mail ou cookies.

## Como executar na VPS autorizada

Após a integração no GitHub, usar uma cópia revisada do script ou transmiti-lo por SSH, **sem criar arquivos no webroot**. Exemplo no Windows PowerShell, com o alias SSH autorizado existente no Insano:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$src = Get-Content '.\ops\retro-download-report.py' -Raw -Encoding UTF8
$src | ssh.exe -T -o BatchMode=yes -o StrictHostKeyChecking=yes proximaera-vps 'python3 - --since 24h'
```

Consultar os últimos sete dias (sujeito à retenção do Docker):

```powershell
$src | ssh.exe -T -o BatchMode=yes -o StrictHostKeyChecking=yes proximaera-vps 'python3 - --since 7d'
```

Para testes com logs falsos:

```bash
python3 -m unittest discover -s tests -p 'test_retro_download_report.py' -v
```

## O que a ferramenta conta

- `http_requests_parsed`: requisições HTTP legíveis nos logs do contêiner. Inclui páginas, status e arquivos, não representa usuários.
- `binary_gets_observed`: pedidos **GET** de APK/ZIP em caminhos `/downloads/`. Não inclui HEAD, bots acessando arquivos não-binários ou consultas ao manifesto.
- `android/complete_response_probable` e `windows/complete_response_probable`: requisições GET com HTTP 200 e quantidade de **bytes de corpo enviados** maior ou igual ao tamanho informado em `version.json`. Isso sugere transferência completa; **não comprova instalação, uso nem pessoa única**.
- `partial_range`: requisições 206 (podem ser retomadas ou parciais).
- `incomplete_or_interrupted`: respostas com corpo abaixo do tamanho integral ou indícios de interrupção.
- `older_or_unknown_http_...`: solicitações de versões que não correspondem ao manifesto atual; sem classificar como completas.
- `requested_period_fully_covered: false`: a instância do Docker foi iniciada depois do começo da janela solicitada. O número observado não é total histórico.

## Primeira conferência real

Em **13/11/2026**, o contêiner informou início em `2026-11-13T17:24:49Z`. Até a conferência, foram observadas aproximadamente **183 requisições HTTP** no contêiner atual e **nenhuma requisição de arquivo APK/ZIP**. Essa afirmação cobre **somente os logs retidos pela instância atual**; visitas anteriores, outras réplicas, servidores/CDN e transferências fora desse contêiner não estão contabilizadas.

A versão do manifesto no momento da inspeção era **0.3.21** (Android 4.261.704 bytes; Windows 121.020.402 bytes).

## Decisões importantes

- **Não exibir contador público** com dados incompletos.
- **Não considerar clique de CTA ou visita ao portal como download.**
- Não persistir IPs, user-agents ou URLs individuais; se for implementada persistência futura, guardar **somente incrementos agregados**, sem identificadores.
- A medição atual **não possui histórico durável**: a rotação/substituição do contêiner pode perder logs antigos. Um relatório de totais históricos exigirá persistência agregada e testes de reinicialização antes de qualquer dashboard de números.
- Não ativar serviços, cron de escrita, marketing ou alterações no Nginx sem nova revisão do mecanismo de retenção/precisão.
