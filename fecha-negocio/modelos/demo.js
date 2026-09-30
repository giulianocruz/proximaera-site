/* Demonstração fictícia, navegável e compartilhável, baseada no segmento escolhido. */
(()=>{
  const portfolio={
    beleza:{
      brand:'Studio Aurora',mono:'SA',kicker:'BELEZA E AUTOCUIDADO · EXEMPLO',
      title:'Realce sua beleza. Reserve seu momento.',
      description:'Uma apresentação delicada para mostrar seus serviços, organizar informações e facilitar novos agendamentos.',
      micro:'Uma página, seus serviços e um caminho direto para o contato.',
      primary:'Agendar atendimento ↗',mark:'✳',artText:'BELEZA NATURAL',artNote:'Um momento só seu',
      benefits:['Agendamento simples','Serviços bem apresentados','Contato sem complicação'],
      servicesTitle:'Cuidados para cada momento.',
      servicesIntro:'Uma vitrine para seus principais serviços. Seu cliente entende o que você oferece antes de entrar em contato.',
      services:[
        ['Cuidados capilares','Apresente tratamentos, cortes e finalizações com clareza.'],
        ['Estética facial','Mostre suas especialidades com uma descrição objetiva.'],
        ['Manicure e beleza','Reúna opções de atendimento e facilite os agendamentos.']
      ],
      aboutTitle:'Seu espaço, sua identidade.',
      aboutText:'Use este espaço para contar o que torna seu atendimento especial. Na página real, a Próxima Era adapta o conteúdo ao seu negócio, sem inventar avaliações ou resultados.',
      contactTitle:'Seu próximo agendamento começa aqui.',
      contactText:'Na versão do seu negócio, este espaço pode levar o visitante ao seu WhatsApp, com uma mensagem pronta para iniciar o atendimento.',
      theme:'#f9e8ee'
    },
    servicos:{
      brand:'Ramos Elétrica',mono:'RE',kicker:'INSTALAÇÃO E MANUTENÇÃO · EXEMPLO',
      title:'Seu problema resolvido. Atendimento sem complicação.',
      description:'Uma vitrine profissional para apresentar especialidades, esclarecer serviços e facilitar solicitações de orçamento.',
      micro:'Informações no lugar certo: o cliente entende o serviço e sabe por onde começar.',
      primary:'Pedir orçamento ↗',mark:'⌁',artText:'SERVIÇO CONFIÁVEL',artNote:'Soluções para sua rotina',
      benefits:['Serviços organizados','Solicitação de orçamento','Apresentação clara'],
      servicesTitle:'Soluções que fazem a diferença.',
      servicesIntro:'Apresente suas especialidades com textos objetivos e uma chamada de contato em destaque.',
      services:[
        ['Instalações elétricas','Mostre os tipos de instalação que sua equipe realiza.'],
        ['Reparos e manutenção','Explique seu atendimento de maneira direta e compreensível.'],
        ['Projetos especiais','Apresente opções sob orçamento conforme a necessidade do cliente.']
      ],
      aboutTitle:'Profissionalismo em cada detalhe.',
      aboutText:'Apresente a trajetória e os diferenciais reais da sua empresa. Textos, imagens e informações são personalizados com o material informado pelo contratante.',
      contactTitle:'Vamos conversar sobre seu projeto?',
      contactText:'Na página publicada para o seu negócio, o botão levaria o visitante ao WhatsApp da sua equipe para solicitar um orçamento.',
      theme:'#eaf5fc'
    },
    consultoria:{
      brand:'Vértice Consultoria',mono:'VC',kicker:'ESTRATÉGIA E NEGÓCIOS · EXEMPLO',
      title:'Clareza para decidir. Estratégia para avançar.',
      description:'Uma presença sóbria para apresentar áreas de atuação, organizar propostas e facilitar o primeiro contato.',
      micro:'Uma apresentação objetiva, alinhada à maneira como sua empresa deseja ser percebida.',
      primary:'Agendar conversa ↗',mark:'◇',artText:'NOVAS PERSPECTIVAS',artNote:'Ideias que ganham direção',
      benefits:['Posicionamento claro','Especialidades em destaque','Contato profissional'],
      servicesTitle:'Do diagnóstico ao planejamento.',
      servicesIntro:'Mostre o que você oferece, para quem trabalha e quais assuntos podem ser tratados em uma conversa inicial.',
      services:[
        ['Diagnóstico','Explique a abordagem inicial e o tipo de desafio atendido.'],
        ['Planejamento','Apresente suas frentes de atuação e projetos consultivos.'],
        ['Acompanhamento','Mostre como seu atendimento pode apoiar a execução.']
      ],
      aboutTitle:'Boas ideias merecem uma boa apresentação.',
      aboutText:'Compartilhe sua experiência comprovável, especialidades e informações institucionais. Este exemplo não apresenta credenciais ou resultados inventados.',
      contactTitle:'Uma boa conversa pode ser o começo.',
      contactText:'Na página real, o visitante poderá enviar uma mensagem diretamente ao WhatsApp informado pela sua empresa.',
      theme:'#f2f1e3'
    }
  };
  const params=new URLSearchParams(location.search);
  const value=(params.get('segment')||'beleza').trim().toLowerCase();
  const seg=Object.hasOwn(portfolio,value)?value:'beleza';
  const s=portfolio[seg];
  document.documentElement.dataset.segment=seg;
  document.title=s.brand+' — Exemplo ilustrativo | Próxima Era';
  const theme=document.querySelector('meta[name="theme-color"]');
  if(theme)theme.setAttribute('content',s.theme);
  const setAll=(key,text)=>document.querySelectorAll('[data-'+key+']').forEach(node=>{node.textContent=text});
  const map={
    brand:s.brand,monogram:s.mono,kicker:s.kicker,description:s.description,micro:s.micro,
    'art-mark':s.mark,'art-text':s.artText,'art-note':s.artNote,
    'benefit-1':s.benefits[0],'benefit-2':s.benefits[1],'benefit-3':s.benefits[2],
    'services-title':s.servicesTitle,'services-intro':s.servicesIntro,
    'service-1-title':s.services[0][0],'service-1-desc':s.services[0][1],
    'service-2-title':s.services[1][0],'service-2-desc':s.services[1][1],
    'service-3-title':s.services[2][0],'service-3-desc':s.services[2][1],
    'about-emblem':s.mono,'about-title':s.aboutTitle,'about-text':s.aboutText,
    'contact-title':s.contactTitle,'contact-text':s.contactText
  };
  for(const [key,value] of Object.entries(map))setAll(key,value);
  const hero=document.querySelector('[data-title]');
  if(hero){
    const words=s.title.split('. ');
    hero.replaceChildren();
    hero.append(document.createTextNode(words[0]+'.'));
    if(words.length>1){
      hero.append(document.createElement('br'));
      const em=document.createElement('em');
      em.textContent=words.slice(1).join('. ');
      hero.append(em);
    }
  }
  const button=document.querySelector('[data-label-primary]');
  if(button)button.textContent=s.primary;
  const origin=document.getElementById('solicitar-site');
  if(origin){
    const msg='Olá! Gostei do exemplo '+s.brand+' na Página Fecha Negócio. Gostaria de conversar sobre uma página para meu negócio.';
    const url=new URL('https://wa.me/5514996428874');
    url.searchParams.set('text',msg);
    origin.href=url.href;
  }
  const utm=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  const backlink=document.querySelector('[data-track="demo-voltar-oferta"]');
  if(backlink){
    const dest=new URL('../#demonstracao',location.href);
    for(const key of utm)if(params.get(key))dest.searchParams.set(key,params.get(key));
    backlink.href=dest.href;
  }
  /* Sem depoimentos, endereços ou avaliações fictícios atribuídos a clientes reais. */
})();
