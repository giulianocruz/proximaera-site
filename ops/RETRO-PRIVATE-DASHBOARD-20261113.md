# Painel administrativo privado — Próxima Era Retro

## O que faz
O gerador ops/retro-dashboard-private.py produz HTML **offline** a partir dos contadores persistentes no SQLite do Retro na VPS. Mostra completos prováveis, iniciados, Android/Windows, gráfico por dia, filtros de 7/30/90 dias, versões, origem e exportação CSV.

Fontes, requisições ao portal e aberturas opt-in mostram a **janela completa de 90 dias** da geração. Já os KPIs, barras, versão e CSV respondem aos filtros na página. Os dias são dias-calendário de São Paulo, não janelas móveis de 24 horas.

O arquivo não possui chamadas de rede, rastreamento, cookies nem dependências externas. Restrições CSP, noindex e gravação em diretório privado impedem exposição acidental; a segurança efetiva depende de manter o arquivo fora do webroot.

## Execução na VPS autorizada
O gerador deve ficar em /opt/proximaera/tools/retro-dashboard-private.py, ao lado de retro-download-report.py, e pode ser executado:

    python3 /opt/proximaera/tools/retro-dashboard-private.py

Ele gera, de forma atômica, um HTML privado em /opt/proximaera/tools/private-reports/retro-dashboard.html. O diretório tem permissões 0700 e o arquivo 0600. Não há HTTP público, senha adicional nem cron novo.

No Insano, execute a partir do checkout atualizado:

    powershell -ExecutionPolicy Bypass -File .\ops\retro-dashboard-open.ps1 -Open

O script atualiza a fotografia na VPS e a copia pelo SSH autorizado em Base64, sem depender de SCP. O arquivo fica em Documents\ProximaEraRetroDashboard\retro-dashboard.html e funciona sem conexão externa. Sem o parâmetro -Open, ele apenas atualiza a cópia.

## Interpretação e privacidade
- Requisições completas prováveis significam GET HTTP 200 com corpo suficiente para o tamanho esperado, NÃO instalações, clientes ou usuários únicos.
- Requisições ao portal e abertura opt-in também NÃO são visitantes/usuários únicos. Testes internos podem estar incluídos.
- O banco já tinha agregação incremental a cada cinco minutos e backup diário. Nenhuma rotina de coleta foi criada ou modificada.
- O dashboard não altera o banco SQLite, o Nginx, o APK, o ZIP, anúncios ou o site público.
- Não compartilhe a cópia local em pastas públicas ou sincronizadas sem revisar permissões.

## Verificações

    python3 -m unittest discover -s tests -p test_retro_dashboard_private.py -v

Os testes verificam geração offline, segurança do JSON embutido, quatro filtros relevantes, escrita atômica, permissões, rejeição de diretórios externos e bloqueio de symlink. A renderização real do SQLite foi testada na VPS antes da implantação.

## Instalador V2 versionado (sem acesso remoto automático)

O instalador completo está no repositório como `ops/Instalar_e_Abrir_Painel_Retro_v2.ps1`. Ele usa apenas o alias SSH já autorizado (`proximaera-vps`), autenticação em lote e verificação estrita da chave de host. Baixa o gerador de um **commit Git fixo `07fe9083c93fe2ffee4e886972558469cbe750dd`**, confere o blob Git `a9336cfbccdf91c7b7b9edde35075ac45a0fcaac`, não substitui instalação divergente, gera o HTML fora do webroot e copia a fotografia para o Insano sem SCP. O gerador não está comprovadamente instalado até a execução desse script e verificação de seu resultado.

Para executar a partir da pasta do checkout:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\ops\Instalar_e_Abrir_Painel_Retro_v2.ps1

Para instalar/atualizar sem abrir automaticamente o navegador, acrescente `-NaoAbrir`. O script não gera números de produção fictícios, não modifica os dados do SQLite e não inicia serviços de terceiros.

Uma prévia HTML demonstrativa foi criada e testada em Chromium/Playwright nas larguras **375, 768 e 1440 px**, incluindo filtros 7/30 dias, Android/Windows, exportação CSV e overflow. Essa prévia usa **números fictícios** e não é evidência de instalação real na VPS.
