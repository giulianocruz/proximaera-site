'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function transform(relative,steps){
 const file=path.join(root,relative);
 let body=fs.readFileSync(file,'utf8');
 for(const [before,after,label] of steps){
  const count=body.split(before).length-1;
  const existing={
   'home Retro card':'data-track="projeto-retro-home"',
   'apps grid':'grid grid--portfolio',
   'Retro app card':'class="card card-retro"',
   'retro sidebar':'<strong>Próxima Era Retro</strong>',
   'retro vs unreleased projects':'O Retro já possui acesso público de teste.',
   'apps grid styles':'.grid--portfolio{',
   'mobile styles':'.grid,.grid--portfolio{'
  };
  if(body.includes(after)||(existing[label]&&body.includes(existing[label])))continue;
  assert.equal(count,1,'Unexpected source count for '+label+': '+count);
  body=body.replace(before,after);
 }
 fs.writeFileSync(file,body,'utf8');
}
transform('index.html',[[
 '        <a class="project-card reveal project-link" href="projetos/guegames.html">',
 '        <a class="project-card reveal project-link" href="retro/" data-track="projeto-retro-home"><img class="project-logo" src="assets/projects/proxima-era-retro.svg" width="80" height="80" alt="" loading="lazy" /><h3>Próxima Era Retro</h3><p>Organize seus jogos por console, capas e favoritos. Beta gratuita para Android e Windows.</p><footer><span class="status exp">Beta disponível</span><b>Conhecer e baixar →</b></footer></a>\n'+
 '        <a class="project-card reveal project-link" href="projetos/guegames.html">',
 'home Retro card'
]]);
transform('aplicativos/index.html',[
 ['<section class="grid" aria-label="Catálogo de aplicativos">','<section class="grid grid--portfolio" aria-label="Catálogo de aplicativos">','apps grid'],
 ['<aside class="side"><p class="eyebrow">PRÓXIMA ERA GAMES</p>',
 '<article class="card card-retro">\n'+
 '<img src="../retro/assets/biblioteca-demo.jpg" alt="Captura da interface de demonstração do Próxima Era Retro, com biblioteca visual de jogos fictícios" width="1480" height="940" loading="lazy" decoding="async">\n'+
 '<div class="body"><div class="head"><img class="icon" src="../assets/projects/proxima-era-retro.svg" alt="" width="80" height="80"><div><span class="status">ANDROID E WINDOWS • BETA DISPONÍVEL</span><h2>Próxima Era Retro</h2></div></div>\n'+
 '<p><strong>Sua coleção de jogos clássicos com a apresentação que merece.</strong> Biblioteca e launcher com seleção por console, organização por capas, favoritos e busca.</p>\n'+
 '<p>A beta gratuita está disponível para Android e Windows. O catálogo de plataformas não significa emulação nativa de todos os consoles. Não inclui ROMs, BIOS nem jogos comerciais; você utiliza seus próprios arquivos e ferramentas compatíveis.</p>\n'+
 '<div class="links"><a class="btn primary" href="../retro/#download">Baixar beta gratuita</a><a class="btn" href="../retro/testes.html">Laboratório de testes</a><a class="btn" href="../retro/privacidade.html">Privacidade do Retro</a></div></div></article>\n'+
 '<aside class="side"><p class="eyebrow">PRÓXIMA ERA GAMES</p>','Retro app card'],
 ['<ul><li><strong>Boleto Rush!</strong> — versão Android em testes.</li>',
 '<ul><li><strong>Próxima Era Retro</strong> — beta pública para Android e Windows, com download no portal próprio.</li><li><strong>Boleto Rush!</strong> — versão Android em testes.</li>','retro sidebar'],
 ['<p>Os projetos em desenvolvimento não possuem download ou acesso público confirmado nesta página. Links de teste e publicação serão adicionados após validação.</p>',
 '<p>O Retro já possui acesso público de teste. Os demais projetos em desenvolvimento terão links adicionados quando houver uma versão validada.</p>',
 'retro vs unreleased projects']
]);
transform('aplicativos/apps.css',[
 ['.grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:23px;margin-bottom:75px}',
 '.grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:23px;margin-bottom:75px}\n.grid--portfolio{grid-template-columns:repeat(2,minmax(0,1fr))}\n.grid--portfolio .side{grid-column:1/-1}\n.card-retro .body{display:flex;flex-direction:column}\n.card-retro .links{margin-top:auto;padding-top:14px}\n.card-retro .status{color:#8fe5ff}','apps grid styles'],
 ['@media(max-width:750px){header{align-items:flex-start;flex-direction:column}nav{gap:13px}.hero{padding-top:42px}.grid{grid-template-columns:1fr}.body,.side{padding:23px}}',
 '@media(max-width:750px){header{align-items:flex-start;flex-direction:column}nav{gap:13px}.hero{padding-top:42px}.grid,.grid--portfolio{grid-template-columns:1fr}.body,.side{padding:23px}}','mobile styles']
]);
console.log('RETRO_SITE_INTEGRATION_APPLIED');
