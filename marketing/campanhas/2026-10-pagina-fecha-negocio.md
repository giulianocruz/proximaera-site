# Campanha — Página Fecha Negócio (Meta Ads)

**Responsável:** Próxima Era — Botucatu/SP  
**Status:** preparação; **NÃO PUBLICADA** em 30/09/2026.  
**Oferta prioritária:** Plano Profissional por **R$ 79,90**, pagamento único; cliente aprova antes de pagar. Plano Free e Premium continuam disponíveis no site.

## 1. Configuração inicial

- Plataforma: Meta Ads, Facebook e Instagram.
- Objetivo: Tráfego, com otimização para visualizações da página de destino, **se a interface disponibilizar**.
- Nome: `PE | Página Fecha Negócio | Tráfego | 2026-10`.
- 1 campanha, 1 conjunto, 1 anúncio principal; adaptar criativo a Feed (1080×1350) e Stories/Reels (1080×1920).
- Abrangência geográfica: **Brasil inteiro**, sem limitar a Botucatu/SP ou ao interior paulista; o site presta atendimento nacional. Todos os gêneros, adultos 24–55 como ponto de partida ajustável pela plataforma, sem pulverizar a verba entre estados/cidades.
- Orçamento: começar com média R$ 5/dia **somente quando houver disponibilidade de caixa**.
- Teto de experimento: R$ 35 acumulados; **não usar orçamento diário sozinho como proteção**, pois a Meta pode variar o gasto. Configurar limite rígido pertinente e conferir as campanhas que o compartilham. Pausar manualmente se o controle não estiver disponível.
- Antes de ativar, auditar e pausar as campanhas antigas que **não devam permanecer ativas**; preservar histórico, não excluir.

## 2. Página de destino e rota de conversão

**URL principal:** https://proximaera.com.br/fecha-negocio/  
**URL com atribuição:** https://proximaera.com.br/fecha-negocio/?utm_source=facebook&utm_medium=paid_social&utm_campaign=pagina_fecha_negocio_202610&utm_content=criativo_01_aprova

**WhatsApp da empresa:** +55 14 99642-8874 (`https://wa.me/5514996428874`).

A campanha usa segmentação nacional; evitar promessas de atendimento exclusivamente local no criativo. A URL com UTM aponta para uma variação do cabeçalho com o preço Profissional e CTA direto para o WhatsApp. A variação foi preparada em `fecha-negocio/experiment.js` em 30/09/2026. **Deploy em produção ainda não confirmado**; verificar se o arquivo público contém `anuncio_profissional` antes da ativação. Preserve a home orgânica e o Free.

O rastreamento existente em `/tracking.js` registra UTMs, visualização, cliques e insere contexto na mensagem WhatsApp. Um clique de WhatsApp não é necessariamente mensagem enviada nem venda: conferir conversas recebidas manualmente.

## 3. Criativo e cópia

**Texto principal:**
> Seu negócio merece uma apresentação profissional! 🚀
>
> Com a Página Fecha Negócio, a Próxima Era cria uma página para apresentar seus serviços, reunir contatos e levar clientes diretamente ao WhatsApp.
>
> **Plano Profissional por R$ 79,90, pagamento único.**
> Você confere sua página antes de pagar.
>
> Clique em **Saiba mais** e conheça os planos disponíveis.

**Título:** Sua página profissional por R$ 79,90  
**Descrição:** Você aprova antes de pagar  
**Botão:** Saiba mais  
**Identidade:** fundo #061018; acento #61F58B; marca oficial P com órbita, não monograma PE.  
**Arquivos de arte:** preparados na conversa; atualizar local/URL quando publicados.

## 4. Verificação antes de publicar

- [ ] Confirmar que as peças correspondem ao texto, ao preço e ao site publicado.
- [ ] Confirmar que os links e mensagens usam o WhatsApp correto.
- [ ] Testar URL UTM com o aparelho e com navegador anônimo.
- [ ] Confirmar execução dos eventos sem contar clique como venda.
- [ ] Confirmar status e gastos das campanhas antigas (pausar apenas as desejadas).
- [ ] Validar forma de pagamento, teto de gasto e data de término.
- [ ] Verificar prévias do Feed/Stories, legibilidade e botão.
- [ ] Publicar somente quando o caixa puder cobrir a despesa.
- [ ] Registrar gasto acumulado, visitas, cliques WhatsApp, conversas, orçamentos e vendas.

## 5. Regras de análise

**Métrica principal:** vendas efetivas e contribuição após custo da produção e mídia. Métricas auxiliares: visitas, CTR, cliques WhatsApp, conversas iniciadas e orçamentos.

**Sem investimento automático:** aumentar, reativar ou renovar somente após conferência do orçamento e das conversões. Evitar concorrência de múltiplas campanhas com verba muito pequena.

## 6. Aprendizado comercial e prevenção de inadimplência

- Histórico relatado pelo proprietário: **R$ 21 de mídia geraram uma negociação pelo plano de R$ 367**, mas a cliente deixou de responder depois de a página estar pronta e **nenhum recebimento foi confirmado**. Não registrar essa oportunidade como venda paga nem como retorno sobre mídia.
- Etapas do CRM: **Contato → Qualificado → Prévia preparada → Prévia aprovada → Pagamento confirmado → Publicado/Entregue**.
- Oferecer **prévia de aprovação** com acesso limitado; não liberar a página definitiva, domínio oficial, código/arquivos finais ou publicação irreversível antes de receber. Se houver necessidade de trabalhos personalizados significativos, negociar escopo e sinal por escrito antes, sem alterar a promessa de pagamento após aprovação do plano padrão sem atualizar a oferta.
- Acompanhar separadamente o custo por lead, o custo por cliente **efetivamente pago**, a receita recebida e as horas de produção.
- Ao preparar a campanha, o editor da Meta mostrou um rascunho com **R$ 10/dia**, teto possível exibido **R$ 17,50 em um dia**, e WhatsApp vinculado **EliteWP +55 14 92007-7743**. Corrigir o orçamento e a identidade/número de WhatsApp antes de publicar; o telefone correto é **+55 14 99642-8874**.
- Verificação do repositório em 30/09/2026: os links do index da página no GitHub ainda apontavam ao número antigo, enquanto a página **já publicada** apontava ao novo. Os **sete links no repositório foram corrigidos** e a redação do fluxo de aprovação/pagamento esclarecida; **deploy da versão do repositório ainda não confirmado**.

## 7. Situação técnica em 30/09/2026

- O site público já contém WhatsApp +55 14 99642-8874 e rastreamento UTM.
- A variação paga `anuncio_profissional` foi commitada no repositório, mas não identificada ainda na cópia pública de `experiment.js`.
- O Gerenciador de Anúncios estava aberto no navegador remoto; **não foi possível validar de forma segura todo o limite de gastos, a configuração e o criativo na interface; campanha nova não foi veiculada**.
