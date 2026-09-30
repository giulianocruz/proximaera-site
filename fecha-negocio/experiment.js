(()=>{
  const q=new URLSearchParams(location.search);
  const raw=(q.get('utm_content')||'').toLowerCase();
  const variant=(raw.includes('criativo_01_aprova')||raw.includes('anuncio_profissional'))?'anuncio_profissional':raw.includes('aprova')?'aprova_depois':raw.includes('credib')?'credibilidade':'preco';
  const variants={
    preco:{
      h:'Sua presença profissional começa <span>grátis.</span><br>E cresce com o seu negócio.',
      p:'Crie uma página comercial para apresentar seus serviços e levar clientes ao WhatsApp. Comece no Free ou escolha uma versão feita pela Próxima Era.',
      cta:'Escolher meu plano →'
    },
    aprova_depois:{
      h:'Comece grátis ou veja sua página <span>pronta</span> antes de pagar.',
      p:'Use o plano Free ou deixe a Próxima Era montar a versão Profissional. Você confere o resultado e só paga os R$ 79,90 depois de aprovar.',
      cta:'Comparar os planos →'
    },
    anuncio_profissional:{
      h:'Sua página <span>profissional</span> por R$ 79,90.',
      p:'Mostre seus serviços, organize seus contatos e facilite o atendimento pelo WhatsApp. Nós montamos a página, você confere e só paga depois de aprovar.',
      cta:'Quero minha página no WhatsApp →'
    },
    credibilidade:{
      h:'Seu negócio merece uma presença <span>profissional.</span>',
      p:'Reúna serviços, WhatsApp, redes e informações em uma página clara. Escolha entre Free, Profissional e Premium.',
      cta:'Encontrar meu plano →'
    }
  };
  const v=variants[variant];
  const h=document.querySelector('.hero h1'),p=document.querySelector('.hero .lead'),cta=document.querySelector('.hero .button.primary');
  if(h)h.innerHTML=v.h;if(p)p.textContent=v.p;if(cta)cta.textContent=v.cta;
  if(variant==='anuncio_profissional'){
    const price=document.querySelector('.hero-price');
    if(price){
      const small=price.querySelector('small'),strong=price.querySelector('strong'),note=price.querySelector('span');
      if(small)small.textContent='Plano Profissional';
      if(strong)strong.textContent='R$ 79,90';
      if(note)note.textContent='Pagamento único • você aprova antes de pagar';
    }
    const whatsapp='https://wa.me/5514996428874?text=Ol%C3%A1%21%20Vi%20o%20an%C3%BAncio%20da%20Pr%C3%B3xima%20Era%20e%20quero%20o%20plano%20Profissional%20da%20P%C3%A1gina%20Fecha%20Neg%C3%B3cio%20por%20R%24%2079%2C90.';
    if(cta){
      cta.href=whatsapp;cta.target='_blank';cta.rel='noopener';
      cta.dataset.track='anuncio-profissional-whatsapp-hero';
    }
    const sticky=document.querySelector('.mobile-buy');
    if(sticky){
      const amount=sticky.querySelector('strong'),link=sticky.querySelector('a');
      if(amount)amount.textContent='Profissional R$ 79,90';
      if(link){
        link.href=whatsapp;link.textContent='Falar no WhatsApp';
        link.target='_blank';link.rel='noopener';
        link.dataset.track='anuncio-profissional-whatsapp-mobile';
      }
    }
  }
  document.documentElement.dataset.heroVariant=variant;
  try{sessionStorage.setItem('pe_hero_variant',variant)}catch{}
})();