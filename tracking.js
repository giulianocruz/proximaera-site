/* Próxima Era — mensuração do funil.
   Intenção ≠ pagamento. Eventos de compra só são considerados após confirmação do backend.
*/
(()=>{
  if(navigator.webdriver||/Lighthouse|HeadlessChrome/i.test(navigator.userAgent))return;
  let peActivePixel='';
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
    const text=document.createElement('div');text.innerHTML='<strong style="display:block;margin-bottom:3px">Medição de marketing</strong><span style="opacity:.78">Podemos usar o Meta Pixel para medir anúncios e criar públicos de remarketing. O tracking operacional da compra continua funcionando sem isso.</span>';
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
    const accept=document.createElement('button');accept.type='button';accept.textContent='Aceitar marketing';accept.style.cssText='border:0;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer;background:#6fe2ff;color:#06162d';
    const deny=document.createElement('button');deny.type='button';deny.textContent='Agora não';deny.style.cssText='border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:9px 14px;font-weight:700;cursor:pointer;background:transparent;color:#eef7ff';
    const privacy=document.createElement('a');privacy.href='/privacidade.html';privacy.textContent='Privacidade';privacy.style.cssText='align-self:center;color:#bfefff;margin-left:auto';
    accept.onclick=()=>{try{localStorage.setItem('pe_marketing_consent','granted')}catch{};box.remove();peLoadMetaPixel(id)};
    deny.onclick=()=>{try{localStorage.setItem('pe_marketing_consent','denied')}catch{};box.remove()};
    actions.append(accept,deny,privacy);box.append(text,actions);document.body.append(box);
  }
  window.PEConfigureMetaPixel=(rawId)=>{
    const id=String(rawId||'').trim();if(!/^\d{6,25}$/.test(id))return;
    const choice=peMarketingChoice();
    if(choice==='granted')return peLoadMetaPixel(id);
    if(choice==='denied')return;
    peConsentBanner(id);
  };
  setTimeout(()=>window.PEConfigureMetaPixel?.(window.PE_OFFER?.metaPixelId||window.PE_META_PIXEL_ID||''),0);
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

/* Próxima Era Analytics v2 — sessão, engajamento e profundidade.
   Complementa o funil existente; pagamento continua confirmado apenas pelo backend.
*/
(()=>{
  if(navigator.webdriver||/Lighthouse|HeadlessChrome/i.test(navigator.userAgent))return;
  const offer=window.PE_OFFER||{};
  const isOffer=location.pathname.startsWith('/ofertas/')&&!location.pathname.startsWith('/ofertas/pedido');
  const slug=isOffer?(location.pathname.split('/').filter(Boolean)[1]||'oferta'):'';
  const topic=isOffer?'offer:'+slug:'sales:'+(location.pathname.split('/').filter(Boolean).at(-1)||'home');
  const store={
    get:(scope,key)=>{try{return scope.getItem(key)||''}catch{return''}},
    set:(scope,key,value)=>{try{scope.setItem(key,value)}catch{}}
  };
  const id=()=>{
    try{return crypto.randomUUID()}catch{return Date.now().toString(36)+Math.random().toString(36).slice(2)}
  };
  let visitorId=store.get(localStorage,'pe_visitor_id');
  if(!/^[a-z0-9-]{12,64}$/i.test(visitorId)){visitorId=id();store.set(localStorage,'pe_visitor_id',visitorId);}
  let sessionId=store.get(sessionStorage,'pe_session_id');
  if(!/^[a-z0-9-]{12,64}$/i.test(sessionId)){sessionId=id();store.set(sessionStorage,'pe_session_id',sessionId);}
  const q=new URLSearchParams(location.search);
  for(const key of ['fbclid','gclid','gbraid','wbraid','msclkid']){
    const v=q.get(key);
    if(v)store.set(sessionStorage,'pe_'+key,v.slice(0,220));
  }
  const acquisition=()=>{try{return window.PETracking?.acquisition?.()||{}}catch{return{}}};
  const variant=String(offer.variant||document.body?.dataset?.offerVariant||slug||'default').slice(0,80);
  const priceCents=Number.isFinite(Number(offer.priceCents))?Math.max(0,Math.round(Number(offer.priceCents))):null;
  const originalAcquisition=window.PETracking?.acquisition;
  if(window.PETracking&&typeof originalAcquisition==='function'){
    window.PETracking.acquisition=()=>({
      ...originalAcquisition(),visitorId,sessionId,landingVariant:variant,offerPriceCents:priceCents
    });
  }
  const deviceType=matchMedia('(max-width: 760px)').matches?'mobile':matchMedia('(max-width: 1100px)').matches?'tablet':'desktop';
  const referrerHost=(()=>{try{return document.referrer?new URL(document.referrer).hostname:''}catch{return''}})();
  const startedAt=Date.now();
  let engagedSeconds=0,maxScroll=0,lastActivity=Date.now(),lastTick=performance.now(),sentStart=false;
  const thresholds=[25,50,75,90,100],seenScroll=new Set();
  const active=()=>document.visibilityState==='visible'&&(Date.now()-lastActivity)<30000;
  const base=(event,extra={})=>{
    const a=acquisition();
    return {
      event,topic,guide:String(a.source||'').slice(0,20),path:location.pathname,referrerHost,
      source:a.source||'',medium:a.medium||'',campaign:a.campaign||'',content:a.content||'',term:a.term||'',
      entry:a.entry||'',visitId:a.visitId||'',reference:a.reference||'',
      visitorId,sessionId,landingVariant:variant,offerPriceCents:priceCents,
      engagedSeconds:Math.round(engagedSeconds),sessionSeconds:Math.round((Date.now()-startedAt)/1000),
      maxScroll:Math.round(maxScroll),deviceType,viewportW:innerWidth,viewportH:innerHeight,
      fbclid:store.get(sessionStorage,'pe_fbclid'),gclid:store.get(sessionStorage,'pe_gclid'),
      gbraid:store.get(sessionStorage,'pe_gbraid'),wbraid:store.get(sessionStorage,'pe_wbraid'),
      msclkid:store.get(sessionStorage,'pe_msclkid'),...extra
    };
  };
  const send=(event,extra={},beacon=false)=>{
    const body=JSON.stringify(base(event,extra));
    try{
      if(beacon&&navigator.sendBeacon){
        navigator.sendBeacon('/api/analytics',new Blob([body],{type:'application/json'}));
        return;
      }
      fetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},credentials:'omit',keepalive:true,body}).catch(()=>{});
    }catch{}
  };
  const touch=()=>{lastActivity=Date.now();};
  ['pointerdown','touchstart','keydown','scroll'].forEach(name=>addEventListener(name,touch,{passive:true}));
  const updateScroll=()=>{
    const doc=document.documentElement,den=Math.max(1,doc.scrollHeight-innerHeight);
    const pct=Math.min(100,Math.max(0,((scrollY||doc.scrollTop)/den)*100));
    if(pct>maxScroll)maxScroll=pct;
    for(const t of thresholds){
      if(pct>=t&&!seenScroll.has(t)){
        seenScroll.add(t);
        send('scroll_'+t,{scrollThreshold:t});
      }
    }
  };
  addEventListener('scroll',updateScroll,{passive:true});addEventListener('resize',updateScroll,{passive:true});
  setTimeout(updateScroll,350);
  const start=()=>{
    if(sentStart||document.visibilityState!=='visible')return;
    sentStart=true;send('session_start');
  };
  start();addEventListener('pageshow',start);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){touch();start();lastTick=performance.now();}});
  const timer=setInterval(()=>{
    const now=performance.now(),delta=Math.min(20,Math.max(0,(now-lastTick)/1000));lastTick=now;
    if(active())engagedSeconds+=delta;
    updateScroll();
    if(document.visibilityState==='visible')send('session_update');
  },15000);
  const ctas=[...document.querySelectorAll('[data-track],[data-buy],a[href="#checkout"],.choice-button,.top-cta')];
  if('IntersectionObserver'in window&&ctas.length){
    const seen=new WeakSet();
    const io=new IntersectionObserver(entries=>{
      for(const e of entries){
        if(!e.isIntersecting||seen.has(e.target))continue;
        seen.add(e.target);
        const el=e.target,label=String(el.dataset?.analyticsId||el.dataset?.track||el.textContent||'cta').trim().replace(/\s+/g,' ').slice(0,80);
        send('cta_view',{cta:label});
        io.unobserve(el);
      }
    },{threshold:.55});
    ctas.forEach(el=>io.observe(el));
  }
  document.addEventListener('click',event=>{
    const el=event.target instanceof Element?event.target.closest('[data-track],[data-buy],a[href="#checkout"],.choice-button,.top-cta,.offer-intent-bar .button'):null;
    if(!el)return;
    const label=String(el.dataset?.analyticsId||el.dataset?.track||el.textContent||'cta').trim().replace(/\s+/g,' ').slice(0,80);
    send('cta',{cta:label,analyticsV2:true});
  },{passive:true});

  document.querySelectorAll('video').forEach((video,index)=>{
    let completed=false;
    video.addEventListener('play',()=>send('video_play',{video:String(video.dataset?.analyticsId||video.currentSrc||'video-'+(index+1)).slice(0,160)}),{once:true});
    video.addEventListener('ended',()=>{if(!completed){completed=true;send('video_complete',{video:String(video.dataset?.analyticsId||video.currentSrc||'video-'+(index+1)).slice(0,160)});}});
  });
  const finish=()=>{
    clearInterval(timer);
    const now=performance.now(),delta=Math.min(20,Math.max(0,(now-lastTick)/1000));
    if(active())engagedSeconds+=delta;
    updateScroll();send('session_update',{final:true},true);
  };
  addEventListener('pagehide',finish,{once:true});
  addEventListener('beforeunload',finish,{once:true});
})();
