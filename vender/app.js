const WHATSAPP='5514920077743';
const PRODUCTS={
  pagina:{name:'Página Fecha Negócio',price:79.90,action:'page',url:'../fecha-negocio/'},
  clientes:{name:'Primeiros Clientes',price:29.90,action:'page',url:'../primeiros-clientes/'},
  fecha:{name:'Fecha Venda',price:19.90,action:'page',url:'../fecha-venda/'},
  divulgacao:{name:'Divulgação Express',price:19.90,action:'page',url:'../divulgacao-express/'},
  cobranca:{name:'Cobrança Profissional',price:19.90,action:'page',url:'../cobranca-profissional/'},
  comecar:{name:'Comece a Vender',price:29.90,action:'page',url:'../comece-a-vender/'}
};
const PAINS={
  clientes:{title:'Você precisa organizar sua prospecção.',copy:'Se pouca gente chega até você, o primeiro passo é criar uma rotina simples para encontrar, abordar e acompanhar potenciais clientes.',bullets:['Mensagens de abordagem','Follow-up sem improviso','Modelo de proposta','Base simples de precificação'],product:'clientes'},
  sumiram:{title:'Seu gargalo está entre o preço e o fechamento.',copy:'Quando o cliente pede valor e desaparece, apresentar melhor a proposta e acompanhar a conversa pode reduzir oportunidades perdidas.',bullets:['Proposta mais clara','Roteiro de fechamento','Follow-ups','Respostas a objeções'],product:'fecha'},
  amador:{title:'Sua presença comercial precisa parecer tão boa quanto seu trabalho.',copy:'Depender apenas de mensagens e redes sociais pode deixar informações importantes espalhadas. Uma página própria organiza sua apresentação.',bullets:['Página profissional','Serviços e contatos organizados','Visual pensado para celular','Você aprova antes de pagar'],product:'pagina'},
  divulgar:{title:'Você precisa de uma rotina simples de divulgação.',copy:'O problema não é publicar o tempo todo. É saber o que dizer, para quem e com qual chamada para ação.',bullets:['30 ideias de conteúdo','Textos de divulgação','Bio comercial','Chamadas para ação'],product:'divulgacao'},
  cobranca:{title:'Sua cobrança precisa virar processo, não constrangimento.',copy:'Cobrar com clareza e consistência ajuda você a não esquecer valores e evita mensagens improvisadas em momentos delicados.',bullets:['Sequência de lembretes','Mensagens profissionais','Controle simples','Modelo de acordo amigável'],product:'cobranca'},
  comecar:{title:'Você precisa transformar vontade em uma oferta concreta.',copy:'Antes de pensar em logo ou anúncio, defina o que vender, por quanto, como apresentar e como começar a abordar pessoas.',bullets:['Ideias de serviços','Precificação inicial','Oferta e apresentação','Materiais comerciais'],product:'comecar'}
};const money=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const field=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
function whatsappUrl(product){
  const msg=`Olá! Vim pelo site da Próxima Era e quero saber mais sobre ${product.name} por ${money(product.price)}.`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}
function goToProduct(key){
  const p=PRODUCTS[key]; if(!p)return;
  if(p.action==='page'){location.href=p.url;return;}
  window.open(whatsappUrl(p),'_blank','noopener');
}
function showPain(key){
  const pain=PAINS[key]; if(!pain)return;
  const product=PRODUCTS[pain.product];
  field('resultTitle',pain.title); field('resultCopy',pain.copy);
  field('resultProduct',product.name); field('resultPrice',money(product.price));
  const list=document.getElementById('resultBullets');
  if(list)list.innerHTML=pain.bullets.map(x=>`<li>${x}</li>`).join('');
  const buy=document.getElementById('resultBuy'); if(buy)buy.dataset.product=pain.product;
  const panel=document.getElementById('resultPanel'); if(panel){panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'center'});}
  try{localStorage.setItem('pe_vender_dor',key);}catch{}
}document.querySelectorAll('.pain-card').forEach(btn=>btn.addEventListener('click',()=>showPain(btn.dataset.pain)));
document.getElementById('changePain')?.addEventListener('click',()=>{
  const panel=document.getElementById('resultPanel'); if(panel)panel.hidden=true;
  document.querySelector('.pain-grid')?.scrollIntoView({behavior:'smooth',block:'center'});
});
document.querySelectorAll('.buy-trigger').forEach(btn=>btn.addEventListener('click',()=>goToProduct(btn.dataset.product)));
const savedPain=(()=>{try{return localStorage.getItem('pe_vender_dor')}catch{return null}})();
if(savedPain&&PAINS[savedPain])document.querySelector(`[data-pain="${savedPain}"]`)?.classList.add('was-selected');
