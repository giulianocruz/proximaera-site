/* Próxima Era — recuperar um pedido de qualquer oferta.
 * O pedido só deve ser localizado pelo backend após validação de e-mail e WhatsApp.
 */
(()=>{
  'use strict';
  const OFFER_URLS={
    'google-ai-pro':'/ofertas/google-ai-pro/',
    'canva-pro':'/ofertas/canva-pro/',
    'combo-criador':'/ofertas/combo-criador/'
  };
  const form=document.querySelector('[data-recovery-form]');
  const status=document.querySelector('[data-recovery-status]');
  const offer=form?.querySelector('[name="offer"]');
  const submit=form?.querySelector('button[type="submit"]');
  const back=document.querySelector('[data-back-to-offer]');
  if(!form||!status||!offer||!submit)return;

  const known=(slug)=>Object.prototype.hasOwnProperty.call(OFFER_URLS,slug);
  const queryOffer=new URLSearchParams(location.search).get('offer')||'';
  let sourceOffer='';
  try{
    const path=new URL(document.referrer).pathname;
    sourceOffer=Object.keys(OFFER_URLS).find(slug=>path.startsWith(OFFER_URLS[slug]))||'';
  }catch{}
  const preselected=known(queryOffer)?queryOffer:(known(sourceOffer)?sourceOffer:'');
  if(preselected)offer.value=preselected;

  const updateBackLink=()=>{
    if(back)back.href=known(offer.value)?OFFER_URLS[offer.value]:'/';
  };
  offer.addEventListener('change',updateBackLink);
  updateBackLink();

  const messages={
    order_not_found:'Não encontramos um pedido com esses dados.',
    invalid_data:'Confira o e-mail, o WhatsApp e a oferta selecionada.',
    rate_limited:'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  };
  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    if(submit.disabled)return;
    const slug=String(offer.value||'').trim();
    if(!known(slug)){
      status.textContent='Selecione a oferta comprada.';
      offer.focus();
      return;
    }
    const fd=new FormData(form);
    const email=String(fd.get('email')||'').trim();
    const phone=String(fd.get('phone')||'').trim();
    if(!email||!phone){
      status.textContent='Informe o e-mail e o WhatsApp usados na compra.';
      return;
    }

    submit.disabled=true;
    status.textContent='Procurando seu pedido...';
    try{
      const response=await fetch('/api/offers/recover',{
        method:'POST',
        headers:{'content-type':'application/json'},
        credentials:'omit',
        body:JSON.stringify({offer:slug,email,phone})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.orderUrl)throw new Error(data.error||'order_not_found');
      // Aceitar apenas links de acompanhamento sob o próprio domínio.
      const orderUrl=new URL(data.orderUrl,location.origin);
      if(orderUrl.origin!==location.origin||!orderUrl.pathname.startsWith('/ofertas/pedido/')){
        throw new Error('invalid_order_url');
      }
      status.textContent='Pedido encontrado. Abrindo acompanhamento...';
      location.assign(orderUrl.href);
    }catch(err){
      const code=err instanceof Error?err.message:'order_not_found';
      status.textContent=messages[code]||'Não foi possível recuperar o pedido agora.';
      submit.disabled=false;
    }
  });
})();