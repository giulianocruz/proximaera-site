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
form?.addEventListener('submit', function(e) {
  e.preventDefault();
  const f = new FormData(this);
  const subject = '[Próxima Era] ' + f.get('subject');
  const context = origem ? `\nOrigem: ${origem}${guia ? ` / Guia ${guia}` : ''}${tema ? ` / ${tema}` : ''}\n` : '';
  const body = `Nome: ${f.get('name')}\nE-mail: ${f.get('email')}\n${context}\n${f.get('message')}`;
  location.href = 'mailto:proximaeradigital@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
});
