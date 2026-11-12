/* Exemplos fictícios da Próxima Era. Sem capturar dados ou simular atendimento do cliente. */
(()=>{
  const demo=document.body.dataset.demo;
  if(!['servicos','consultoria'].includes(demo))return;
  const params=new URLSearchParams(location.search);
  const utms=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  for(const back of document.querySelectorAll('[data-demo-return]')){
    const dest=new URL('../../',location.href);
    for(const key of utms)if(params.has(key))dest.searchParams.set(key,params.get(key));
    dest.hash='demonstracao';
    back.href=dest.href;
  }
  const brand=demo==='servicos'?'Ramos Elétrica':'Vértice Consultoria';
  const contact=document.querySelector('[data-demo-convert]');
  if(contact){
    const msg='Olá! Vi a demonstração fictícia '+brand+' no site Próxima Era e gostaria de uma página profissional para meu negócio.';
    const url=new URL('https://wa.me/5514998193831');
    url.searchParams.set('text',msg);
    contact.href=url.href;
    contact.setAttribute('aria-label','Conversar com a Próxima Era sobre uma página semelhante ao modelo '+brand);
  }
})();
