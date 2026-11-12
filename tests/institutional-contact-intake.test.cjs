'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('contato.html');
const js=read('contact-intake-v1.js');
const css=read('assets/premium/contact-intake-v1.css');
const privacy=read('privacidade.html');

test('intake institucional é distinto do formulário manual',()=>{
 assert.match(html,/id="peIntakeForm"/);
 assert.match(html,/id="contactForm"/);
 assert.match(html,/id="peIntakeStatus"/);
 assert.match(html,/contact-intake-v1\.js/);
 assert.match(html,/contact-intake-v1\.css/);
 assert.match(html,/name="privacyAccepted" required/);
 assert.match(html,/name="phone"[^>]*required/);
 assert.match(html,/name="interest" required/);
 for(const interest of ['Página comercial','Site premium','Aplicativo','Automação e IA','Diagnóstico digital','Ainda estou avaliando']){
  assert.ok(html.includes('<option>'+interest+'</option>'),interest);
 }
 assert.doesNotMatch(html,/<script[^>]+src="https:\/\/www\.googletagmanager\.com\/gtag\/js/);
 assert.match(html,/Preparar mensagem/);
});

test('requisitos da API de leads, fallback e consentimento',()=>{
 new vm.Script(js,{filename:'contact-intake-v1.js'});
 assert.match(js,/fetch\('\/api\/contact'/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/privacyAccepted:values\.get\('privacyAccepted'\)==='on'/);
 assert.match(js,/marketingOptIn:false/);
 assert.match(js,/validInterests\.has\(interest\)/);
 assert.match(js,/source:'site-institucional'/);
 assert.match(js,/status\.dataset\.kind/);
 assert.match(js,/wa\.me\/5514998193831/);
 assert.match(js,/window\.PETracking\?\.send/);
 assert.match(css,/@media\(max-width:540px\)/);
});

test('política descreve claramente as duas formas de atendimento',()=>{
 assert.match(privacy,/formulário Solicitar retorno pelo WhatsApp/);
 assert.match(privacy,/formulário Preparar mensagem continua assistido/);
 assert.match(privacy,/Google Analytics 4 é carregado/);
 assert.match(privacy,/Meta Pixel é usado nas páginas de campanhas/);
 assert.match(privacy,/Última atualização: 12\/11\/2026/);
});