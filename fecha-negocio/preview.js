/* Demonstrações comerciais: conteúdo ilustrativo, sem bibliotecas externas. */
(()=>{
  const samples={
    beauty:{
      url:'studioaurora.exemplo',
      brand:'STUDIO AURORA',
      kicker:'BELEZA E AUTOCUIDADO',
      title:'Realce sua beleza. Reserve seu momento.',
      description:'Atendimento personalizado, serviços apresentados com carinho e agendamento sem complicação.',
      items:['Cabelo','Estética','Manicure'],
      theme:'beauty',
      action:'Agendar pelo WhatsApp ↗'
    },
    service:{
      url:'ramos-eletrica.exemplo',
      brand:'RAMOS ELÉTRICA',
      kicker:'INSTALAÇÕES E MANUTENÇÃO',
      title:'Serviço bem feito começa com um bom atendimento.',
      description:'Soluções elétricas para sua casa ou empresa. Descubra o que fazemos e peça seu orçamento.',
      items:['Instalações','Reparos','Manutenção'],
      theme:'service',
      action:'Pedir orçamento ↗'
    },
    consult:{
      url:'vertice-consultoria.exemplo',
      brand:'VÉRTICE CONSULTORIA',
      kicker:'ESTRATÉGIA E NEGÓCIOS',
      title:'Clareza para suas próximas decisões.',
      description:'Consultoria personalizada para transformar desafios em planos de ação claros.',
      items:['Diagnóstico','Planejamento','Acompanhamento'],
      theme:'consult',
      action:'Agendar conversa ↗'
    }
  };
  const canvas=document.querySelector('.hero-demo .browser');
  const target=document.getElementById('demonstracao');
  if(!canvas||!target)return;
  const cells={
    url:canvas.querySelector('[data-demo-url]'),
    brand:canvas.querySelector('[data-demo-brand]'),
    kicker:canvas.querySelector('[data-demo-kicker]'),
    title:canvas.querySelector('[data-demo-title]'),
    description:canvas.querySelector('[data-demo-description]'),
    items:[1,2,3].map(n=>canvas.querySelector('[data-demo-service-'+n+']')),
    action:canvas.querySelector('.demo-cta-mock')
  };
  function select(name,scroll){
    const s=samples[name];
    if(!s)return;
    for(const k of ['url','brand','kicker','title','description','action']){
      if(cells[k])cells[k].textContent=s[k];
    }
    for(let i=0;i<3;i++)if(cells.items[i])cells.items[i].textContent=s.items[i];
    canvas.setAttribute('data-template-theme',s.theme);
    const complete=document.querySelector("[data-demo-full]");
    if(complete){
      const slug=name==='service'?'servicos':name==='consult'?'consultoria':'beleza';
      const dest=new URL('modelos/?segment='+slug,location.href);
      const qp=new URLSearchParams(location.search);
      for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){
        if(qp.has(key))dest.searchParams.set(key,qp.get(key));
      }
      complete.href=dest.href;
    }
    document.querySelectorAll('.preview-switcher [data-template]').forEach(btn=>{
      const chosen=btn.dataset.template===name;
      btn.classList.toggle('is-active',chosen);
      btn.setAttribute('aria-pressed',String(chosen));
    });
    if(scroll)target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }
  document.querySelectorAll('.preview-switcher [data-template]').forEach(btn=>{
    btn.addEventListener('click',()=>select(btn.dataset.template,false));
  });
  document.querySelectorAll('[data-preview]').forEach(btn=>{
    btn.addEventListener('click',()=>select(btn.dataset.preview,true));
  });
  // O CTA fixo só aparece depois que o CTA principal deixa a área visível.
  // Evita cobrir os controles da demonstração na primeira dobra do celular.
  const heroAction=document.querySelector('.hero-actions .button.primary');
  const sticky=document.querySelector('.mobile-buy');
  if(heroAction&&sticky&&'IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      document.body.classList.toggle('hero-cta-in-view',entries[0].isIntersecting);
    },{threshold:.25});
    observer.observe(heroAction);
  }
})();
