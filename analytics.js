(()=>{
  const body=document.body;
  if(!body?.classList.contains('local-article')) return;
  const topic=body.dataset.topic||'', guide=body.dataset.guide||'';
  if(!topic) return;
  let referrerHost='';
  try{ if(document.referrer) referrerHost=new URL(document.referrer).hostname; }catch{}
  const send=(event)=>fetch('/api/analytics',{
    method:'POST',headers:{'content-type':'application/json'},credentials:'omit',keepalive:true,
    body:JSON.stringify({event,topic,guide,path:location.pathname,referrerHost})
  }).catch(()=>{});
  const once=(kind,fn)=>{
    const key=`pe:${kind}:${location.pathname}`;
    try{if(sessionStorage.getItem(key)) return; sessionStorage.setItem(key,'1');}catch{}
    fn();
  };
  once('view',()=>send('view'));
  document.querySelector('.local-cta .button')?.addEventListener('click',()=>once('cta',()=>send('cta')));
})();