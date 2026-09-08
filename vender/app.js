const PRODUCTS = {
  pagina: { name: 'Página Express', price: 79.90, code: 'PAGINA-EXPRESS' },
  clientes: { name: 'Primeiros Clientes', price: 29.90, code: 'PRIMEIROS-CLIENTES' },
  fecha: { name: 'Fecha Venda', price: 19.90, code: 'FECHA-VENDA' },
  divulgacao: { name: 'Divulgação Express', price: 19.90, code: 'DIVULGACAO-EXPRESS' },
  cobranca: { name: 'Cobrança Profissional', price: 19.90, code: 'COBRANCA-PRO' },
  comecar: { name: 'Comece a Vender', price: 29.90, code: 'COMECE-VENDER' }
};

const PAINS = {
  clientes: {
    title: 'Você precisa organizar sua prospecção.',
    copy: 'Se pouca gente chega até você, o primeiro passo é criar uma rotina simples para encontrar, abordar e acompanhar potenciais clientes.',
    bullets: ['Mensagens de abordagem', 'Follow-up sem improviso', 'Modelo de proposta', 'Base simples de precificação'],
    product: 'clientes'
  },
  sumiram: {
    title: 'Seu gargalo está entre o preço e o fechamento.',
    copy: 'Quando o cliente pede valor e desaparece, apresentar melhor a proposta e acompanhar a conversa pode reduzir oportunidades perdidas.',
    bullets: ['Proposta mais clara', 'Roteiro de fechamento', 'Follow-ups', 'Respostas a objeções'],
    product: 'fecha'
  },
  amador: {
    title: 'Sua presença comercial precisa parecer tão boa quanto seu trabalho.',
    copy: 'Depender apenas de mensagens e redes sociais pode deixar informações importantes espalhadas. Uma página própria organiza sua apresentação.',
    bullets: ['Página profissional', 'Serviços e contatos organizados', 'Visual pensado para celular', 'Estrutura comercial pronta'],
    product: 'pagina'
  },
  divulgar: {
    title: 'Você precisa de uma rotina simples de divulgação.',
    copy: 'O problema não é publicar o tempo todo. É saber o que dizer, para quem e com qual chamada para ação.',
    bullets: ['30 ideias de conteúdo', 'Textos de divulgação', 'Bio comercial', 'Chamadas para ação'],
    product: 'divulgacao'
  },
  cobranca: {
    title: 'Sua cobrança precisa virar processo, não constrangimento.',
    copy: 'Cobrar com clareza e consistência ajuda você a não esquecer valores e evita mensagens improvisadas em momentos delicados.',
    bullets: ['Sequência de lembretes', 'Mensagens profissionais', 'Controle simples', 'Modelo de acordo amigável'],
    product: 'cobranca'
  },
  comecar: {
    title: 'Você precisa transformar vontade em uma oferta concreta.',
    copy: 'Antes de pensar em logo ou anúncio, defina o que vender, por quanto, como apresentar e como começar a abordar pessoas.',
    bullets: ['Ideias de serviços', 'Precificação inicial', 'Oferta e apresentação', 'Materiais comerciais'],
    product: 'comecar'
  }
};

const PIX_KEY = '68964484000122';
const PIX_KEY_DISPLAY = '68.964.484/0001-22';
const PIX_PROVIDER = 'Mercado Pago';
const MERCHANT_NAME = 'PROXIMA DIGITAL';
const MERCHANT_CITY = 'BOTUCATU';
let selectedProduct = null;
let currentOrder = null;
let currentPixCode = '';

const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const field = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

function showPain(painKey) {
  const pain = PAINS[painKey];
  if (!pain) return;
  const product = PRODUCTS[pain.product];
  field('resultTitle', pain.title);
  field('resultCopy', pain.copy);
  field('resultProduct', product.name);
  field('resultPrice', money(product.price));
  const list = document.getElementById('resultBullets');
  list.innerHTML = pain.bullets.map(item => `<li>${item}</li>`).join('');
  const buy = document.getElementById('resultBuy');
  buy.dataset.product = pain.product;
  const panel = document.getElementById('resultPanel');
  panel.hidden = false;
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  localStorage.setItem('pe_vender_dor', painKey);
}

document.querySelectorAll('.pain-card').forEach(btn => btn.addEventListener('click', () => showPain(btn.dataset.pain)));
document.getElementById('changePain')?.addEventListener('click', () => {
  document.getElementById('resultPanel').hidden = true;
  document.querySelector('.pain-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

function openCheckout(productKey) {
  const product = PRODUCTS[productKey];
  if (!product) return;
  selectedProduct = productKey;
  currentOrder = null;
  currentPixCode = '';
  field('checkoutProduct', product.name);
  field('checkoutPrice', money(product.price));
  document.getElementById('checkoutFormStep').hidden = false;
  document.getElementById('pixStep').hidden = true;
  document.getElementById('orderStatus').textContent = '';
  const modal = document.getElementById('checkoutModal');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => modal.querySelector('input[name="name"]')?.focus(), 50);
}

function closeCheckout() {
  document.getElementById('checkoutModal').hidden = true;
  document.body.style.overflow = '';
}

document.querySelectorAll('.buy-trigger').forEach(btn => btn.addEventListener('click', () => openCheckout(btn.dataset.product)));
document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeCheckout));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCheckout(); });

document.getElementById('backToProducts')?.addEventListener('click', () => {
  closeCheckout();
  document.getElementById('solucoes')?.scrollIntoView({ behavior: 'smooth' });
});

function emv(id, value) {
  const text = String(value);
  return id + String(text.length).padStart(2, '0') + text;
}

function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function pixPayload(amount, txid) {
  const gui = emv('00', 'br.gov.bcb.pix');
  const key = emv('01', PIX_KEY);
  const merchantAccount = emv('26', gui + key);
  const additional = emv('62', emv('05', txid.slice(0, 25)));
  const base = [
    emv('00', '01'),
    merchantAccount,
    emv('52', '0000'),
    emv('53', '986'),
    emv('54', amount.toFixed(2)),
    emv('58', 'BR'),
    emv('59', MERCHANT_NAME.slice(0, 25)),
    emv('60', MERCHANT_CITY.slice(0, 15)),
    additional,
    '6304'
  ].join('');
  return base + crc16(base);
}

function orderId() {
  const stamp = Date.now().toString().slice(-10);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PE${stamp}${random}`.slice(0, 25);
}

async function registerOrder(data) {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: '',
        subject: `Pedido ${data.orderId} — ${data.product.name}`,
        message: `Novo pedido originado em /vender/.\nProduto: ${data.product.name}\nValor: ${money(data.product.price)}\nCódigo: ${data.product.code}\nPedido: ${data.orderId}\nPagamento: Pix CNPJ ${PIX_KEY_DISPLAY} — ${PIX_PROVIDER}\nOrigem: landing comercial Próxima Era`,
        website: '',
        origem: 'vender',
        tema: data.product.code,
        guia: ''
      })
    });
    return response.ok;
  } catch (_) {
    return false;
  }
}

function renderPix(order) {
  currentPixCode = pixPayload(order.product.price, order.orderId);
  field('pixProduct', order.product.name);
  field('pixAmount', money(order.product.price));
  document.getElementById('checkoutFormStep').hidden = true;
  document.getElementById('pixStep').hidden = false;

  let providerLine = document.getElementById('pixProvider');
  if (!providerLine) {
    providerLine = document.createElement('p');
    providerLine.id = 'pixProvider';
    providerLine.className = 'pix-note';
    document.querySelector('.pix-summary')?.insertAdjacentElement('afterend', providerLine);
  }
  providerLine.textContent = `Recebedor: Próxima Digital • Pix CNPJ ${PIX_KEY_DISPLAY} • ${PIX_PROVIDER}`;

  const qr = document.getElementById('qrCode');
  qr.innerHTML = '';
  if (window.QRCode) {
    new QRCode(qr, { text: currentPixCode, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
  } else {
    qr.innerHTML = '<p style="color:#111;text-align:center;max-width:220px">Use o botão “Pix Copia e Cola” abaixo.</p>';
  }
  const subject = `Comprovante ${order.orderId} — ${order.product.name}`;
  const body = `Olá, fiz o Pix do pedido ${order.orderId}.\n\nProduto: ${order.product.name}\nValor: ${money(order.product.price)}\nPagamento: Pix ${PIX_PROVIDER} / CNPJ ${PIX_KEY_DISPLAY}\nNome: ${order.name}\nE-mail: ${order.email}\n\nVou anexar o comprovante nesta mensagem.`;
  document.getElementById('confirmPayment').href = `mailto:contato@proximaera.com.br?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

document.getElementById('orderForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!selectedProduct) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const product = PRODUCTS[selectedProduct];
  const order = {
    orderId: orderId(),
    product,
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim(),
    phone: String(data.get('phone') || '').trim()
  };
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Preparando seu Pix…';
  field('orderStatus', 'Registrando seu pedido na Próxima Era…');
  const registered = await registerOrder(order);
  currentOrder = order;
  localStorage.setItem('pe_ultimo_pedido', JSON.stringify({ orderId: order.orderId, product: product.code, value: product.price, registered, createdAt: new Date().toISOString() }));
  renderPix(order);
  button.disabled = false;
  button.textContent = 'Gerar meu Pix →';
});

async function copyText(text, button, successText) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = successText;
    setTimeout(() => { button.textContent = original; }, 1800);
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

document.getElementById('copyPixCode')?.addEventListener('click', event => {
  const strong = event.currentTarget.querySelector('strong');
  copyText(currentPixCode, strong, 'Código copiado ✓');
});

document.getElementById('copyPixKey')?.addEventListener('click', event => copyText(PIX_KEY, event.currentTarget, 'Copiado ✓'));

const savedPain = localStorage.getItem('pe_vender_dor');
if (savedPain && PAINS[savedPain]) {
  document.querySelector(`[data-pain="${savedPain}"]`)?.classList.add('was-selected');
}
