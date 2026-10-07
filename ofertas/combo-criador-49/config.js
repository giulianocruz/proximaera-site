window.PE_OFFER = {
  slug: "combo-criador-49",
  variant: "combo_49",
  status: "active",
  brand: "Próxima Era Ofertas",
  eyebrow: "OFERTA ESPECIAL • TESTE DE CAMPANHA",
  title: "Google AI Pro + Canva no Combo Criador",
  subtitle: "Google AI Pro por 18 meses + 5 TB e Canva Pro por 12 meses + Pro+ 60 dias no mesmo pedido. Nesta campanha, o combo completo está por R$ 49,90.",
  highlights: [
    "Google AI Pro por 18 meses + 5 TB",
    "Canva Pro 12 meses + Pro+ 60 dias",
    "Separados na campanha: R$ 89,80",
    "Combo especial: R$ 49,90 via Pix"
  ],
  priceCents: 4990,
  compareAtCents: 8980,
  stock: null,
  triggers: { lowStockThreshold: 3, stickyIntent: true, recentProof: true },
  soldOutFallback: {
    url: "/ofertas/combo-criador/?utm_source=site&utm_medium=fallback&utm_campaign=combo_49_encerrado",
    label: "Condição de R$ 49,90 encerrada — ver oferta atual →",
    title: "A condição especial desta campanha foi encerrada. Confira o valor atual do Combo Criador.",
    stockLabel: "Condição especial encerrada • consulte a oferta atual"
  },
  productVisual: "/ofertas/assets/combo-criador-hero.svg",
  productVisualMobile: "/ofertas/assets/combo-criador-hero.svg",
  heroBackground: "/ofertas/assets/hero-bg-desktop.jpg",
  heroBackgroundMobile: "/ofertas/assets/hero-bg-mobile.jpg",
  benefits: [
    { icon: "/ofertas/assets/icon-ai-credits.jpg", title: "Google AI Pro + Gemini", text: "Recursos de inteligência artificial para pesquisa, resumo, criação e produtividade." },
    { icon: "/ofertas/assets/icon-storage.jpg", title: "5 TB por 18 meses", text: "Mais espaço para arquivos, fotos, projetos e materiais de trabalho." },
    { icon: "/ofertas/assets/icon-video-ai.jpg", title: "Canva Pro por 12 meses", text: "Ferramentas premium para posts, apresentações, vídeos e materiais comerciais." },
    { icon: "/ofertas/assets/icon-notebook.jpg", title: "Canva Pro+ por 60 dias", text: "Período adicional com recursos avançados incluídos no pacote ofertado." },
    { icon: "/ofertas/assets/icon-fast.jpg", title: "Ativação assistida", text: "A Próxima Era acompanha o fluxo de ativação após a confirmação do pagamento." },
    { icon: "/ofertas/assets/icon-email.jpg", title: "Pedido registrado", text: "Nome, e-mail, WhatsApp, valor e status ficam vinculados ao número do pedido." }
  ],
  steps: [
    { icon: "/ofertas/assets/step-select.png", title: "Aproveite a condição da campanha", text: "Enquanto esta condição comercial estiver ativa, o checkout mantém o valor especial de R$ 49,90." },
    { icon: "/ofertas/assets/step-pix.png", title: "Pague via Pix", text: "O Mercado Pago gera um Pix individual para seu pedido." },
    { icon: "/ofertas/assets/step-confirm.png", title: "Confirmação automática", text: "O sistema acompanha o pagamento e atualiza o pedido sem depender de print." },
    { icon: "/ofertas/assets/step-activation.png", title: "Conclua as ativações", text: "Após a confirmação, fale com o suporte da Próxima Era para seguir com as ativações incluídas." }
  ],
  fulfillment: {
    whatsapp: "5514996428874",
    eta: "10 a 20 minutos",
    cutoffHour: 22,
    afterHours: "Pedidos realizados após as 22h serão atendidos no próximo período de atendimento."
  },
  faq: [
    ["Por que o combo está R$ 49,90?", "Estamos testando uma condição promocional específica desta campanha. Ela nos ajuda a medir a procura e aperfeiçoar o processo de atendimento e ativação sem esconder o valor do checkout."],
    ["Qual é a vantagem em relação aos produtos separados?", "Nesta campanha, Google AI Pro está anunciado por R$ 49,90 e Canva por R$ 39,90. Separados somam R$ 89,80; nesta variante, o Combo Criador está R$ 49,90."],
    ["Posso comprar os produtos separadamente?", "Sim. As ofertas individuais continuam disponíveis nas páginas próprias. Esta condição de R$ 49,90 existe apenas para o teste atual do Combo Criador."],
    ["O que está incluído?", "Google AI Pro por 18 meses + 5 TB e o pacote Canva Pro por 12 meses + Canva Pro+ por 60 dias, conforme as condições descritas nesta oferta."],
    ["Preciso enviar comprovante?", "Não. O pedido é registrado antes do Pix e o sistema acompanha a confirmação do Mercado Pago automaticamente."],
    ["E se eu fechar a página depois de pagar?", "O pedido permanece registrado e pode ser recuperado posteriormente com o e-mail e WhatsApp informados."],
    ["Quem presta o suporte?", "A Próxima Era atende pelo WhatsApp comercial (14) 99642-8874 e acompanha o fluxo da venda e ativação."]
  ],
  upsells: [],
  recentEndpoint: "/api/offers/recent",
  checkout: {
    enabled: false,
    endpoint: "/api/offers/order",
    labelWhenDisabled: "Verificando condição da campanha..."
  }
};
