const form = document.getElementById('contactForm');
const params = new URLSearchParams(location.search);
const origem = params.get('origem') || '';
const tema = params.get('tema') || '';
const guia = params.get('guia') || '';
const assunto = params.get('assunto') || '';
const getSession = key => { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } };
const referrerHost = (() => { try { return document.referrer ? new URL(document.referrer).hostname : ''; } catch { return ''; } })();
const acquisition = {
  topicId:getSession('pe_last_topic') || 'sales:contact', guide:getSession('pe_source') || getSession('pe_utm_source') || referrerHost || 'direto',
  path:getSession('pe_last_cta_path') || location.pathname, referrerHost,
  source:getSession('pe_source') || getSession('pe_utm_source'), medium:getSession('pe_utm_medium'), campaign:getSession('pe_utm_campaign'),
  content:getSession('pe_utm_content'), term:getSession('pe_utm_term'), entry:getSession('pe_entry_path') || location.pathname,
  cta:getSession('pe_last_cta')
};
const topicLabels = {
  'presenca-google':'presença local no Google','site-ou-instagram':'site e Instagram','whatsapp-organizado':'atendimento pelo WhatsApp',
  'automacao-escritorio':'automação da rotina','ia-comercio-servicos':'uso prático de IA','checklist-digital':'organização da presença digital',
  'site-converte':'site e geração de contatos','perfil-google':'Perfil da Empresa no Google','processos-planilha':'processos e planilhas',
  'catalogo-digital':'catálogo, página de vendas ou loja virtual','seguranca-basica':'segurança digital','medir-contatos':'medição de contatos pelo site',
  'google-maps':'presença no Google Maps','conteudo-local':'conteúdo local','diagnostico':'organização digital do negócio'
};

function setStatus(message, kind='info') {
  const el = document.getElementById('contactStatus');
  if (!el) return;
  el.textContent = message;
  el.dataset.kind = kind;
}

function fallbackMessage(data) {
  const context = data.origem ? `\nOrigem: ${data.origem}${data.guia ? ` / Guia ${data.guia}` : ''}${data.tema ? ` / ${data.tema}` : ''}\n` : '';
  const extras = `${data.company ? `Empresa: ${data.company}\n` : ''}${data.phone ? `Telefone: ${data.phone}\n` : ''}`;
  return `[Próxima Era] ${data.subject}\nNome: ${data.name}\n${extras}E-mail: ${data.email}\n${context}\n${data.message}`;
}

function showFallbackOptions(data, manual = false) {
  const status = document.getElementById('contactStatus');
  if (!status) return;
  status.replaceChildren();
  status.dataset.kind = manual ? 'info' : 'warning';
  const text = document.createElement('span');
  text.textContent = manual
    ? 'Sua mensagem está preparada, mas ainda não foi enviada. Escolha WhatsApp ou e-mail e confirme o envio no aplicativo escolhido: '
    : 'A central comercial está indisponível. Sua mensagem não foi registrada automaticamente. Escolha um canal para enviá-la: ';
  status.append(text);
  const appendLink = (href, label) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    link.style.fontWeight = '900';
    link.style.textDecoration = 'underline';
    link.style.marginLeft = '8px';
    status.append(link);
  };
  const message = fallbackMessage(data);
  const whatsapp = document.querySelector('.contact-aside a[href*="wa.me/"]');
  if (whatsapp) {
    try {
      const url = new URL(whatsapp.href);
      if (url.protocol === 'https:' && url.hostname === 'wa.me') {
        url.searchParams.set('text', message);
        appendLink(url.toString(), 'Enviar pelo WhatsApp');
      }
    } catch {}
  }
  appendLink('mailto:contato@proximaera.com.br?subject=' +
    encodeURIComponent('[Próxima Era] ' + data.subject) +
    '&body=' + encodeURIComponent(message), 'Enviar por e-mail');
}
if (form && assunto === 'editorial') { const select=form.querySelector('[name="subject"]'); if(select){ const option=[...select.options].find(o=>o.textContent==='Projeto editorial / publicação'); if(option) select.value=option.value; } }

if (form && origem === 'botucatu') {
  const select = form.querySelector('[name="subject"]');
  const message = form.querySelector('[name="message"]');
  const label = topicLabels[tema] || 'tecnologia aplicada ao meu negócio';
  if (select) {
    let option = [...select.options].find(o => o.value === 'Quero conversar sobre meu negócio local');
    if (!option) { option = new Option('Quero conversar sobre meu negócio local'); select.add(option); }
    select.value = option.value;
  }
  if (message && !message.value) {
    const ref = guia ? `Guia Local ${guia} — ${label}` : label;
    message.value = `Olá, cheguei pela área Botucatu em modo digital (${ref}).\n\nQuero conversar sobre como isso se aplica ao meu negócio. Meu contexto é: `;
  }
  const note = document.createElement('div');
  note.className = 'contact-context';
  note.innerHTML = `<strong>Você veio de Botucatu em modo digital.</strong><span>Já deixamos o contexto do conteúdo na mensagem. Complete apenas o que está acontecendo no seu negócio.</span>`;
  form.prepend(note);
}

form?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const button = this.querySelector('button[type="submit"]');
  const f = new FormData(this);
  const data = {
    name:String(f.get('name') || '').trim(), company:String(f.get('company') || '').trim(), phone:String(f.get('phone') || '').trim(),
    email:String(f.get('email') || '').trim(), subject:String(f.get('subject') || '').trim(), message:String(f.get('message') || '').trim(),
    website:String(f.get('website') || '').trim(), origem, tema, guia, acquisition
  };
  // O ERP implantado ainda não oferece /api/public-contact. Não anunciar captura automática.
  // Somente habilitar após validar a API e marcar <html data-contact-crm="enabled">.
  if (document.documentElement.dataset.contactCrm !== 'enabled') {
    showFallbackOptions(data, true);
    return;
  }
  button.disabled = true; button.textContent = 'Enviando…'; setStatus('Registrando seu contato com segurança…');
  try {
    const r = await fetch('/api/contact', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data)});
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || 'Falha no envio');
    setStatus('Recebemos sua mensagem. O contato já entrou na nossa central comercial.', 'success');
    this.reset();
  } catch (error) {
    showFallbackOptions(data);
  } finally {
    button.disabled = false; button.textContent = 'Enviar mensagem →';
  }
});
