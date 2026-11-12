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
  // Prévia consistente com Studio Aurora: 3 assets WebP, sem iframe.
  // Os sites completos continuam disponíveis pelo CTA de demonstração.
  const visual=target.querySelector('.premium-showcase-image');
  const previewArts={
    beauty:{
      src:'../assets/premium/fecha-hero-v2.webp',
      alt:'Conceito visual ilustrativo do site Studio Aurora, beleza e autocuidado'
    },
    service:{
      src:'../assets/premium/fecha-ramos-premium-v3.webp',
      alt:'Conceito visual ilustrativo do site Ramos Elétrica, serviços elétricos'
    },
    consult:{
      src:'../assets/premium/fecha-vertice-premium-v3.webp',
      alt:'Conceito visual ilustrativo do site Vértice Consultoria, consultoria estratégica'
    }
  };

  function select(name,scroll){
    const s=samples[name];
    if(!s)return;
    for(const k of ['url','brand','kicker','title','description','action']){
      if(cells[k])cells[k].textContent=s[k];
    }
    for(let i=0;i<3;i++)if(cells.items[i])cells.items[i].textContent=s.items[i];
    canvas.setAttribute('data-template-theme',s.theme);
    target.dataset.showcase=name;
    const art=previewArts[name];
    if(visual&&art){
      if(visual.getAttribute('src')!==art.src)visual.src=art.src;
      visual.alt=art.alt;
      visual.dataset.model=name;
    }

    const complete=document.querySelector("[data-demo-full]");
    if(complete){
      const route=name==='service'?'modelos/servicos/':name==='consult'?'modelos/consultoria/':'modelos/?segment=beleza';
      const dest=new URL(route,location.href);
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
    if(scroll)requestAnimationFrame(()=>{
      // A altura da prévia muda conforme o modelo. Calcular a rolagem
      // depois do layout evita esconder o seletor atrás do header fixo.
      const header=document.querySelector('.site-header');
      const headerHeight=header?Math.ceil(header.getBoundingClientRect().height):76;
      const top=target.getBoundingClientRect().top+window.scrollY-headerHeight-16;
      window.scrollTo({
        top:Math.max(0,Math.round(top)),
        behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'
      });
    });
  }
  document.querySelectorAll('.preview-switcher [data-template]').forEach(btn=>{
    btn.addEventListener('click',()=>select(btn.dataset.template,false));
  });
  document.querySelectorAll('[data-preview]').forEach(btn=>{
    const label=btn.querySelector('.example-view');
    if(label)label.textContent='Ver prévia nesta página ↓';
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
