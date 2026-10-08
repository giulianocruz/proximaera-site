/* Próxima Era — mensuração do funil.
   Intenção ≠ pagamento. Eventos de compra só são considerados após confirmação do backend.
*/
(()=>{
  if(navigator.webdriver||/Lighthouse|HeadlessChrome/i.test(navigator.userAgent))return;
  let peActivePixel='';
  /* GA4 property utilizada pela pagina /fecha-negocio/.
     Nas ofertas, a tag so e carregada mediante consentimento. */
  const peOfferGaId='G-RR7D4MYJZ8';
  // Pixel pertencente a conta de anuncios Giuliano Da Cruz (Meta).
  const peOfferMetaId='1534363811135198';
  let peOfferGaLoaded=false;
  function peLoadOfferGa(){
    if(peOfferGaLoaded||!location.pathname.startsWith('/ofertas/'))return;
    if(peMarketingChoice()!=='granted')return;
    peOfferGaLoaded=true;
    window.dataLayer=window.dataLayer||[];
    if(typeof window.gtag!=='function')window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config',peOfferGaId,{send_page_view:true});
    const script=document.createElement('script');
    script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(peOfferGaId);
    document.head.append(script);
    try{window.dispatchEvent(new Event('pe:ga-ready'));}catch{}
  }
  function peLoadMetaPixel(rawId){
    const id=String(rawId||'').trim();
    if(!/^\d{6,25}$/.test(id)||peActivePixel===id)return;
    if(typeof window.fbq!=='function'){
      const fbq=function(){fbq.callMethod?fbq.callMethod.apply(fbq,arguments):fbq.queue.push(arguments)};
      fbq.push=fbq;fbq.loaded=true;fbq.version='2.0';fbq.queue=[];window.fbq=fbq;window._fbq=fbq;
      const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.append(script);
    }
    peActivePixel=id;
    try{window.fbq('init',id);window.fbq('track','PageView');}catch{}
    try{window.dispatchEvent(new Event('pe:meta-ready'));}catch{}
  }
  function peMarketingChoice(){
    try{return localStorage.getItem('pe_marketing_consent')||''}catch{return ''}
  }
  function peConsentBanner(id){
    if(document.querySelector('[data-pe-marketing-consent]'))return;
    const box=document.createElement('aside');box.dataset.peMarketingConsent='1';
    box.style.cssText='position:fixed;left:16px;right:16px;bottom:14px;z-index:120;max-width:720px;margin:auto;padding:14px 16px;border:1px solid rgba(130,220,255,.22);border-radius:16px;background:rgba(5,18,43,.97);color:#eef7ff;box-shadow:0 18px 50px rgba(0,0,0,.38);font:13px/1.45 system-ui,sans-serif';
    const text=document.createElement('div');text.innerHTML='<strong style="display:block;margin-bottom:3px">Medição de marketing</strong><span style="opacity:.78">Com sua permissão, usamos Google Analytics 4 para medir navegação e Meta Pixel (quando configurado) para avaliar anúncios. O registro de pedidos funciona mesmo se você recusar.</span>';
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
    const accept=document.createElement('button');accept.type='button';accept.textContent='Aceitar marketing';accept.style.cssText='border:0;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer;background:#6fe2ff;color:#06162d';
    const deny=document.createElement('button');deny.type='button';deny.textContent='Agora não';deny.style.cssText='border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:9px 14px;font-weight:700;cursor:pointer;background:transparent;color:#eef7ff';
    const privacy=document.createElement('a');privacy.href='/privacidade.html';privacy.textContent='Privacidade';privacy.style.cssText='align-self:center;color:#bfefff;margin-left:auto';
    accept.onclick=()=>{try{localStorage.setItem('pe_marketing_consent','granted')}catch{};box.remove();peLoadMetaPixel(id);peLoadOfferGa()};
    deny.onclick=()=>{try{localStorage.setItem('pe_marketing_consent','denied')}catch{};box.remove()};
    actions.append(accept,deny,privacy);box.append(text,actions);document.body.append(box);
  }
  window.PEConfigureMetaPixel=(rawId)=>{
    const id=String(rawId||'').trim();
    const hasPixel=/^\d{6,25}$/.test(id);
    const isOffer=location.pathname.startsWith('/ofertas/');
    if(!hasPixel&&!isOffer)return;
    const choice=peMarketingChoice();
    if(choice==='granted'){
      if(hasPixel)peLoadMetaPixel(id);
      if(isOffer)peLoadOfferGa();
      return;
    }
    if(choice==='denied')return;
    peConsentBanner(hasPixel?id:'');
  };
  setTimeout(()=>window.PEConfigureMetaPixel?.(window.PE_OFFER?.metaPixelId||window.PE_META_PIXEL_ID||(location.pathname.startsWith('/ofertas/')?peOfferMetaId:'')),0);
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
  window.PETracking={
    send,visitId,reference,
    acquisition:()=>({source,medium:saved.utm_medium,campaign,content:saved.utm_content,term:saved.utm_term,entry,visitId,reference,marketingConsent:peMarketingChoice()==='granted'})
  };
  const once=(kind,fn)=>{
    const key='pe:'+kind+':'+location.pathname+':'+campaign;
    try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch{}
    fn();
  };
  const recordView=()=>{if(document.visibilityState==='visible')once('view',()=>send('view'));};
  const recordOfferView=()=>{
    if(document.visibilityState!=='visible'||!location.pathname.startsWith('/ofertas/')||location.pathname.startsWith('/ofertas/pedido'))return;
    const slug=location.pathname.split('/').filter(Boolean)[1]||'oferta';
    once('offer_view',()=>send('offer_view',('offer:'+slug).slice(0,80)));
  };
  recordView();recordOfferView();
  document.addEventListener('visibilitychange',()=>{recordView();recordOfferView();});
  window.addEventListener('pageshow',()=>{recordView();recordOfferView();});
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