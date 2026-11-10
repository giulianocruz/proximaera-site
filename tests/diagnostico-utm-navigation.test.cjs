 'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','diagnostico-gratuito','app.js'),'utf8');
test('UTMs são levadas aos planos sem fbclid, dados de formulário ou texto livre',()=>{
  const link={
    value:'../fecha-negocio/',
    getAttribute(){return this.value},
    setAttribute(key,value){if(key==='href')this.value=value}
  };
  const form={addEventListener(){}};
  const document={
    getElementById(id){return id==='diagnosticForm'?form:null},
    querySelector(selector){return selector==='a[data-track="diagnostico-ver-planos"]'?link:null}
  };
  const window={location:{search:'?utm_source=meta&utm_medium=paid_social&utm_campaign=black_friday_2026&fbclid=SENSITIVE&owner=SECRET'},sessionStorage:{getItem(){return null}}};
  vm.runInNewContext(code,{window,document,URLSearchParams,encodeURIComponent},{timeout:1500});
  const url=new URL(link.value,'https://proximaera.com.br/diagnostico-gratuito/');
  assert.equal(url.pathname,'/fecha-negocio/');
  assert.equal(url.searchParams.get('utm_source'),'meta');
  assert.equal(url.searchParams.get('utm_medium'),'paid_social');
  assert.equal(url.searchParams.get('utm_campaign'),'black_friday_2026');
  assert.equal(url.searchParams.get('utm_referral'),'diagnostico_gratuito');
  assert.equal(url.searchParams.get('fbclid'),null);
  assert.equal(url.searchParams.get('owner'),null);
  assert.doesNotMatch(link.value,/SENSITIVE|SECRET/);
});