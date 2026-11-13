'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'aplicativos/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'aplicativos/apps.css'),'utf8');
test('catalogo cobre os seis produtos conhecidos sem publicacao ficticia',()=>{
  for(const s of ['Boleto Rush!','Crônicas do Abismo','Próxima Era Retro','República dos Malandros','Brasil em Apuros!','MyEggs']){
    assert.ok(html.includes(s),'produto: '+s);
  }
  assert.equal((html.match(/<article\b/g)||[]).length,6);
  assert.ok(html.includes('href="../retro/?utm_source=proximaera&amp;utm_medium=site&amp;utm_campaign=retro_beta&amp;utm_content=apps#download"'),'Retro preserva o link público rastreável de download beta');
  assert.ok(html.includes('href="../retro/testes.html"'),'Retro preserva o laboratório público');
  assert.ok(html.includes('href="../retro/privacidade.html"'),'Retro preserva política pública');
  assert.ok(html.includes('href="../retro/status.html"'),'Retro possui página de status e versões');
  assert.ok(html.includes('src="../retro/assets/biblioteca-demo.jpg"'),'Retro reutiliza arte pública confirmada');
  assert.ok(html.includes('sincronização de saves entre plataformas ainda não está homologada'),'não promete sincronização pronta');
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
  assert.ok(html.includes('id="retro-release"'));
  assert.ok(html.includes('src="./apps-hub.js" defer'));
});

test('manifesto beta preenche a versão apenas com dados válidos e sem identificação pessoal',async()=>{
  const script=fs.readFileSync(path.join(root,'aplicativos/apps-hub.js'),'utf8');
  const placeholder='A versão beta atual e os requisitos estão disponíveis no portal oficial.';
  async function evaluate(body,ok=true){
    const el={textContent:placeholder};
    const calls=[];
    const document={getElementById(id){return id==='retro-release'?el:null;}};
    const fetch=(url,config)=>{
      calls.push({url,config});
      return Promise.resolve({ok,json:()=>Promise.resolve(body)});
    };
    vm.runInNewContext(script,{document,fetch},{timeout:1000});
    await new Promise(resolve=>setImmediate(resolve));
    return {el,calls};
  }
  const working=await evaluate({version:'0.3.21',channel:'beta',published_at:'2026-11-13'});
  assert.match(working.el.textContent,/Beta 0\.3\.21 disponível/);
  assert.match(working.el.textContent,/13\/11\/2026/);
  assert.equal(working.calls[0].url,'../retro/version.json');
  assert.equal(working.calls[0].config.credentials,'omit');
  assert.equal(working.calls[0].config.method,'GET');
  const invalid=await evaluate({version:'<img src=x>',channel:'beta',published_at:'invalido'});
  assert.equal(invalid.el.textContent,placeholder,'versão inválida não deve ser mostrada');
  const other=await evaluate({version:'0.3.21',channel:'stable'});
  assert.equal(other.el.textContent,placeholder,'canal não esperado deve manter o fallback');
});
