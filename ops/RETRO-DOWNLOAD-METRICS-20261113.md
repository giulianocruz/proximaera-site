# Próxima Era Retro — relatório privado de downloads persistentes

**Revisão:** 13/11/2026. Fonte oficial: SQLite do Nginx na VPS.

## Infraestrutura existente, não duplicar

A auditoria confirmou que já existia coleta persistente:
- **/opt/proximaera-retro-downloads/metrics/downloads.log**: eventos técnicos de APK/ZIP (sem IP, cookies ou navegador).
- **visits.log**: requisições à página Retro.
- **app-usage.log**: aberturas voluntárias dos aplicativos.
- **counters.sqlite3**: agregações por dia (fuso America/Sao_Paulo), versão, plataforma e origem, com offsets por inode/posição dos logs.
- **/etc/cron.d/proximaera-retro-download-metrics**: agregação a cada 5 minutos.
- **/etc/cron.d/proximaera-retro-metrics-backup**: backup diário às 03h10 UTC, pelo programa retro-metrics-backup.py.
- O programa retro-download-stats.py já faz deduplicação, lida com rotação e permite exportar CSV.

Os testes existentes qa-download-stats.py e qa-metrics-backup.py passaram na VPS (rotação, leitura incremental, linha parcial, permissões e integridade).

O relatório privado anterior procurava downloads apenas nos logs genéricos do Docker e por isso apresentou **zero requisições binárias observadas**. Isso era um recorte incompleto. O SQLite do Nginx é a fonte adequada.

## Relatório administrativo corrigido

O programa **ops/retro-download-report.py** consulta o SQLite com modo somente leitura e PRAGMA query_only. Não lê logs brutos, não duplica o coletor, não grava dados nem transmite informações de visitantes. A instalação administrativa é em **/opt/proximaera/tools/retro-download-report.py**, fora do site público.

Comandos na VPS autorizada:

    # Hoje, dia-calendário em São Paulo
    python3 /opt/proximaera/tools/retro-download-report.py --days 1

    # Últimos sete dias-calendário, incluindo hoje
    python3 /opt/proximaera/tools/retro-download-report.py --days 7

    # Dia específico, granularidade exata
    python3 /opt/proximaera/tools/retro-download-report.py --day 2026-11-13

    # Retrocompatibilidade; NÃO é janela móvel exata
    python3 /opt/proximaera/tools/retro-download-report.py --since 24h

A opção --since inclui dias-calendário que intersectam o período, podendo incluir horas extras do primeiro dia. O JSON declara exact_for_requested_window=false e a data inicial/final. Para relatórios precisos por dia, preferir --days N ou --day.

## Indicadores

- Downloads: respostas HTTP GET iniciadas, provavelmente completas (HTTP 200 e bytes), parciais e quantidade de bytes. **Não são instalações, clientes ou pessoas únicas**, e podem incluir homologações.
- Plataforma Android/Windows, dias, versões e origens fixas home/apps/other.
- Requisições do portal e eventos opt-in de abertura do aplicativo; não representam visitantes únicos.
- Estado da ingestão por diferença de bytes dos logs e offsets SQLite.
- Nome e contagem dos snapshots de backup privados, sem listar caminhos públicos.
- Nenhum IP, referrer, agente de navegador, cookie ou identificador pessoal aparece na saída.

## Primeira observação validada

No dia **13/11/2026** o SQLite tinha **2 respostas completas Android** e **2 Windows**, **27 requisições à página** e **2 aberturas voluntárias Android**, com origem marcada como other. Não há como atribuir essas respostas a visitantes externos; podem ser testes internos. O backup retro-metrics-2026-11-13.sqlite3 já existia.

## Testes e limites

    python3 -m unittest discover -s tests -p test_retro_download_report.py -v

Os testes usam bancos SQLite temporários e cobrem somente leitura, agregados, janelas diárias, offsets, backups e privacidade. O coletor mantém os dados persistentes, mas não existe histórico anterior à ativação da instrumentação. Não instalar outra coleta, outro cron ou contador público.

**Histórico:** PR #40 introduziu o primeiro relatório. Esta revisão corrige sua fonte de dados após auditar o coletor persistente já ativo.

## Implantação privada concluída e verificada

Em 13/11/2026 às 22h46 (horário de São Paulo), a versão corrigida foi instalada em **/opt/proximaera/tools/retro-download-report.py**. Permissões: **750**, propriedade root. SHA-256: **637e3a3b029217553ab522a1db75e0407d3d5e42ae9ec8bf680bc0e774a07981**. A versão anterior foi preservada em **/opt/proximaera/tools/backups/retro-download-report-before-sqlite-20261113.py**.

A execução real em modo somente leitura passou. A consulta de 13/11/2026 retornou quatro respostas completas (duas Android e duas Windows), 27 requisições à página e dois eventos opt-in de abertura Android. Todos os números continuam sujeitos à ressalva de testes internos e não representam instalações nem visitantes únicos. Havia 165 bytes pendentes de downloads.log e 38 de visits.log, aguardando o coletor quinquenal.

Foram confirmados **cinco testes Python** com bancos temporários e os cron jobs existentes: agregação a cada 5 minutos e backup às **03h10 UTC**, mantendo até 30 cópias diárias. O portal Retro, a página de versão e o catálogo responderam HTTP 200. O utilitário administrativo não foi exposto pela web (HTTP 404). **Nenhum novo cron, contador, API ou alteração na distribuição foi realizado.**

Para acesso rápido no Insano, em PowerShell: ssh proximaera-vps "python3 /opt/proximaera/tools/retro-download-report.py --days 1". Para sete dias, substituir por --days 7.
