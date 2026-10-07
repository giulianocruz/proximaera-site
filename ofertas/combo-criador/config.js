window.PE_OFFER = {
  slug: "combo-criador",
  status: "active",
  brand: "Próxima Era Ofertas",
  eyebrow: "SUPER OFERTA • LOTE DE LANÇAMENTO",
  title: "Google AI Pro + Canva no Combo Criador",
  subtitle: "IA para pesquisar e produzir. Canva para criar e comunicar. Neste lote especial, leve os dois no mesmo pedido por R$ 69,90.",
  highlights: ["Google AI Pro por 18 meses + 5 TB", "Canva Pro 12 meses + Pro+ 60 dias", "Somente 3 unidades neste lote", "Pagamento via Pix pelo Mercado Pago"],
  priceCents: 6990,
  compareAtCents: 100000,
  stock: null,
  triggers: { lowStockThreshold: 3, stickyIntent: true, recentProof: true },
  soldOutFallback: {
    url: "/ofertas/google-ai-pro/?combo=1&utm_source=site&utm_medium=fallback&utm_campaign=combo_lancamento_esgotado",
    label: "Lote de R$ 69,90 encerrado — levar por R$ 79,90 →",
    title: "As 3 unidades promocionais acabaram. O combo continua disponível por R$ 79,90.",
    stockLabel: "Lote de R$ 69,90 encerrado • combo continua por R$ 79,90"
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
    { icon: "/ofertas/assets/step-select.png", title: "Garanta uma das 3 unidades", text: "Enquanto houver disponibilidade, o checkout mantém o preço especial de R$ 69,90." },
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
    ["Por que o combo está R$ 69,90?", "É a condição especial do lote de lançamento, limitada a 3 unidades. Depois disso, o combo continua disponível pelo valor padrão de R$ 79,90."],
    ["Posso comprar os produtos separadamente?", "Sim. Google AI Pro continua disponível por R$ 49,90 e Canva por R$ 39,90 nas páginas individuais."],
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
    labelWhenDisabled: "Verificando disponibilidade..."
  }
};