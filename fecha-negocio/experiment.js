(()=>{
  const q=new URLSearchParams(location.search);
  const raw=(q.get('utm_content')||'').toLowerCase();
  const variant=raw.includes('aprova')?'aprova_depois':raw.includes('credib')?'credibilidade':'preco';
  const variants={
    preco:{
      h:'Uma página profissional por <span>R$ 79,90.</span><br>Você vê pronta antes de pagar.',
      p:'Para autônomos e pequenos negócios que precisam apresentar serviços, transmitir confiança e levar o cliente direto para o WhatsApp — sem comprar no escuro.',
      cta:'Quero começar pelo WhatsApp →'
    },
    aprova_depois:{
      h:'Você vê sua página pronta.<br><span>Aprova.</span> E só depois paga.',
      p:'Sem comprar no escuro. A Próxima Era monta sua página profissional, você confere o resultado e o pagamento de R$ 79,90 só acontece depois da sua aprovação.',
      cta:'Quero ver minha página pronta →'
    },
    credibilidade:{
      h:'Seu negócio parece <span>profissional</span> na internet?',
      p:'Organize serviços, WhatsApp, redes e informações em uma página simples e profissional para o cliente entender rápido por que falar com você.',
      cta:'Quero profissionalizar meu negócio →'
    }
  };
  const v=variants[variant];
  const h=document.querySelector('.hero h1'),p=document.querySelector('.hero .lead'),cta=document.querySelector('.hero .button.primary');
  if(h)h.innerHTML=v.h;if(p)p.textContent=v.p;if(cta)cta.textContent=v.cta;
  document.documentElement.dataset.heroVariant=variant;
  try{sessionStorage.setItem('pe_hero_variant',variant)}catch{}
})();