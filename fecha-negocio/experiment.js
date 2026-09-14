(()=>{
  const q=new URLSearchParams(location.search);
  const raw=(q.get('utm_content')||'').toLowerCase();
  const variant=raw.includes('aprova')?'aprova_depois':raw.includes('credib')?'credibilidade':'preco';
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
    credibilidade:{
      h:'Seu negócio merece uma presença <span>profissional.</span>',
      p:'Reúna serviços, WhatsApp, redes e informações em uma página clara. Escolha entre Free, Profissional e Premium.',
      cta:'Encontrar meu plano →'
    }
  };
  const v=variants[variant];
  const h=document.querySelector('.hero h1'),p=document.querySelector('.hero .lead'),cta=document.querySelector('.hero .button.primary');
  if(h)h.innerHTML=v.h;if(p)p.textContent=v.p;if(cta)cta.textContent=v.cta;
  document.documentElement.dataset.heroVariant=variant;
  try{sessionStorage.setItem('pe_hero_variant',variant)}catch{}
})();