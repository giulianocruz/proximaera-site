'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'diagnostico-gratuito','index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'diagnostico-gratuito','app.js'),'utf8');

function simulate({consent='denied',valid=true,values={}}={}){
  const listeners={};
  const form={
    addEventListener(name,fn){listeners[name]=fn},
    reportValidity(){return valid}
  };
  const fields=Object.assign({
    owner:'Ana',business:'Studio Ana',segment:'Beleza e estética',
    presence:'Tenho Instagram ou Facebook',goal:'Receber mais contatos no WhatsApp',
    profile:'@studioana',challenge:'Quero organizar meus serviços'
  },values);
  const elements={diagnosticForm:form,formError:{textContent:'',hidden:true}};
  for(const [key,value] of Object.entries(fields))elements[key]={value};
  let navigated='',sendCalled=null,gaCalled=null,pixelCalled=null;
  const win={
    location:{search:'?utm_source=meta&utm_medium=paid_social&utm_campaign=pe_diag_nov26&fbclid=SECRET',assign(url){navigated=url}},
    sessionStorage:{getItem(){return null}},
    localStorage:{getItem(){return consent}},
    PETracking:{reference:'PE-12345678',send(...a){sendCalled=a}},
    gtag(...a){gaCalled=a},
    fbq(...a){pixelCalled=a}
  };
  const ctx={window:win,document:{getElementById(id){return elements[id]||null}},URLSearchParams,encodeURIComponent};
  vm.runInNewContext(source,ctx,{timeout:1500,filename:'app.js'});
  if(!listeners.submit)throw Error('Formulário sem handler submit');
  listeners.submit({preventDefault(){}});
  return {url:navigated,sendCalled,gaCalled,pixelCalled,err:elements.formError};
}

test('a landing explica a oferta real e abre via WhatsApp particular',()=>{
  assert.match(html,/<title>Diagnóstico digital gratuito/);
  assert.match(html,/Sem obrigação de contratar/);
  assert.match(html,/não é automática|não é automático|não é automático/i);
  assert.match(html,/nenhum cadastro é enviado automaticamente/i);
  assert.match(html,/5514998193831/);
  assert.match(html,/href="\.\.\/privacidade\.html"/);
  for(const id of ['owner','business','segment','presence','goal','privacy']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.doesNotMatch(html,/src="https:\/\/(?:www\.googletagmanager|connect\.facebook)/);
});

test('a mensagem contém qualificação, referência e UTM, sem fbclid',()=>{
  const t=simulate();
  assert.match(t.url,/^https:\/\/wa\.me\/5514998193831\?text=/);
  const u=new URL(t.url);
  const msg=u.searchParams.get('text');
  for(const item of ['Studio Ana','Beleza e estética','Receber mais contatos','@studioana','Campanha: pe_diag_nov26','Origem: meta','Referência: PE-12345678']){
    assert.ok(msg.includes(item),'Ausente: '+item);
  }
  assert.ok(!msg.includes('fbclid')&&!msg.includes('SECRET'),'Não copiar identificador de clique');
  assert.deepEqual(Array.from(t.sendCalled),['diagnostic_intent','diagnostic:whatsapp_request']);
  assert.equal(t.gaCalled,null,'GA4 não recebe evento se marketing recusado');
  assert.equal(t.pixelCalled,null,'Meta não recebe evento se marketing recusado');
});

test('sem validação do formulário não redireciona nem envia evento',()=>{
  const t=simulate({valid:false});
  assert.equal(t.url,'');
  assert.equal(t.sendCalled,null);
});

test('após consentimento eventos de intenção não são classificados como venda ou lead confirmado',()=>{
  const t=simulate({consent:'granted'});
  assert.match(t.url,/5514998193831/);
  assert.deepEqual(Array.from(t.gaCalled).slice(0,2),['event','diagnostic_whatsapp_intent']);
  assert.deepEqual(Array.from(t.pixelCalled).slice(0,2),['trackCustom','DiagnosticWhatsAppIntent']);
  assert.doesNotMatch(source,/fbq\(['"]track['"]\s*,\s*['"](?:Lead|Purchase)['"]/);
});

test('o sitemap lista a nova landing e o rastreamento controla consentimento',()=>{
  const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  const tracker=fs.readFileSync(path.join(root,'tracking.js'),'utf8');
  assert.match(sitemap,/https:\/\/proximaera\.com\.br\/diagnostico-gratuito\//);
  assert.match(tracker,/peIsDiagnostic=location\.pathname\.startsWith\('\/diagnostico-gratuito\/'\)/);
  assert.match(tracker,/peHasMarketingTags=true/,'unified site-wide GA4 consent');
  assert.match(tracker,/peIsOffer\|\|peIsFechaNegocio\|\|peIsDiagnostic\)\?peOfferMetaId/,'default Meta Pixel remains scoped to campaign landing pages');
});
