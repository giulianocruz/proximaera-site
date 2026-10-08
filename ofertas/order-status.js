(()=>{
  const q=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  const id=params.get("id")||"";
  const title=q("[data-order-title]"),status=q("[data-order-status]"),message=q("[data-order-message]");
  const amount=q("[data-order-amount]"),eta=q("[data-order-eta]"),orderId=q("[data-order-id]"),wa=q("[data-order-whatsapp]"),copyOrder=q("[data-copy-order-link]"),icon=q("[data-state-icon]");
  const pixPanel=q("[data-pix-panel]"),pixQr=q("[data-pix-qr]"),pixCode=q("[data-pix-code]"),pixExpiration=q("[data-pix-expiration]"),copyPix=q("[data-copy-pix]");
  const money=cents=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(cents||0)/100);
  function trackPurchase(o){
    // Apenas um estado de pagamento confirmado, obtido do backend, e considerado venda.
    if(!["paid","fulfillment","completed"].includes(o.status)||!o.id)return;
    const orderId=String(o.id);
    const amount=Number(o.amountCents||0)/100;
    const id="pe_purchase_"+orderId;
    const gaKey=id+"_ga4",metaKey=id+"_meta",layerKey=id+"_layer";
    const seen=(key)=>{try{return localStorage.getItem(key)==='1'}catch{return false}};
    const mark=(key)=>{try{localStorage.setItem(key,'1')}catch{}};
    const params={value:amount,currency:"BRL",content_name:o.title,order_id:orderId};
    const fireGa=()=>{
      if(seen(gaKey)||typeof window.gtag!=="function")return;
      try{
        window.gtag("event","purchase",{transaction_id:orderId,value:amount,currency:"BRL",
          items:[{item_id:String(o.offer||"oferta"),item_name:o.title||"Oferta digital",price:amount,quantity:1}]});
        mark(gaKey);
      }catch{}
    };
    const fireMeta=()=>{
      if(seen(metaKey)||typeof window.fbq!=="function")return;
      try{window.fbq("track","Purchase",params,{eventID:id});mark(metaKey)}catch{}
    };
    fireGa();fireMeta();
    if(!seen(gaKey))window.addEventListener('pe:ga-ready',fireGa,{once:true});
    if(!seen(metaKey))window.addEventListener('pe:meta-ready',fireMeta,{once:true});
    if(!seen(layerKey)){
      try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:"Purchase",...params});mark(layerKey)}catch{}
    }
  }
  const labels={created:"Pedido criado",awaiting_payment:"Aguardando pagamento",paid:"Pagamento confirmado",fulfillment:"Ativação em andamento",completed:"Pedido concluído",canceled:"Pedido cancelado"};
  const messages={created:"Seu pedido foi registrado e está aguardando a geração do pagamento.",awaiting_payment:"Escaneie o QR Code ou use o Pix Copia e Cola. A confirmação é automática.",paid:"Pagamento confirmado. O canal de ativação já está liberado.",fulfillment:"Sua ativação está em andamento com o responsável.",completed:"Pedido concluído. Guarde esta página como referência.",canceled:"Este pedido foi cancelado e não seguirá para ativação."};
  copyPix?.addEventListener("click",async()=>{
    const value=pixCode?.value||"";if(!value)return;
    try{await navigator.clipboard.writeText(value);copyPix.textContent="Código Pix copiado ✓";setTimeout(()=>copyPix.textContent="Copiar código Pix",1800)}catch{pixCode?.select();document.execCommand("copy");}
  });
  copyOrder?.addEventListener("click",async()=>{
    const url=location.href;
    try{await navigator.clipboard.writeText(url);copyOrder.textContent="Link do pedido copiado ✓";setTimeout(()=>copyOrder.textContent="Copiar link deste pedido",1800)}catch{}
  });
  function paintPix(o){
    const pix=o.pix;
    const waiting=["created","awaiting_payment"].includes(o.status);
    if(!pix||!waiting||(!pix.code&&!pix.qrBase64&&!pix.ticketUrl)){pixPanel.hidden=true;return;}
    pixPanel.hidden=false;
    if(pix.code)pixCode.value=pix.code;else pixCode.value="";
    if(pix.qrBase64){pixQr.src=pix.qrBase64.startsWith("data:")?pix.qrBase64:"data:image/png;base64,"+pix.qrBase64;pixQr.hidden=false;}else pixQr.hidden=true;
    pixExpiration.textContent=pix.expiresAt?"Pix válido até "+new Date(pix.expiresAt).toLocaleString("pt-BR"):"A confirmação será atualizada automaticamente.";
  }
  async function load(){
    if(!id){title.textContent="Pedido não informado";status.textContent="Aguardando link do pedido";message.textContent="Abra esta página pelo link gerado após o checkout para acompanhar o pagamento e a ativação.";icon.textContent="?";return;}
    try{
      const r=await fetch("/api/offers/order?order="+encodeURIComponent(id),{cache:"no-store",credentials:"omit"});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data.order)throw new Error("Pedido não encontrado.");
      const o=data.order;
      try{if(data.metaPixelId)window.PEConfigureMetaPixel?.(data.metaPixelId);}catch{}
      title.textContent=o.title||"Pedido Próxima Era Ofertas";
      orderId.textContent="Pedido "+String(o.id||"").slice(0,8).toUpperCase();
      status.textContent=labels[o.status]||o.status||"Em atualização";
      message.textContent=messages[o.status]||"Consulte novamente em instantes.";
      amount.textContent=money(o.amountCents);eta.textContent=o.fulfillmentEta||"—";
      icon.textContent=["paid","fulfillment","completed"].includes(o.status)?"✓":o.status==="canceled"?"×":"•••";
      document.body.dataset.orderStatus=o.status||"";
      paintPix(o);
      trackPurchase(o);
      if(['paid','fulfillment','completed','canceled'].includes(o.status)){
        try{if(o.offer)localStorage.removeItem('pe_pending_order_'+o.offer);}catch{}
      }
      if(o.fulfillmentUrl){
        wa.href=o.fulfillmentUrl;wa.hidden=false;
        if(!wa.dataset.tracked){
          wa.dataset.tracked='1';
          wa.addEventListener('click',()=>{try{window.PETracking?.send?.('fulfillment_click',('offer:'+String(o.offer||'pedido')).slice(0,80));}catch{}});
        }
      }else wa.hidden=true;
      if(!["completed","canceled"].includes(o.status))setTimeout(load,5000);
    }catch(e){title.textContent="Não foi possível consultar o pedido";message.textContent=e instanceof Error?e.message:"Tente novamente em instantes.";setTimeout(load,10000);}
  }
  load();
})();

;(()=>{try{const x=new URLSearchParams(location.search).get('id');if(x)sessionStorage.setItem('pe_last_order_url',location.href)}catch{}})();
