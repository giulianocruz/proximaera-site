'use strict';
/* Formulário de diagnóstico: não grava PII no site e NÃO confirma um lead automaticamente.
 * Somente abre uma mensagem pré-preenchida; a pessoa precisa enviá-la no WhatsApp.
 */
(()=>{
  const form=document.getElementById('diagnosticForm');
  if(!form)return;
  const destination='5514998193831';
  const error=document.getElementById('formError');

  function read(id,max=140){
    const field=document.getElementById(id);
    return String(field?.value||'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
  }
  function tag(value){
    return String(value||'').replace(/[^a-zA-Z0-9_.\-]/g,'').slice(0,60);
  }
  function campaignContext(){
    const p=new URLSearchParams(window.location.search);
    const get=(key)=>{
      let value=p.get(key)||'';
      if(!value){try{value=window.sessionStorage.getItem('pe_'+key)||''}catch{}}
      return tag(value);
    };
    return {source:get('utm_source'),medium:get('utm_medium'),campaign:get('utm_campaign'),content:get('utm_content')};
  }
  function createMessage(data){
    const lines=[
      'Olá! Quero solicitar o DIAGNÓSTICO DIGITAL GRATUITO da Próxima Era.',
      '',
      'Meu nome: '+data.owner,
      'Negócio: '+data.business,
      'Ramo: '+data.segment,
      'Presença atual: '+data.presence,
      'Prioridade: '+data.goal
    ];
    if(data.profile)lines.push('Perfil/site: '+data.profile);
    if(data.challenge)lines.push('Minha dificuldade: '+data.challenge);
    lines.push('', 'Entendi que a análise inicial é gratuita, feita por uma pessoa e pode trazer até 3 orientações, sem compromisso de contratação.');
    const source=campaignContext();
    if(source.source)lines.push('Origem: '+source.source);
    if(source.medium)lines.push('Canal: '+source.medium);
    if(source.campaign)lines.push('Campanha: '+source.campaign);
    if(source.content)lines.push('Criativo: '+source.content);
    const ref=String(window.PETracking?.reference||'').replace(/[^A-Z0-9-]/g,'').slice(0,20);
    if(ref)lines.push('Referência: '+ref);
    return lines.join('\n');
  }

  // Conserva apenas UTMs permitidas ao navegar para os planos; nunca repassa PII ou fbclid.
  (()=>{
    const params=new URLSearchParams(window.location.search);
    const keys=['utm_source','utm_medium','utm_campaign','utm_content'];
    const clean=new URLSearchParams();
    for(const key of keys){
      const value=tag(params.get(key));
      if(value)clean.set(key,value);
    }
    clean.set('utm_referral','diagnostico_gratuito');
    const next=document.querySelector?.('a[data-track="diagnostico-ver-planos"]');
    if(next){
      const original=next.getAttribute('href')||'../fecha-negocio/';
      const separator=original.includes('?')?'&':'?';
      next.setAttribute('href',original+separator+clean.toString());
    }
  })();
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const data={
      owner:read('owner',70),business:read('business',80),segment:read('segment',60),
      presence:read('presence',70),goal:read('goal',70),profile:read('profile',140),
      challenge:read('challenge',280)
    };
    if(!data.owner||!data.business||!data.segment||!data.presence||!data.goal){
      error.textContent='Preencha os campos obrigatórios para continuar.';
      error.hidden=false;return;
    }
    error.hidden=true;
    const url='https://wa.me/'+destination+'?text='+encodeURIComponent(createMessage(data));
    // Somente registra intenção; envio efetivo e qualificação dependem do WhatsApp.
    try{window.PETracking?.send?.('diagnostic_intent','diagnostic:whatsapp_request')}catch{}
    try{
      if(window.localStorage?.getItem('pe_marketing_consent')==='granted'){
        if(typeof window.gtag==='function')window.gtag('event','diagnostic_whatsapp_intent',{method:'whatsapp'});
        if(typeof window.fbq==='function')window.fbq('trackCustom','DiagnosticWhatsAppIntent',{content_name:'Diagnostico Gratuito'});
      }
    }catch{}
    try{window.location.assign(url)}catch{
      error.hidden=false;
      error.textContent='Não foi possível abrir o WhatsApp. Use o link de contato no fim da página.';
    }
  });
})();
