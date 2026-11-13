'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const home=read('index.html'),apps=read('aplicativos/index.html'),css=read('aplicativos/apps.css');
const svg=read('assets/projects/proxima-era-retro.svg');
test('home links Próxima Era Retro in highlighted project grid',()=>{
 assert.match(home,/<section class="section universe" id="projetos">/);
 assert.ok(home.includes('<a class="project-card reveal project-link" href="retro/?utm_source=proximaera&amp;utm_medium=site&amp;utm_campaign=retro_beta&amp;utm_content=home" data-track="projeto-retro-home">'));
 assert.match(home,/<h3>Próxima Era Retro<\/h3>/);
 assert.match(home,/Beta disponível/);
 assert.equal((home.match(/data-track="projeto-retro-home"/g)||[]).length,1);
 assert.match(home,/href="aplicativos\/"/);
});
test('apps catalog features Retro with honest beta messaging',()=>{
 assert.ok(apps.includes('href="../retro/?utm_source=proximaera&amp;utm_medium=site&amp;utm_campaign=retro_beta&amp;utm_content=apps#download"'));
 assert.match(apps,/href="\.\.\/retro\/testes\.html"/);
 assert.match(apps,/href="\.\.\/retro\/privacidade\.html"/);
 assert.match(apps,/organização por capas, favoritos e busca/);
 assert.match(apps,/Não inclui ROMs, BIOS nem jogos comerciais/);
 assert.match(apps,/não significa emulação nativa de todos os consoles/);
 assert.match(apps,/href="boleto-rush\/privacidade\.html"/);
 assert.equal((apps.match(/class="card card-retro"/g)||[]).length,1);
 assert.ok(!/0\.3\.21/.test(apps),'Do not hardcode beta version, portal handles it');
});
test('logo, demo screenshot and responsive catalog styling',()=>{
 assert.match(svg,/^<svg[\s\S]*<\/svg>\s*$/);
 assert.match(apps,/src="\.\.\/assets\/projects\/proxima-era-retro\.svg"/);
 assert.match(apps,/src="\.\.\/retro\/assets\/biblioteca-demo\.jpg"/);
 assert.match(css,/\.grid--portfolio\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
 assert.match(css,/\.grid--portfolio \.side\{grid-column:1\/-1\}/);
 assert.match(css,/max-width:750px/);
 assert.match(css,/\.grid,\.grid--portfolio\{grid-template-columns:1fr\}/);
});
test('public SEO, contact and project links remain unchanged',()=>{
 assert.match(home,/name="robots" content="index,follow/);
 assert.match(home,/href="fecha-negocio\/"/);
 assert.match(home,/href="https:\/\/chamasofia\.com\.br"/);
 assert.match(home,/href="contato\.html"/);
 assert.match(apps,/href="\.\.\/contato\.html"/);
 assert.match(apps,/rel="canonical" href="https:\/\/proximaera\.com\.br\/aplicativos\/"/);
});
test('sitemap lists public Retro landing, not individual downloads',()=>{
 const xml=read('sitemap.xml');
 assert.ok(xml.includes('<loc>https://proximaera.com.br/retro/</loc>'));
 assert.ok(!xml.includes('/retro/downloads/'));
 assert.equal((xml.match(/<loc>https:\/\/proximaera\.com\.br\/retro\/<\/loc>/g)||[]).length,1);
});
test('Retro live portal and referenced artwork respond with 200',async()=>{
 for(const u of ['https://proximaera.com.br/retro/',
  'https://proximaera.com.br/retro/assets/biblioteca-demo.jpg',
  'https://proximaera.com.br/retro/testes.html',
  'https://proximaera.com.br/retro/privacidade.html']){
   const response=await fetch(u,{method:'HEAD',signal:AbortSignal.timeout(15000)});
   assert.equal(response.status,200,u+' returned '+response.status);
 }
});
