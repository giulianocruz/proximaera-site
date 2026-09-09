const form = document.getElementById('leadForm');
const statusEl = document.getElementById('formStatus');
const getSession = key => { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } };

function setStatus(message, kind='info') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.kind = kind;
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const data = new FormData(form);
  const payload = {
    name: String(data.get('name') || '').trim(),
    company: String(data.get('company') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    email: String(data.get('email') || '').trim(),
    subject: 'Página Fecha Negócio — novo pedido',
    message: `Interesse na Página Fecha Negócio por R$ 79,90.\nNegócio: ${String(data.get('company') || '').trim()}\nO que vende/oferece: ${String(data.get('message') || '').trim()}\nCondição: cliente aprova antes do pagamento.`,
    website: '',
    origem: 'fecha-negocio',
    tema: 'PAGINA-FECHA-NEGOCIO',
    guia: '',
    acquisition: {
      topicId:'sales:fecha-negocio', guide:(getSession('pe_source')||getSession('pe_utm_source')||'direto').slice(0,20),
      path:'/fecha-negocio/', source:getSession('pe_source')||getSession('pe_utm_source')||'',
      medium:getSession('pe_utm_medium')||'', campaign:getSession('pe_utm_campaign')||'',
      content:getSession('pe_utm_content')||'', term:getSession('pe_utm_term')||'', entry:getSession('pe_entry_path')||'/fecha-negocio/'
    }
  };

  button.disabled = true;
  button.textContent = 'Enviando…';
  setStatus('Registrando seu pedido na Próxima Era…');

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'Falha no envio');
    setStatus('Pedido recebido. Vamos preparar o atendimento da sua Página Fecha Negócio.', 'success');
    form.reset();
  } catch (_) {
    setStatus('Não conseguimos registrar automaticamente agora. Vamos abrir seu e-mail com a solicitação pronta.', 'warning');
    const subject = '[Próxima Era] Página Fecha Negócio';
    const body = `Olá, quero minha Página Fecha Negócio por R$ 79,90.\n\nNome: ${payload.name}\nNegócio: ${payload.company}\nWhatsApp: ${payload.phone}\nE-mail: ${payload.email}\nO que vendo/ofereço: ${String(data.get('message') || '').trim()}`;
    setTimeout(() => { location.href = `mailto:contato@proximaera.com.br?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }, 500);
  } finally {
    button.disabled = false;
    button.textContent = 'Quero minha Página Fecha Negócio →';
  }
});