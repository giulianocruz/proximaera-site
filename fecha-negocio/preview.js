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
  // As duas páginas completas aparecem dentro da própria landing:
  // iframe visual de mesma origem, isolado e SEM execução de scripts,
  // evitando contagem duplicada de tracking e cliques acidentais.
  const premiumFigure=target.querySelector('.premium-showcase');
  const livePreview=document.createElement('div');
  livePreview.className='demo-live-site';
  livePreview.setAttribute('aria-label','Prévia visual do site selecionado');
  const liveToolbar=document.createElement('div');
  liveToolbar.className='demo-live-site-toolbar';
  const liveDots=document.createElement('span');
  liveDots.className='demo-live-site-dots';
  liveDots.setAttribute('aria-hidden','true');
  liveDots.textContent='● ● ●';
  const liveTitle=document.createElement('strong');
  liveTitle.className='demo-live-site-title';
  liveToolbar.append(liveDots,liveTitle);
  const liveStage=document.createElement('div');
  liveStage.className='demo-live-site-stage';
  const liveFrame=document.createElement('iframe');
  liveFrame.className='demo-live-site-frame';
  liveFrame.setAttribute('sandbox','');
  liveFrame.setAttribute('tabindex','-1');
  liveFrame.setAttribute('aria-hidden','true');
  liveFrame.setAttribute('title','Visualização não interativa do site demonstrativo');
  liveFrame.setAttribute('loading','lazy');
  liveStage.append(liveFrame);
  const liveCaption=document.createElement('p');
  liveCaption.className='demo-live-site-caption';
  liveCaption.textContent='Prévia do site real de demonstração. Use o botão abaixo para navegar pelo modelo completo.';
  livePreview.append(liveToolbar,liveStage,liveCaption);
  if(premiumFigure)premiumFigure.insertAdjacentElement('afterend',livePreview);

  let activeTemplate='beauty';
  function fitLivePreview(){
    if(activeTemplate==='beauty')return;
    const isMobile=matchMedia('(max-width:740px)').matches;
    const virtualWidth=isMobile?390:1120;
    const virtualHeight=isMobile?790:755;
    const available=liveStage.clientWidth;
    if(!available)return;
    const scale=Math.min(1,available/virtualWidth);
    liveFrame.style.width=virtualWidth+'px';
    liveFrame.style.height=virtualHeight+'px';
    liveFrame.style.transform='scale('+scale+')';
    liveStage.style.height=Math.ceil(virtualHeight*scale)+'px';
  }
  window.addEventListener('resize',fitLivePreview,{passive:true});
  function select(name,scroll){
    const s=samples[name];
    if(!s)return;
    for(const k of ['url','brand','kicker','title','description','action']){
      if(cells[k])cells[k].textContent=s[k];
    }
    for(let i=0;i<3;i++)if(cells.items[i])cells.items[i].textContent=s.items[i];
    canvas.setAttribute('data-template-theme',s.theme);
    // Studio Aurora mantém a arte ilustrativa; Serviços e Consultoria
    // mostram uma prévia fiel das páginas completas, dentro da landing.
    activeTemplate=name;
    target.dataset.showcase=name;
    const visual=target.querySelector('.premium-showcase-image');
    if(visual&&name==='beauty'){
      visual.src='../assets/premium/fecha-hero-v2.webp';
      visual.alt='Modelo ilustrativo Studio Aurora: página profissional para beleza e autocuidado';
    }
    if(name==='service'||name==='consult'){
      liveTitle.textContent=name==='service'?'Ramos Elétrica · demonstração':'Vértice Consultoria · demonstração';
      const route=name==='service'?'modelos/servicos/':'modelos/consultoria/';
      const source=new URL(route,location.href).href;
      if(liveFrame.dataset.model!==name){
        liveFrame.src=source;
        liveFrame.dataset.model=name;
      }
      requestAnimationFrame(fitLivePreview);
    }else if(liveFrame.dataset.model){
      liveFrame.removeAttribute('src');
      delete liveFrame.dataset.model;
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
      fitLivePreview();
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
