# Agente Editorial Local — Próxima Era

Objetivo: construir autoridade orgânica em Botucatu/SP com conteúdo útil sobre tecnologia aplicada a pequenos negócios.

## Pipeline
1. Seleciona somente pauta marcada `autopublish=true` e ainda não usada.
2. Usa título, meta e plano editorial previamente curados quando disponíveis.
3. Prioriza conteúdo editorial aprovado por seção; IA local fica como apoio de rascunho.
4. Aplica regras semânticas e de qualidade por seção e no artigo completo.
5. Mantém fontes explícitas quando a pauta depende de fatos externos.
6. Publica HTML, índice, feed, RSS e sitemap somente após aprovação.
7. Quando a fila segura termina, para sem reciclar pautas nem improvisar conteúdo.

## Regras de segurança editorial
- Não inventar estatísticas, rankings, pesquisas, fatos locais ou funções de plataformas.
- Não prometer posição, faturamento, conversão, alcance ou crescimento.
- Não usar keyword stuffing nem nomenclatura obsoleta de plataformas.
- Dados sensíveis e decisões de alto impacto ficam fora da automação editorial.
- Rascunhos reprovados vão para quarentena; falha significa não publicar.

## Produção
Cron ativo em `America/Sao_Paulo`: segunda, quarta e sexta às 07:17.
Conteúdo persistente: `/opt/proximaera-editorial/public`.
