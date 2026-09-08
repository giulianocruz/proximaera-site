(()=>{
  const q=new URLSearchParams(location.search);
  const key=(q.get('utm_content')||'').toLowerCase();
  const hero=document.querySelector('.hero-copy');
  if(!hero)return;
  const h1=hero.querySelector('h1'),lead=hero.querySelector('.lead'),cta=hero.querySelector('.button.primary');
  const variants={
    aprova_depois:{h:'Você vê pronta. <span>Aprova.</span><br>E só depois paga.',l:'Sua página profissional é montada primeiro para você conferir. Se gostar e aprovar, aí sim você paga os R$ 79,90.',c:'Quero ver minha página pronta →'},
    credibilidade:{h:'Seu negócio parece <span>profissional</span> na internet?',l:'Organize serviços, contatos, redes e WhatsApp em uma página simples para transmitir mais confiança quando alguém pesquisar sua empresa.',c:'Quero profissionalizar meu negócio →'},
    preco:{h:'Sua página profissional por <span>R$ 79,90.</span>',l:'Uma apresentação bonita, responsiva e pronta para divulgar — com seus serviços e WhatsApp em destaque. Você aprova antes de pagar.',c:'Quero minha página por R$ 79,90 →'}
  };
  const v=variants[key];
  if(v){h1.innerHTML=v.h;lead.textContent=v.l;cta.textContent=v.c;document.body.dataset.heroVariant=key;}
  const cityKey=(q.get('utm_term')||'').toLowerCase().replace(/[^a-z]/g,'');
  const cities={botucatu:'Botucatu',bauru:'Bauru',avare:'Avaré',sorocaba:'Sorocaba'};
  const badge=document.getElementById('regionBadge');
  if(badge&&cities[cityKey]){badge.textContent=`Atendimento online para ${cities[cityKey]} e região`;document.body.dataset.region=cityKey;}
})();