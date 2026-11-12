'use strict';
(() => {
  const form = document.getElementById('peIntakeForm');
  if (!form) return;
  const status = document.getElementById('peIntakeStatus');
  const submit = form.querySelector('button[type="submit"]');
  const wa = 'https://wa.me/5514998193831';
  const validInterests = new Set(['Página comercial','Site premium','Aplicativo','Automação e IA','Diagnóstico digital','Ainda estou avaliando']);
  const safeUtm = name => {
    const v = new URLSearchParams(location.search).get(name);
    let s = v || '';
    try { if (!s) s = sessionStorage.getItem('pe_'+name) || ''; } catch {}
    return String(s).replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,80);
  };
  const feedback = (message,kind) => { status.textContent=message;status.dataset.kind=kind||'info'; };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    const values = new FormData(form);
    const name=String(values.get('name')||'').trim();
    const phone=String(values.get('phone')||'').trim();
    const interest=String(values.get('interest')||'').trim();
    const digits=phone.replace(/\D/g,'');
    if(name.length<2 || !/^[0-9+()\s.-]{10,24}$/.test(phone) || digits.length<10 || digits.length>13 || !validInterests.has(interest)){
      feedback('Confira o nome, WhatsApp com DDD e tipo de projeto.','error'); return;
    }
    const payload={
      name, phone, interest,
      company:String(values.get('company')||'').trim().slice(0,90),
      email:String(values.get('email')||'').trim().slice(0,140),
      privacyAccepted:values.get('privacyAccepted')==='on',
      marketingOptIn:false,
      source:'site-institucional',
      website:String(values.get('website')||''),
      details:{challenge:String(values.get('details')||'').trim().slice(0,280)},
      acquisition:{source:safeUtm('utm_source'),medium:safeUtm('utm_medium'),campaign:safeUtm('utm_campaign'),content:safeUtm('utm_content')}
    };
    if(!payload.privacyAccepted){feedback('Autorize o uso dos dados para responder sua solicitação.','error');return;}
    submit.disabled=true;submit.textContent='Registrando solicitação…';
    feedback('Enviando com segurança…','info');
    try {
      const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',cache:'no-store'});
      const result=await response.json().catch(()=>({}));
      if(!response.ok || !result.ok)throw new Error(String(result.error||'Não foi possível registrar.'));
      form.reset();
      feedback('Solicitação registrada! Nossa equipe poderá entrar em contato pelo WhatsApp informado.','success');
      try {
        window.PETracking?.send?.('contact','sales:institutional-request');
        if(localStorage.getItem('pe_marketing_consent')==='granted'){
          window.gtag?.('event','generate_lead',{method:'formulario_institucional'});
        }
      } catch {}
    } catch (error) {
      feedback('Não conseguimos registrar automaticamente. Você pode enviar a solicitação diretamente pelo WhatsApp.','error');
      const msg='Olá! Quero conversar com a Próxima Era sobre '+interest+'. Meu nome é '+name+'.';
      const link=document.createElement('a');
      link.href=wa+'?text='+encodeURIComponent(msg);
      link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='Abrir WhatsApp';
      status.append(' ',link);
    } finally {
      submit.disabled=false;
      submit.textContent='Solicitar retorno pelo WhatsApp →';
    }
  });
})();