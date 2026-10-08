(()=>{
  const cfg=window.PE_OFFER;
  if(!cfg) return;
  const q=(s,root=document)=>root.querySelector(s);
  const qa=(s,root=document)=>[...root.querySelectorAll(s)];
  const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents)/100);
  const bind=(key,value)=>qa('[data-bind="'+key+'"]').forEach(el=>el.textContent=value||'');
  function trackOfferEvent(name,params={}){
    const gaEventNames={ViewContent:'view_item',InitiateCheckout:'begin_checkout',AddPaymentInfo:'add_payment_info'};
    const fireGa=()=>{
      if(typeof window.gtag!=='function')return;
      try{
        window.gtag('event',gaEventNames[name]||name,{
          currency:params.currency||'BRL',
          value:Number(params.value||0),
          items:[{item_id:cfg.slug,item_name:params.content_name||cfg.title||cfg.slug,price:Number(params.value||0),quantity:1}]
        });
      }catch{}
    };
    try{if(typeof window.fbq==='function')window.fbq('track',name,params);}catch{}
    if(typeof window.gtag==='function')fireGa();
    else if(name==='ViewContent')window.addEventListener('pe:ga-ready',fireGa,{once:true});
    try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name,...params});}catch{}
  }
  document.body.dataset.offer=cfg.slug;
  const offerValue=cfg.priceCents!=null?Number(cfg.priceCents)/100:undefined;
  const viewParams={value:offerValue,currency:'BRL',content_name:cfg.title,content_ids:[cfg.slug],content_type:'product'};
  trackOfferEvent('ViewContent',viewParams);
  window.addEventListener('pe:meta-ready',()=>{try{if(typeof window.fbq==='function')window.fbq('track','ViewContent',viewParams);}catch{}},{once:true});
  bind('eyebrow',cfg.eyebrow);
  bind('title',cfg.title);
  bind('subtitle',cfg.subtitle);
  const hero=q('.hero');
  if(hero){
    hero.style.setProperty('--hero-desktop','url("'+cfg.heroBackground+'")');
    hero.style.setProperty('--hero-mobile','url("'+cfg.heroBackgroundMobile+'")');
  }
  const visual=q('[data-product-visual]');
  if(visual){
    const setVisual=()=>{visual.src=(matchMedia('(max-width:780px)').matches&&cfg.productVisualMobile)||cfg.productVisual||'';};
    setVisual();
    matchMedia('(max-width:780px)').addEventListener?.('change',setVisual);
    visual.alt=cfg.title||'Produto';
    visual.addEventListener('error',()=>visual.classList.add('asset-missing'),{once:true});
  }
  const highlights=q('[data-highlights]');
  (cfg.highlights||[]).forEach(label=>{
    const span=document.createElement('span');
    span.textContent='✓ '+label;
    highlights?.append(span);
  });
  const stock=q('[data-stock]'), heroPrice=q('[data-hero-price]');
  const price=q('[data-price]'), compare=q('[data-compare]'), discount=q('[data-discount]');
  const promoPanel=q('[data-promo-panel]'), promoCountdown=q('[data-promo-countdown]'), saving=q('[data-saving]');
  const promoRibbon=q('[data-promo-ribbon]'), promoRibbonCountdown=q('[data-promo-ribbon-countdown]');
  const eta=q('[data-eta]'), after=q('[data-after-hours]');
  let promoTimer=null;
  function paintCommercialState(){
    if(stock){
      if(cfg.stock!=null && Number.isFinite(Number(cfg.stock))){
        const n=Math.max(0,Math.trunc(Number(cfg.stock)));
        const threshold=Math.max(1,Math.trunc(Number(cfg.triggers?.lowStockThreshold||12)));
        const urgent=n>0&&n<=threshold;
        stock.hidden=false;stock.classList.toggle('urgent',urgent);
        const fallback=cfg.soldOutFallback&&cfg.soldOutFallback.url;
        stock.querySelector('span').textContent=n===0&&fallback?(cfg.soldOutFallback.stockLabel||'Lote promocional encerrado'):urgent?('Últimas '+n+' unidades deste lote'):(n+' unidades disponíveis');
      }else{stock.hidden=true;stock.classList.remove('urgent');}
    }
    if(price) price.textContent=cfg.priceCents!=null?money(cfg.priceCents):'Oferta em preparação';
    if(heroPrice){const strong=heroPrice.querySelector('strong');if(cfg.priceCents!=null){heroPrice.hidden=false;if(strong)strong.textContent=money(cfg.priceCents);}else heroPrice.hidden=true;}
    if(compare){
      if(cfg.compareAtCents!=null){compare.hidden=false;compare.textContent='Valor de referência '+money(cfg.compareAtCents);}
      else compare.hidden=true;
    }
    if(discount){
      const valid=cfg.compareAtCents!=null&&cfg.priceCents!=null&&Number(cfg.compareAtCents)>Number(cfg.priceCents);
      if(valid){const pct=Math.floor((Number(cfg.compareAtCents)-Number(cfg.priceCents))*100/Number(cfg.compareAtCents));discount.hidden=false;discount.textContent=pct+'% de economia';}
      else discount.hidden=true;
    }
    if(saving){
      const diff=Number(cfg.compareAtCents||0)-Number(cfg.priceCents||0);
      saving.textContent=diff>0?'Economize '+money(diff)+' neste lote':'';
    }
    paintPromoCountdown();
    if(eta) eta.textContent=cfg.fulfillment?.eta||'';
    if(after) after.textContent=cfg.fulfillment?.afterHours||'';
  }
  function paintPromoCountdown(){
    if(promoTimer){clearInterval(promoTimer);promoTimer=null;}
    const end=cfg.promoEndsAt?new Date(cfg.promoEndsAt).getTime():0;
    if(!promoPanel||!promoCountdown||!end||!Number.isFinite(end)){if(promoPanel)promoPanel.hidden=true;if(promoRibbon)promoRibbon.hidden=true;return;}
    promoPanel.hidden=false;if(promoRibbon)promoRibbon.hidden=false;
    const tick=()=>{
      const diff=end-Date.now();
      if(diff<=0){
        promoCountdown.textContent='ENCERRADA';if(promoRibbonCountdown)promoRibbonCountdown.textContent='ENCERRADA';
        promoPanel.classList.add('expired');
        cfg.promoExpired=true;cfg.checkout=cfg.checkout||{};cfg.checkout.enabled=false;
        paintCheckoutState();
        if(promoTimer){clearInterval(promoTimer);promoTimer=null;}
        return;
      }
      const days=Math.floor(diff/86400000),hours=Math.floor(diff%86400000/3600000),mins=Math.floor(diff%3600000/60000),secs=Math.floor(diff%60000/1000);
      const label=(days?days+'d ':'')+String(hours).padStart(2,'0')+':'+String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');
      promoCountdown.textContent=label;if(promoRibbonCountdown)promoRibbonCountdown.textContent=label;
    };
    tick();promoTimer=setInterval(tick,1000);
  }
  paintCommercialState();
  function iconBox(src,className){
    const box=document.createElement('div'); box.className=className;
    const img=document.createElement('img'); img.src=src||''; img.alt='';
    const fallback=document.createElement('span'); fallback.textContent='✦';
    img.addEventListener('error',()=>img.remove(),{once:true});
    box.append(img,fallback); return box;
  }
  const benefits=q('[data-benefits]');
  (cfg.benefits||[]).forEach(b=>{
    const article=document.createElement('article'); article.className='benefit-card';
    const h=document.createElement('h3'); h.textContent=b.title;
    const p=document.createElement('p'); p.textContent=b.text;
    article.append(iconBox(b.icon,'icon-shell'),h,p); benefits?.append(article);
  });
  const steps=q('[data-steps]');
  (cfg.steps||[]).forEach((s,i)=>{
    const article=document.createElement('article'); article.className='step-card';
    const top=document.createElement('div'); top.className='step-top';
    const number=document.createElement('span'); number.className='step-number'; number.textContent='0'+(i+1);
    top.append(number,iconBox(s.icon,'step-icon'));
    const h=document.createElement('h3'); h.textContent=s.title;
    const p=document.createElement('p'); p.textContent=s.text;
    article.append(top,h,p); steps?.append(article);
  });
  const upsells=cfg.upsells||[], upsellSection=q('[data-upsell-section]'), upsellGrid=q('[data-upsells]');
  let selectedAddon='';
  const selectedAddonData=()=>upsells.find(u=>u.code===selectedAddon)||null;
  const checkoutTotalCents=()=>Number(cfg.priceCents||0)+Number(selectedAddonData()?.priceCents||0);
  const checkoutTitle=()=>{
    const active=selectedAddonData();
    return active?[String(cfg.title||'Oferta Próxima Era'),String(active.title||'Complemento')].join(' + '):String(cfg.title||'Oferta Próxima Era');
  };
  function refreshDialogUpgrade(){
    const box=q('[data-checkout-upgrade]');
    if(!box)return;
    const u=upsells[0];
    if(!u||selectedAddon){box.hidden=true;return;}
    box.hidden=false;
    const title=box.querySelector('[data-upgrade-title]');
    const copy=box.querySelector('[data-upgrade-copy]');
    const price=box.querySelector('[data-upgrade-price]');
    if(title)title.textContent=u.headline||('Complete com '+String(u.title||'o pacote completo'));
    if(copy)copy.textContent=u.description||('Adicione agora por +'+money(u.priceCents||0)+' e leve o pacote completo.');
    if(price)price.textContent=money(Number(cfg.priceCents||0)+Number(u.priceCents||0));
  }
  function refreshAddonUI(){
    const active=selectedAddonData();
    qa('[data-addon-code]').forEach(el=>{
      const on=String(el.dataset.addonCode||'')===selectedAddon;
      if(el.matches('input'))el.checked=on;
      if(el.matches('button')){
        el.classList.toggle('is-selected',on);
        el.setAttribute('aria-pressed',String(on));
        const u=upsells.find(x=>x.code===el.dataset.addonCode);
        el.textContent=on?'✓ Adicionado ao pedido':('Adicionar por +'+money(u?.priceCents||0));
      }
    });
    qa('.upsell-card[data-code]').forEach(el=>el.classList.toggle('selected',String(el.dataset.code||'')===selectedAddon));
    const buyNow=q('[data-buy]');
    if(buyNow&&cfg.checkout?.enabled)buyNow.textContent=active?('Comprar pacote por '+money(checkoutTotalCents())+' →'):'Comprar por '+money(cfg.priceCents||0)+' →';
    const dt=q('[data-dialog-title]');if(dt)dt.textContent=checkoutTitle();
    qa('[data-combo-total]').forEach(el=>el.textContent=money(active?checkoutTotalCents():Number(cfg.priceCents||0)+Number(upsells[0]?.priceCents||0)));
    refreshDialogUpgrade();
  }
  function toggleAddon(code,force){
    const shouldEnable=force===undefined?selectedAddon!==code:Boolean(force);
    selectedAddon=shouldEnable?code:'';
    refreshAddonUI();
    try{sessionStorage.setItem('pe_selected_addon_'+cfg.slug,selectedAddon);}catch{}
  }
  try{
    const saved=sessionStorage.getItem('pe_selected_addon_'+cfg.slug)||'';
    if(upsells.some(u=>u.code===saved))selectedAddon=saved;
    const forceCombo=new URLSearchParams(location.search).get('combo');
    if(forceCombo==='1'&&upsells[0])selectedAddon=upsells[0].code;
  }catch{}
  function renderUpsells(){
    if(!upsells.length||!upsellSection||!upsellGrid)return;
    upsellSection.hidden=false;
    upsells.forEach(u=>{
      if(upsellGrid.querySelector('[data-code="'+CSS.escape(String(u.code||''))+'"]'))return;
      const article=document.createElement('article'); article.className='upsell-card featured'; article.dataset.code=u.code||'';
      const label=document.createElement('span'); label.className='mini-kicker'; label.textContent=u.label||'Oferta complementar';
      const h=document.createElement('h3'); h.textContent=u.headline||u.title;
      const p=document.createElement('p'); p.textContent=u.text||u.description||'Adicione este produto ao mesmo pedido com condição especial.';
      article.append(label,h,p);
      if(Array.isArray(u.features)&&u.features.length){
        const list=document.createElement('ul');list.className='upsell-features';
        u.features.forEach(x=>{const li=document.createElement('li');li.textContent='✓ '+x;list.append(li);});
        article.append(list);
      }
      if(u.compareAtCents!=null){
        const ref=document.createElement('span');ref.className='upsell-compare';
        ref.textContent='Referência: '+money(u.compareAtCents);
        article.append(ref);
      }
      const strong=document.createElement('strong');strong.textContent='+'+money(u.priceCents||0);
      const small=document.createElement('small');small.className='upsell-price-note';small.textContent='condição especial no mesmo pedido';
      const bundle=document.createElement('div');bundle.className='upsell-bundle';
      const bundleLabel=document.createElement('span');bundleLabel.textContent='Pacote completo';
      const bundlePrice=document.createElement('b');bundlePrice.textContent=money((cfg.priceCents||0)+(u.priceCents||0));bundlePrice.dataset.comboTotal='';
      const bundleRef=document.createElement('small');bundleRef.textContent=u.bundleCompareAtCents?('Referência somada '+money(u.bundleCompareAtCents)+(u.savingCents?' • economia '+money(u.savingCents):'')):'Mais valor em um único pedido';
      bundle.append(bundleLabel,bundlePrice,bundleRef);
      const button=document.createElement('button'); button.type='button'; button.dataset.addonCode=u.code||'';button.addEventListener('click',()=>{toggleAddon(u.code);q('#checkout')?.scrollIntoView({behavior:'smooth',block:'center'});});
      article.append(strong,small,bundle,button); upsellGrid.append(article);
    });
    const checkoutCard=q('#checkout'), buySlot=q('[data-buy]'), u=upsells[0];
    if(checkoutCard&&buySlot&&u&&!checkoutCard.querySelector('.combo-bump')){
      const bump=document.createElement('label');bump.className='combo-bump';
      const input=document.createElement('input');input.type='checkbox';input.dataset.addonCode=u.code||'';input.addEventListener('change',()=>toggleAddon(u.code,input.checked));
      const icon=document.createElement('span');icon.className='combo-bump-icon';icon.textContent='+';
      const copy=document.createElement('span');copy.className='combo-bump-copy';
      const title=document.createElement('strong');title.textContent=u.headline||('Leve também '+u.title);
      const desc=document.createElement('small');desc.textContent=u.description||('Adicione por +'+money(u.priceCents||0));
      copy.append(title,desc);
      const priceBox=document.createElement('span');priceBox.className='combo-bump-price';
      const from=document.createElement('small');from.textContent='pacote';
      const total=document.createElement('b');total.dataset.comboTotal='';total.textContent=money((cfg.priceCents||0)+(u.priceCents||0));
      priceBox.append(from,total);
      bump.append(input,icon,copy,priceBox);
      checkoutCard.insertBefore(bump,buySlot);
    }
    refreshAddonUI();
  }
  renderUpsells();
  const faq=q('[data-faq]');
  (cfg.faq||[]).forEach(([question,answer])=>{
    const details=document.createElement('details');
    const summary=document.createElement('summary'); summary.textContent=question;
    const plus=document.createElement('span'); plus.textContent='+';
    const p=document.createElement('p'); p.textContent=answer;
    summary.append(plus); details.append(summary,p); faq?.append(details);
  });
  const buy=q('[data-buy]'), dialog=q('[data-checkout-dialog]'), form=q('[data-checkout-form]');
  const status=q('[data-form-status]'), dialogTitle=q('[data-dialog-title]');
  qa('[data-clear-addon]').forEach(el=>el.addEventListener('click',()=>{
    selectedAddon='';
    refreshAddonUI();
    try{sessionStorage.removeItem('pe_selected_addon_'+cfg.slug);}catch{}
  }));
  qa('[data-select-addon]').forEach(el=>el.addEventListener('click',()=>{
    const code=String(el.dataset.selectAddon||'');
    if(code)toggleAddon(code,true);
  }));
  if(dialogTitle) dialogTitle.textContent=cfg.title||'';
  if(form&&upsells.length&&!q('[data-checkout-upgrade]')){
    const u=upsells[0];
    const box=document.createElement('aside');box.className='checkout-upgrade';box.dataset.checkoutUpgrade='';box.hidden=true;
    const flag=document.createElement('span');flag.className='checkout-upgrade-flag';flag.textContent='ANTES DE FINALIZAR';
    const title=document.createElement('strong');title.dataset.upgradeTitle='';title.textContent=u.headline||('Complete com '+u.title);
    const copy=document.createElement('p');copy.dataset.upgradeCopy='';copy.textContent=u.description||'Adicione o complemento com condição especial no mesmo pedido.';
    const row=document.createElement('div');row.className='checkout-upgrade-row';
    const price=document.createElement('b');price.dataset.upgradePrice='';price.textContent=money(Number(cfg.priceCents||0)+Number(u.priceCents||0));
    const button=document.createElement('button');button.type='button';button.className='checkout-upgrade-button';button.textContent='Sim, quero o pacote completo';
    button.addEventListener('click',()=>toggleAddon(u.code,true));
    const skip=document.createElement('small');skip.textContent='Você também pode continuar somente com a oferta escolhida.';
    row.append(price,button);box.append(flag,title,copy,row,skip);
    const intro=q('.dialog-intro',form);intro?.insertAdjacentElement('afterend',box);
  }
  function paintCheckoutState(){
    if(!buy)return;
    buy.onclick=null;
    if(!cfg.checkout?.enabled){
      const fallback=cfg.stock===0&&cfg.soldOutFallback&&cfg.soldOutFallback.url;
      if(fallback){
        buy.disabled=false;
        buy.textContent=cfg.soldOutFallback.label||'Continuar com a oferta atual →';
        buy.title=cfg.soldOutFallback.title||'O lote promocional acabou, mas a oferta continua disponível.';
        buy.onclick=()=>{location.href=cfg.soldOutFallback.url;};
      }else{
        buy.disabled=true;
        buy.textContent=cfg.promoExpired?'Promoção encerrada':(cfg.stock===0?'Lote esgotado':(cfg.checkout?.labelWhenDisabled||'Venda ainda não liberada'));
        buy.title='A cobrança real será liberada após a configuração do gateway Pix.';
      }
    }else{
      buy.disabled=false;
      buy.title='';
      buy.textContent=selectedAddon?('Comprar pacote por '+money(checkoutTotalCents())+' →'):('Comprar por '+money(cfg.priceCents||0)+' →');
      buy.onclick=()=>{
        try{sessionStorage.setItem('pe_offer_intent_'+cfg.slug,String(Date.now()));}catch{}
        try{window.PETracking?.send?.('checkout_start',('offer:'+cfg.slug+(selectedAddon?':'+selectedAddon:'')).slice(0,80));}catch{}
        trackOfferEvent('InitiateCheckout',{value:checkoutTotalCents()/100,currency:'BRL',content_name:checkoutTitle(),content_ids:[cfg.slug],content_type:'product'});
        if(dialogTitle)dialogTitle.textContent=checkoutTitle();
        refreshDialogUpgrade();
        dialog?.showModal();
      };
    }
  }
  paintCheckoutState();

  async function syncOfferState(attempt=0){
    const endpoint=cfg.checkout?.endpoint||'/api/offers/order';
    try{
      const response=await fetch(endpoint+'?offer='+encodeURIComponent(cfg.slug),{credentials:'omit',cache:'no-store'});
      if(!response.ok)throw new Error('offer_state_http_'+response.status);
      const data=await response.json();
      try{if(data.metaPixelId)window.PEConfigureMetaPixel?.(data.metaPixelId);}catch{}
      if(data.title){cfg.title=data.title;bind('title',cfg.title);if(dialogTitle)dialogTitle.textContent=cfg.title;}
      if(data.subtitle){cfg.subtitle=data.subtitle;bind('subtitle',cfg.subtitle);}
      if(data.priceCents!=null)cfg.priceCents=Number(data.priceCents);else cfg.priceCents=null;
      cfg.compareAtCents=data.comparePriceCents!=null?Number(data.comparePriceCents):null;
      cfg.stock=data.stock!=null?Number(data.stock):null;
      cfg.status=data.status||cfg.status;
      cfg.promoEndsAt=data.promoEndsAt||null;
      cfg.promoExpired=Boolean(data.promoExpired);
      cfg.triggers=cfg.triggers||{};
      if(data.lowStockThreshold!=null)cfg.triggers.lowStockThreshold=Number(data.lowStockThreshold);
      cfg.checkout=cfg.checkout||{};
      cfg.checkout.enabled=Boolean(data.checkoutEnabled);
      if(Array.isArray(data.addons)){
        data.addons.forEach(a=>{
          const u=upsells.find(x=>x.code===a.code);
          if(u)Object.assign(u,a);
          else upsells.push({...a,text:a.description||'',features:[]});
        });
        renderUpsells();
      }
      const gatewayNote=q('[data-gateway-note]');if(gatewayNote)gatewayNote.hidden=!Boolean(data.providerConfigured);
      if(cfg.fulfillment&&data.fulfillmentEta)cfg.fulfillment.eta=data.fulfillmentEta;
      paintCommercialState();
      paintCheckoutState();
      refreshAddonUI();
    }catch(err){
      if(attempt<3){
        const delays=[350,900,1800,3000];
        setTimeout(()=>syncOfferState(attempt+1),delays[attempt]||3000);
        return;
      }
      if(buy){
        buy.disabled=false;
        buy.textContent='Tentar novamente →';
        buy.title='Não foi possível verificar a disponibilidade agora.';
        buy.onclick=()=>{
          buy.disabled=true;
          buy.textContent='Verificando disponibilidade...';
          buy.onclick=null;
          syncOfferState(0);
        };
      }
    }
  }
  syncOfferState();
  function getCheckoutKey(){
    const key='pe_checkout_'+cfg.slug;
    let value=sessionStorage.getItem(key)||'';
    if(!value){
      value=globalThis.crypto?.randomUUID?.()||('pe_'+Date.now()+'_'+Math.random().toString(36).slice(2));
      sessionStorage.setItem(key,value);
    }
    return value;
  }
  form?.addEventListener('submit',async ev=>{
    ev.preventDefault();
    if(!cfg.checkout?.enabled) return;
    const fd=new FormData(form);
    const payload={
      offer:cfg.slug,
      name:String(fd.get('name')||'').trim(),
      email:String(fd.get('email')||'').trim(),
      phone:String(fd.get('phone')||'').trim(),
      document:String(fd.get('document')||'').trim(),
      addonCode:selectedAddon||'',
      checkoutKey:getCheckoutKey()+(selectedAddon?('-'+selectedAddon):'-base'),
      acquisition:readAcquisition()
    };
    const submit=form.querySelector('button[type="submit"]'); submit.disabled=true; status.textContent='Criando pedido e Pix...';
    try{
      const response=await fetch(cfg.checkout.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error||'Não foi possível criar o pedido.');
      if(result.orderUrl){
        try{localStorage.setItem('pe_pending_order_'+cfg.slug,JSON.stringify({url:result.orderUrl,at:Date.now()}));}catch{}
        try{window.PETracking?.send?.('pix_generated',('offer:'+cfg.slug).slice(0,80));}catch{}
        try{if(typeof window.gtag==='function')window.gtag('event','pix_generated',{currency:'BRL',value:checkoutTotalCents()/100});}catch{}
        trackOfferEvent('AddPaymentInfo',{value:checkoutTotalCents()/100,currency:'BRL',content_name:checkoutTitle(),content_ids:[cfg.slug],content_type:'product'});
        location.href=result.orderUrl;return;
      }
      status.textContent='Pedido criado. Preparando o Pix...';
    }catch(err){
      const msg=err instanceof Error?err.message:'Falha ao criar o pedido.';
      const friendly={checkout_not_ready:'Esta oferta ainda não foi liberada.',promotion_expired:'Esta condição promocional encerrou. Confira a oferta atualizada.',payment_provider_not_configured:'Pagamento ainda não configurado.',payment_creation_failed:'Não foi possível gerar o Pix. Tente novamente.',payment_provider_unavailable:'O provedor de pagamento está indisponível no momento.',offer_sold_out:'Este lote está esgotado.',addon_sold_out:'O complemento selecionado esgotou. Você pode continuar somente com a oferta principal.',invalid_addon:'O adicional selecionado não está disponível agora.'};
      status.textContent=friendly[msg]||msg;
      submit.disabled=false;
    }
  });
  function readAcquisition(){
    const params=new URLSearchParams(location.search);
    const get=k=>params.get(k)||sessionStorage.getItem('pe_'+k)||'';
    let firstParty={};try{firstParty=window.PETracking?.acquisition?.()||{}}catch{}
    return {
      source:get('utm_source')||firstParty.source||'',medium:get('utm_medium')||firstParty.medium||'',
      campaign:get('utm_campaign')||firstParty.campaign||'',content:get('utm_content')||firstParty.content||'',
      term:get('utm_term')||firstParty.term||'',entry:firstParty.entry||location.pathname+location.search,
      visitId:firstParty.visitId||sessionStorage.getItem('pe_visit_id')||'',
      reference:firstParty.reference||(('PE-'+(sessionStorage.getItem('pe_contact_ref')||''))).replace(/^PE-$/,''),
      marketingConsent:Boolean(firstParty.marketingConsent)
    };
  }
  function showPurchaseToasts(rows){
    if(!Array.isArray(rows)||!rows.length) return;
    let index=0,toast=null,timer=null;
    const show=()=>{
      toast?.remove();
      const x=rows[index++%rows.length];
      toast=document.createElement('aside');toast.className='purchase-toast';toast.setAttribute('role','status');
      const dot=document.createElement('span');dot.className='purchase-toast-dot';
      const body=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');
      strong.textContent=(x.name||'Cliente')+' confirmou uma compra';
      small.textContent=x.when||'recentemente';
      body.append(strong,small);toast.append(dot,body);document.body.append(toast);
      requestAnimationFrame(()=>toast.classList.add('show'));
      setTimeout(()=>{toast?.classList.remove('show');setTimeout(()=>toast?.remove(),350);},5200);
    };
    setTimeout(()=>{show();timer=setInterval(show,22000);},5000);
    addEventListener('pagehide',()=>timer&&clearInterval(timer),{once:true});
  }
  async function loadProof(){
    if(cfg.triggers?.recentProof===false||!cfg.recentEndpoint) return;
    try{
      const response=await fetch(cfg.recentEndpoint+'?offer='+encodeURIComponent(cfg.slug),{credentials:'omit'});
      if(!response.ok) return;
      const data=await response.json(), rows=Array.isArray(data?.orders)?data.orders:[];
      if(!rows.length) return;
      const section=q('[data-proof-section]'), list=q('[data-purchases]'); section.hidden=false;
      rows.slice(0,4).forEach(x=>{
        const item=document.createElement('article'); item.className='purchase-item';
        const avatar=document.createElement('span'); avatar.className='purchase-avatar'; avatar.textContent=(x.name||'?').slice(0,1).toUpperCase();
        const body=document.createElement('div'), strong=document.createElement('strong'), p=document.createElement('p');
        strong.textContent=x.name||'Cliente'; p.textContent='Compra confirmada '+(x.when||'recentemente'); body.append(strong,p);
        const dot=document.createElement('span'); dot.className='paid-dot'; dot.setAttribute('aria-label','Pagamento confirmado');
        item.append(avatar,body,dot); list.append(item);
      });
      showPurchaseToasts(rows);
    }catch{}
  }
  function pendingOrder(){
    try{
      const raw=localStorage.getItem('pe_pending_order_'+cfg.slug);if(!raw)return null;
      const x=JSON.parse(raw);if(!x?.url||!x?.at||Date.now()-Number(x.at)>2*60*60*1000){localStorage.removeItem('pe_pending_order_'+cfg.slug);return null;}
      return x;
    }catch{return null;}
  }
  function setupIntentBar(){
    const pending=pendingOrder();
    let hadIntent=false;try{const at=Number(sessionStorage.getItem('pe_offer_intent_'+cfg.slug)||0);hadIntent=at>0&&Date.now()-at<24*60*60*1000;}catch{}
    if(!pending&&!cfg.checkout?.enabled&&!hadIntent)return;
    const bar=document.createElement('aside');bar.className='offer-intent-bar';bar.hidden=true;
    const copy=document.createElement('div');copy.className='offer-intent-copy';
    const strong=document.createElement('strong'),small=document.createElement('small');
    const action=document.createElement(pending?'a':'button');action.className='button primary';
    if(pending){
      strong.textContent='Você já tem um pedido em andamento';
      small.textContent='Acompanhe o Pix e a confirmação do pagamento.';
      action.textContent='Acompanhar pedido →';action.href=pending.url;
    }else{
      strong.textContent=hadIntent?'Retome sua oferta':'Oferta disponível';
      small.textContent=cfg.priceCents!=null?money(cfg.priceCents)+' via Pix':'Confira as condições atuais.';
      action.type='button';action.textContent=hadIntent?'Retomar checkout →':'Comprar com Pix →';
      action.addEventListener('click',()=>buy?.click());
    }
    copy.append(strong,small);bar.append(copy,action);document.body.append(bar);
    const checkout=q('#checkout');
    const refresh=()=>{
      const rect=checkout?.getBoundingClientRect();
      const checkoutVisible=rect&&rect.top<innerHeight&&rect.bottom>0;
      bar.hidden=Boolean(checkoutVisible||dialog?.open||scrollY<Math.min(420,innerHeight*.45));
    };
    addEventListener('scroll',refresh,{passive:true});addEventListener('resize',refresh,{passive:true});
    dialog?.addEventListener('close',refresh);refresh();
  }
  function setupMotion(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const items=qa('.section-head,.benefit-card,.step-card,.activation-art,.activation-copy,.trust-band article,.faq details,.closing,.checkout-card');
    items.forEach((el,i)=>{el.classList.add('pe-reveal');el.style.setProperty('--reveal-delay',Math.min(i%6,5)*55+'ms');});
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}}),{threshold:.12,rootMargin:'0px 0px -40px'});
    items.forEach(el=>io.observe(el));
  }
  loadProof();
  setupIntentBar();
  setupMotion();
})();

;(()=>{
  try{
    const anchor=document.querySelector('[data-gateway-note]');
    if(anchor&&!document.querySelector('.recover-order-link')){
      const a=document.createElement('a');
      a.className='recover-order-link';
      a.href='/ofertas/recuperar/?offer='+encodeURIComponent(String(cfg.slug||''));
      a.textContent='Já comprou? Recuperar meu pedido';
      anchor.insertAdjacentElement('afterend',a);
    }
  }catch{}
})();


;(()=>{
  try{
    if(!document.body.classList.contains('offer-google-ai')) return;
    const video=document.querySelector('.video-device video');
    if(!video) return;
    const keepMuted=()=>{ video.muted=true; video.defaultMuted=true; };
    keepMuted();
    video.addEventListener('loadedmetadata',keepMuted);
    video.addEventListener('play',keepMuted);
    video.addEventListener('volumechange',()=>{ if(!video.muted) keepMuted(); });
  }catch{}
})();

;(()=>{
  try{
    document.querySelectorAll('.video-device').forEach(box=>{
      const cover=box.querySelector('.video-cover'), video=box.querySelector('video');
      if(!cover||!video)return;
      const mute=()=>{video.muted=true;video.defaultMuted=true;};
      mute();
      cover.addEventListener('click',async()=>{
        mute();box.classList.add('is-playing');
        try{await video.play();}catch{box.classList.remove('is-playing');}
      });
      video.addEventListener('play',()=>{mute();box.classList.add('is-playing');});
      video.addEventListener('volumechange',mute);
      video.addEventListener('ended',()=>{mute();video.currentTime=0;box.classList.remove('is-playing');});
    });
  }catch{}
})();
