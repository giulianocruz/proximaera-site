/* Página Fecha Negócio: variantes explícitas de mensagens, sem trocar a oferta. */
(()=>{
  const query=new URLSearchParams(location.search);
  const raw=(query.get('utm_content')||'').toLowerCase();
  const variant=raw.includes('criativo_01_aprova')||raw.includes('anuncio_profissional')?'anuncio_profissional':raw.includes('aprova')?'aprova_depois':raw.includes('credib')?'credibilidade':raw.includes('preco')?'preco':'padrao';
  const messages={
    anuncio_profissional:{
      h:'Sua página <span>profissional</span> por R$ 79,90.',
      p:'Nós criamos uma página para apresentar seus serviços e receber contatos no WhatsApp. Você vê uma prévia, aprova e só então paga.',
      c:'Quero minha página por R$ 79,90 ↗'
    },
    aprova_depois:{
      h:'Veja sua página. <span>Aprove.</span> Só depois pague.',
      p:'Nós montamos a prévia do plano Profissional por R$ 79,90. Você confere antes de pagar e só publicamos após a confirmação do pagamento.',
      c:'Quero receber minha prévia ↗'
    },
    credibilidade:{
      h:'Seu negócio merece uma presença <span>profissional.</span>',
      p:'Organize serviços, informações e WhatsApp em uma página comercial feita para facilitar o contato dos seus clientes. Plano Profissional por R$ 79,90.',
      c:'Quero profissionalizar meu negócio ↗'
    },
    preco:{
      h:'Sua página profissional por <span>R$ 79,90.</span>',
      p:'Uma página adaptada para celular, com seus serviços e WhatsApp em destaque. A Próxima Era prepara a prévia para você aprovar antes de pagar.',
      c:'Pedir minha página profissional ↗'
    }
  };
  const message=messages[variant];
  const hero=document.querySelector('.hero-copy');
  const h=hero?.querySelector('h1');
  const p=hero?.querySelector('.lead');
  const c=hero?.querySelector('.hero-actions .button.primary');
  if(message){
    if(h)h.innerHTML=message.h;
    if(p)p.textContent=message.p;
    if(c)c.textContent=message.c;
  }
  document.documentElement.dataset.heroVariant=variant;
  try{sessionStorage.setItem('pe_hero_variant',variant)}catch{}
})();
