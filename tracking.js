(()=>{
  const q=new URLSearchParams(location.search);
  const keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  const saved={};
  for(const k of keys){
    const v=q.get(k);
    if(v){try{sessionStorage.setItem('pe_'+k,v)}catch{}}
    try{saved[k]=sessionStorage.getItem('pe_'+k)||''}catch{saved[k]=v||''}
  }
  try{
    if(!sessionStorage.getItem('pe_entry_path')) sessionStorage.setItem('pe_entry_path',location.pathname+location.search);
  }catch{}
  let entry='';
  try{entry=sessionStorage.getItem('pe_entry_path')||location.pathname}catch{entry=location.pathname}
  let ref='direto';
  try{if(document.referrer) ref=new URL(document.referrer).hostname}catch{}
  const source=saved.utm_source||ref;
  const campaign=saved.utm_campaign||'';
  const parts=location.pathname.split('/').filter(Boolean);
  const topic=(parts[0]==='guias'?'guia:':'sales:')+(parts.at(-1)||parts[0]||'home');
  const context=['Origem: '+source,campaign&&('Campanha: '+campaign),saved.utm_content&&('Criativo: '+saved.utm_content),'Entrada: '+entry,'Pagina: '+location.pathname].filter(Boolean).join(' | ');
  const send=(event,eventTopic=topic)=>fetch('/api/analytics',{
    method:'POST',headers:{'content-type':'application/json'},credentials:'omit',keepalive:true,
    body:JSON.stringify({event,topic:eventTopic,guide:source,path:location.pathname,referrerHost:ref,source,medium:saved.utm_medium,campaign,content:saved.utm_content,term:saved.utm_term,entry})
  }).catch(()=>{});
  const once=(kind,fn)=>{
    const key='pe:'+kind+':'+location.pathname+':'+campaign;
    try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch{}
    fn();
  };
  once('view',()=>send('view'));
  document.querySelectorAll('[data-track],a[href*="wa.me/"]').forEach(a=>{
    const label=(a.dataset.track||'whatsapp').trim().slice(0,42);
    if(a.matches('a[href*="wa.me/"]')){
      try{
        const u=new URL(a.href),base=u.searchParams.get('text')||'';
        if(!base.includes('Origem:'))u.searchParams.set('text',base+'\n\n'+context);
        a.href=u.toString();
      }catch{}
    }
    a.addEventListener('click',()=>{
      const eventTopic=(topic+':'+label).slice(0,80);
      once('cta:'+label,()=>send('cta',eventTopic));
    });
  });
})();
