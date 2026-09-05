const form = document.getElementById('contactForm');
const params = new URLSearchParams(location.search);
const origem = params.get('origem') || '';
const tema = params.get('tema') || '';
const guia = params.get('guia') || '';
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

function emailFallback(data) {
  const subject = '[Próxima Era] ' + data.subject;
  const context = data.origem ? `\nOrigem: ${data.origem}${data.guia ? ` / Guia ${data.guia}` : ''}${data.tema ? ` / ${data.tema}` : ''}\n` : '';
  const extras = `${data.company ? `Empresa: ${data.company}\n` : ''}${data.phone ? `Telefone: ${data.phone}\n` : ''}`;
  const body = `Nome: ${data.name}\n${extras}E-mail: ${data.email}\n${context}\n${data.message}`;
  location.href = 'mailto:contato@proximaera.com.br?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}
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
    website:String(f.get('website') || '').trim(), origem, tema, guia
  };
  button.disabled = true; button.textContent = 'Enviando…'; setStatus('Registrando seu contato com segurança…');
  try {
    const r = await fetch('/api/contact', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data)});
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || 'Falha no envio');
    setStatus('Recebemos sua mensagem. O contato já entrou na nossa central comercial.', 'success');
    this.reset();
  } catch (error) {
    setStatus('A central não respondeu agora. Vamos abrir seu e-mail com a mensagem pronta para você não perder o contato.', 'warning');
    setTimeout(() => emailFallback(data), 450);
  } finally {
    button.disabled = false; button.textContent = 'Enviar mensagem →';
  }
});
