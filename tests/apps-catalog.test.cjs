'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'aplicativos/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'aplicativos/apps.css'),'utf8');
test('catalogo cobre os seis produtos conhecidos sem publicacao ficticia',()=>{
  for(const s of ['Boleto Rush!','Crônicas do Abismo','Próxima Era Retro','República dos Malandros','Brasil em Apuros!','MyEggs']){
    assert.ok(html.includes(s),'produto: '+s);
  }
  assert.equal((html.match(/<article\b/g)||[]).length,6);
  assert.ok(!/href="[^"]*(?:\.apk|\.exe|play\.google\.com)/i.test(html),'sem download nao homologado');
});
test('politicas e destinos relevantes sao reais',()=>{
  for(const link of ['boleto-rush/privacidade.html','../contato.html','../projetos/guegames.html','../favicon.svg','../assets/logo-horizontal.svg']){
    assert.ok(fs.existsSync(path.resolve(root,'aplicativos',link)),link);
  }
  assert.ok(html.includes('../apps/cronicas-do-abismo/'),'preserva a pagina legada publica validada');
  assert.ok(html.includes('../apps/cronicas-do-abismo/privacidade/'),'mantem a politica do jogo');
});
test('semantica e responsividade',()=>{
  assert.ok(html.includes('href="#conteudo"'));
  assert.ok(html.includes('id="conteudo"'));
  assert.ok(html.includes('aria-labelledby="tit-testes"'));
  assert.ok(html.includes('aria-labelledby="tit-desenvolvimento"'));
  assert.ok(css.includes('@media(max-width:500px)'));
  assert.ok(html.includes('<meta name="robots" content="index,follow">'));
});
