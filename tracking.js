/* Próxima Era — mensuração anônima de funil.
   Intenção de contato ≠ conversa iniciada ≠ venda: não enviamos eventos de compra.
*/
(()=>{
  if(navigator.webdriver||/Lighthouse|HeadlessChrome/i.test(navigator.userAgent))return;
  const q=new URLSearchParams(location.search);
  const keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  const read=(key)=>{try{return sessionStorage.getItem(key)||''}catch{return ''}};
  const save=(key,value)=>{try{sessionStorage.setItem(key,value)}catch{}};
  const saved={};
  for(const k of keys){
    const v=q.get(k);
    if(v)save('pe_'+k,v);
    saved[k]=read('pe_'+k)||v||'';
  }
  if(!read('pe_entry_path'))save('pe_entry_path',location.pathname+location.search);
  const entry=read('pe_entry_path')||location.pathname;
  let ref='direto';
  try{if(document.referrer)ref=new URL(document.referrer).hostname}catch{}
  const source=saved.utm_source||ref;
  save('pe_source',source);
  const campaign=saved.utm_campaign||'';
  const ctaRef=()=>{
    let x=read('pe_contact_ref');
    if(!/^[A-Z0-9]{8}$/.test(x)){
      const bytes=new Uint8Array(5);crypto.getRandomValues(bytes);
      x=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').slice(0,8).toUpperCase();
      save('pe_contact_ref',x);
    }
    return 'PE-'+x;
  };
  const reference=ctaRef();
  let visitId=read('pe_visit_id');
  if(!/^[a-z0-9-]{12,40}$/.test(visitId)){
    visitId=crypto.randomUUID?crypto.randomUUID():reference.toLowerCase()+'-'+Date.now().toString(36);
    save('pe_visit_id',visitId);
  }
  const pieces=location.pathname.split('/').filter(Boolean);
  const topic=(pieces[0]==='guias'?'guia:':'sales:')+(pieces.at(-1)||pieces[0]||'home');
  const context=[
    'Origem: '+source,
    campaign&&('Campanha: '+campaign),
    saved.utm_content&&('Criativo: '+saved.utm_content),
    'Referência: '+reference,
    'Entrada: '+entry,
    'Pagina: '+location.pathname
  ].filter(Boolean).join(' | ');
  const payload=(event,eventTopic)=>JSON.stringify({
    event,topic:eventTopic,guide:source,path:location.pathname,referrerHost:ref,
    source,medium:saved.utm_medium,campaign,content:saved.utm_content,
    term:saved.utm_term,entry,visitId,reference
  });
  const send=(event,eventTopic=topic)=>{
    try{
      fetch('/api/analytics',{
        method:'POST',headers:{'content-type':'application/json'},
        credentials:'omit',keepalive:true,body:payload(event,eventTopic)
      }).catch(()=>{});
    }catch{}
  };
  const once=(kind,fn)=>{
    const key='pe:'+kind+':'+location.pathname+':'+campaign;
    try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch{}
    fn();
  };
  const recordView=()=>{if(document.visibilityState==='visible')once('view',()=>send('view'));};
  recordView();
  document.addEventListener('visibilitychange',recordView);
  window.addEventListener('pageshow',recordView);
  const gaEvent=(label,group)=>{
    if(typeof window.gtag!=='function')return;
    try{window.gtag('event',label,{campaign_name:campaign,method:group,transport_type:'beacon'});}catch{}
  };
  document.querySelectorAll('[data-track],a[href*="wa.me/"]').forEach(el=>{
    const label=(el.dataset.track||'whatsapp').trim().slice(0,42);
    const isWa=el.matches('a[href*="wa.me/"]');
    if(isWa){
      try{
        const u=new URL(el.href),message=u.searchParams.get('text')||'';
        if(!message.includes('Referência: '+reference)){
          u.searchParams.set('text',message+(!message.includes('Origem:')?'\n\n'+context:' | Referência: '+reference));
          el.href=u.toString();
        }
      }catch{}
    }
    el.addEventListener('click',()=>{
      const eventTopic=(topic+':'+label).slice(0,80);
      save('pe_last_topic',eventTopic);
      save('pe_last_cta',label);
      save('pe_last_cta_path',location.pathname);
      recordView();
      once('cta:'+label,()=>send('cta',eventTopic));
      if(isWa){
        once('whatsapp:'+label,()=>{
          send('whatsapp',eventTopic);
          gaEvent('click_whatsapp','intent');
        });
      }else if(label.startsWith('modelo-')||label.includes('exemplo')||label.includes('demonstracao')){
        once('demo:'+label,()=>gaEvent('view_demo','engagement'));
      }
    });
  });
})();
