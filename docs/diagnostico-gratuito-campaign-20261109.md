# Campanha — Diagnóstico digital gratuito | Próxima Era

Atualização: 2026-11-09. Landing: https://proximaera.com.br/diagnostico-gratuito/

## Proposta de valor

"Seu negócio é bom. Seu digital mostra isso?"

A análise inicial é gratuita, feita por uma pessoa, com até 3 recomendações de melhoria da apresentação digital. Não há garantia de vendas, posicionamento ou número de clientes. A contratação posterior é opcional.

O formulário prepara uma mensagem para o WhatsApp particular +55 14 99819-3831. **O site não armazena os campos, não envia um cadastro automaticamente e não envia a mensagem sem a confirmação do usuário no WhatsApp.** Até existir backend de leads, a gestão é manual.

## Anúncio sugerido — versão principal

- Título: **Seu negócio transmite confiança online?**
- Texto: **Você sabe o que um cliente encontra quando pesquisa pelo seu negócio? A Próxima Era oferece um diagnóstico digital inicial gratuito, com até 3 recomendações para melhorar a apresentação da sua empresa. Responda algumas perguntas, converse com nosso atendimento e decida seus próximos passos. Sem obrigação de contratar.**
- CTA: **Saiba mais**
- Destino: https://proximaera.com.br/diagnostico-gratuito/?utm_source=meta&utm_medium=paid_social&utm_campaign=pe_diagnostico_gratuito_nov2026&utm_content=primeira_impressao
- Visual 4:5: empresa apresentada em um smartphone, fundo verde-escuro da Próxima Era, hierarquia de texto "Seu negócio é bom." / "Seu digital mostra isso?", selo "Diagnóstico inicial gratuito" e a chamada discreta "Até 3 recomendações". Sem falsos depoimentos, resultados, prêmios ou contadores.
- Variação de texto B: **Sua empresa pode estar perdendo oportunidades na primeira impressão. Descubra por onde melhorar sua presença digital com uma análise inicial gratuita. Sem compromisso de compra.**
- Variação de texto C: **Seu Instagram explica o que você faz? O cliente encontra seu WhatsApp? Receba até 3 orientações iniciais para apresentar melhor seu negócio na internet.**

## Pré-lançamento

- Conta: confirmar identidade (página Facebook autorizada) e permissões para gerenciamento.
- Objetivo sugerido: **tráfego**, otimizando **visualizações da página de destino**; não otimizar vendas fictícias nem "Leads" enquanto não houver sinal confiável de lead confirmado.
- Região de teste sugerida: Botucatu/SP e arredores, com expansão posterior conforme respostas qualificadas.
- Orçamento sugerido: R$ 10/dia por três dias (R$ 30 no total), **sujeito a confirmação explícita antes de ativação**.
- **Não ativar automaticamente:** a conexão Supermetrics retornou período de teste expirado; não declarar campanhas criadas.
- Não usar a alegação "sorteio de site" sem a autorização promocional aplicável.

## Operação manual

1. Pessoa preenche o formulário e **confirma** o envio pelo WhatsApp.
2. Atendimento responde e registra apenas as solicitações realmente recebidas, com origem/campanha/referência que vierem na mensagem.
3. Revisar atividade, presença e prioridade; enviar até 3 recomendações iniciais de forma realista e individualizada.
4. Perguntar se a pessoa deseja ver uma prévia dos modelos e planos. Se houver interesse, apresentar /fecha-negocio/ com preço e condições.
5. Contabilizar separadamente: visualizações de landing, cliques de intenção, **mensagens recebidas confirmadas**, oportunidades qualificadas, propostas e vendas pagas. Não classificar clique como lead real.

## Privacidade

Os campos são processados apenas em memória do navegador para gerar a URL de mensagem ao WhatsApp. A política de privacidade deve estar acessível. GA4 e Meta Pixel da página carregam apenas após consentimento de marketing; o consentimento de tratamento das informações da mensagem é separado. Não enviar nome, empresa ou texto livre a eventos do pixel ou analytics.

## Testes e publicação

- `node --test tests/diagnostico-gratuito.test.cjs` valida formulário, consentimento e UTMs.
- `node tests/tracking-offers-consent.test.cjs` valida tags de marketing.
- `ops/deploy-diagnostic-20261109.py --check` e `--apply` publicam somente os arquivos previstos, com backup e rollback.
