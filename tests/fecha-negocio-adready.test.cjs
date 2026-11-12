'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('tracking.js','utf8');
const html=fs.readFileSync('fecha-negocio/index.html','utf8');
const privacy=fs.readFileSync('privacidade.html','utf8');
assert.doesNotMatch(html,/<script[^>]+src="https:\/\/www\.googletagmanager\.com\/gtag\/js/i);
assert.match(html,/data-track="whatsapp-hero-profissional"/);
assert.match(html,/href="\.\.\/privacidade\.html"/);
assert.match(privacy,/id="marketingConsentRevoke"/);
assert.match(privacy,/id="marketingConsentReset"/);
assert.match(privacy,/Google Analytics 4/);
assert.match(privacy,/Meta Pixel/);
function run(consent){
  const local=new Map(),session=new Map(),network=[],banners=[],scripts=[],timers=[];
  if(consent)local.set('pe_marketing_consent',consent);
  const clickEvents=new Map();
  const anchor={
    href:'https://wa.me/5514998193831?text=Quero%20minha%20pagina',
    dataset:{track:'whatsapp-hero-profissional'},
    matches(s){return s==='a[href*="wa.me/"]'},
    addEventListener(k,fn){clickEvents.set(k,fn)}
  };
  const element=()=>({dataset:{},style:{},children:[],append(...xs){this.children.push(...xs)},remove(){}});
  const doc={
    referrer:'',visibilityState:'visible',body:{append(x){banners.push(x)}},
    head:{append(x){scripts.push(x)}},
    querySelector(){return null},querySelectorAll(){return [anchor]},
    createElement:element,addEventListener(){}
  };
  const store=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
  const window={addEventListener(){},dispatchEvent(){}};
  const ctx={document:doc,window,navigator:{webdriver:false,userAgent:'Mozilla/5.0'},
    location:{pathname:'/fecha-negocio/',search:'?utm_source=meta&utm_medium=paid&utm_campaign=teste&utm_content=criativo_01_aprova'},
    localStorage:store(local),sessionStorage:store(session),
    URL,URLSearchParams,Event,crypto:require('node:crypto').webcrypto,
    fetch:(url,config)=>{network.push({url,config});return Promise.resolve({ok:true})},
    setTimeout:fn=>timers.push(fn)};
  vm.runInNewContext(source,ctx,{timeout:1500});
  timers.splice(0).forEach(fn=>fn());
  const click=clickEvents.get('click');
  assert.equal(typeof click,'function');
  click();click();
  const payloads=network.map(x=>JSON.parse(x.config.body));
  return {window,local,banners,scripts,anchor,payloads};
}
const absent=run('');
assert.equal(absent.scripts.length,0,'no third-party scripts before consent');
assert.equal(absent.banners.length,1,'consent prompt exists');
assert.equal(absent.payloads.filter(x=>x.event==='whatsapp').length,1,'first-party intent dedup');
const denied=run('denied');
assert.equal(denied.scripts.length,0,'third-party scripts blocked after refusal');
assert.equal(denied.banners.length,0,'no repeated banner after refusal');
const accepted=run('granted');
assert.equal(accepted.scripts.length,2,'exactly GA4 and Meta after consent');
assert.equal(accepted.payloads.filter(x=>x.event==='whatsapp').length,1);
assert.equal(accepted.payloads.some(x=>x.source==='meta'&&x.medium==='paid'&&x.campaign==='teste'),true,'UTM source preserved');
assert.match(new URL(accepted.anchor.href).searchParams.get('text'),/Referência: PE-[A-Z0-9]{8}/);
assert.equal(Array.from(accepted.window.fbq.queue).filter(args=>args[0]==='trackCustom'&&args[1]==='WhatsAppClick').length,1,'custom click, no fake lead or sale');
assert.equal(Array.from(accepted.window.dataLayer).filter(args=>args[0]==='event'&&args[1]==='click_whatsapp').length,1,'GA4 click, not purchase');
assert.equal(Array.from(accepted.window.dataLayer).filter(args=>args[0]==='event'&&args[1]==='purchase').length,0);
console.log('FECHA_NEGOCIO_AD_READY=PASS: consent, UTM, WA intent, GA4 and Meta click dedup, privacy');
