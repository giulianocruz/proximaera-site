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
    if(!sessionStorage.getItem('pe_entry_path')){
      sessionStorage.setItem('pe_entry_path',location.pathname+location.search);
    }
  }catch{}
  let entry='';
  try{entry=sessionStorage.getItem('pe_entry_path')||location.pathname}catch{entry=location.pathname}
  let ref='direto';
  try{if(document.referrer) ref=new URL(document.referrer).hostname}catch{}
  const source=saved.utm_source||ref;
  const campaign=saved.utm_campaign||'';
  const context=[
    'Origem: '+source,
    campaign&&('Campanha: '+campaign),
    'Entrada: '+entry,
    'Pagina: '+location.pathname
  ].filter(Boolean).join(' | ');
  document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{
    try{
      const u=new URL(a.href);
      const base=u.searchParams.get('text')||'';
      if(!base.includes('Origem:')){
        u.searchParams.set('text',base+'\n\n'+context);
      }
      a.href=u.toString();
    }catch{}
  });
})();
