# Próxima Era Retro — correção de JavaScript e instalador V5

**Data:** 14/11/2026 · Escopo: painel administrativo **privado e offline**.

## Correções funcionais

A template string Python de `ops/retro-dashboard-private.py` passou a ser `PAGE = r"""..."""` para **preservar escapes do JavaScript**. Na versão anterior, barras invertidas em expressões regulares e sequências `\\r\\n` poderiam se transformar em caracteres de controle dentro do JS quando Python montava o HTML. Isso podia fazer o painel parecer gerado corretamente, mas falhar no navegador ao iniciar ou exportar CSV.

O quadro de versões usa `Intl.Collator('pt-BR',{numeric:true})`. Assim, a ordem numérica descendente é **0.3.100, 0.3.21, 0.3.9** — não a ordem lexicográfica incorreta.

Exportação CSV passou a proteger células com fórmulas iniciadas em =, +, - ou @ (inclusive após espaços), duplicar aspas, manter ponto-e-vírgula dentro de campos entre aspas e produzir CRLF e BOM para interoperabilidade com planilhas. **Não foi alterado qualquer contador de produção.**

## Revisão do instalador

O instalador `ops/Instalar_e_Abrir_Painel_Retro_v5.ps1` está fixado na revisão imutável do gerador:

- Commit-fonte `ceec69f41a7e2db2db5c50f5eaf644506664a4e0`
- Blob Git `03f4ef418f5d35fe3368c4cacaace6e00254af91`
- Aceita instalação limpa, atualização da V2 anteriormente aprovada (blob `a9336cfbccdf91c7b7b9edde35075ac45a0fcaac`) e atualização da V4 (blob `c2a627479cc627928313bd6b30b1abcecdb1d34e`).
- Recusa um gerador preexistente desconhecido, verifica SQLite em leitura, preserva o HTML anterior até validação do novo snapshot e mantém backup para rollback. Verifica marcadores do CSV seguro e da ordenação numérica no HTML produzido.

A instalação **não foi realizada na VPS nesta rodada**. O acesso Desktop Commander havia atingido a franquia mensal e não foi usado nem contornado; o V5 é um instalador para execução no Insano com o alias SSH previamente autorizado.

### Comandos no PowerShell do Insano

Verificação sem substituir arquivos administrativos:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Instalar_e_Abrir_Painel_Retro_v5.ps1" -Verificar
```

Se aprovada, instalação/atualização e abertura da cópia privada:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Instalar_e_Abrir_Painel_Retro_v5.ps1"
```

O HTML privado local fica em `%LOCALAPPDATA%\ProximaEra\RetroDashboard\retro-dashboard.html` e continua offline. A atualização não cria API pública nem altera o portal Retro, APK/ZIP, Nginx ou a coleta SQLite.

## QA realizado

1. `python3 tests/test_retro_dashboard_installer_v5.py` via `RETRO_V5_SCRIPT=...`: **13/13 cenários isolados aprovados no container local**, sem VPS, incluindo atualizações e restaurações de ambas as versões conhecidas.
2. Conferência exata dos blobs Git da V5: instalador `6e907e43fe8c46e55e0f38c82396b3df8b3a1e3a`; suíte de instalação `8e3ba3b4876d2b274717d1a77561eeff7ad77498`. Iguais aos arquivos locais testados.
3. JavaScript extraído da template Python **compilou em V8**, sem erro de sintaxe.
4. Execução funcional do JS real com DOM simulado: **ordenação numérica, filtro Windows sem segmento Android, janela de 30 dias, dias vazios, CSV com fórmula neutralizada e aspas preservadas**.
5. Incluídos `tests/retro-dashboard-browser.test.cjs` e teste de compilação do JS renderizado na suíte Python. Esses testes versionados ainda devem ser executados num checkout integral ou na homologação do Insano; os testes acima foram realizados diretamente sobre o código recuperado do GitHub e em ambiente local isolado.

### Critérios de aceite pós-instalação

A execução real deverá confirmar retorno `PREFLIGHT_OK` no modo -Verificar, criação do HTML com código de saída 0, abertura do navegador sem erro de JS, filtros 7/30/90, exportação CSV local sem célula-fórmula e arquivo privado fora do webroot. **Não interpretar requisições HTTP como instalações ou usuários únicos**.
