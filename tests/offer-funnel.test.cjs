/* node tests/offer-funnel.test.cjs ofertas/offer.js ofertas/order-status.js */
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const offer=fs.readFileSync(process.argv[2]||'ofertas/offer.js','utf8');
const order=fs.readFileSync(process.argv[3]||'ofertas/order-status.js','utf8');
assert.match(offer,/gaEventNames=\{ViewContent:'view_item',InitiateCheckout:'begin_checkout',AddPaymentInfo:'add_payment_info'\}/);
assert.match(offer,/PETracking\?\.send\?\.\('pix_generated'/);
assert.match(offer,/recuperar\/\?offer=/);
assert.match(order,/window\.addEventListener\('pe:ga-ready',fireGa/);
assert.match(order,/window\.addEventListener\('pe:meta-ready',fireMeta/);
assert.match(order,/transaction_id:orderId/);
function createContext(){
  const local=new Map(),listeners=new Map(),pending=[];
  const tags={};
  const make=()=>({hidden:true,textContent:'',dataset:{},style:{},value:'',
    addEventListener(){},select(){},setAttribute(){}});
  const doc={body:{dataset:{}},querySelector:(key)=>(tags[key]??=make())};
  const window={
    addEventListener(type,callback){const a=listeners.get(type)||[];a.push(callback);listeners.set(type,a)},
    dispatchEvent(type){for(const cb of listeners.get(type)||[])cb()},
  };
  const o={id:'ORDER-ONE',title:'Combo Criador',offer:'combo-criador',
    amountCents:6990,status:'paid',pix:null,fulfillmentUrl:null};
  const ctx={
    window,document:doc,URLSearchParams,
    location:{search:'?id=ORDER-ONE',href:'https://proximaera.com.br/ofertas/pedido/?id=ORDER-ONE'},
    localStorage:{
      getItem(key){return local.get(key)??null},
      setItem(key,val){local.set(key,String(val))},
      removeItem(key){local.delete(key)}
    },
    sessionStorage:{setItem(){}},
    fetch:async()=>({ok:true,json:async()=>({order:o,metaPixelId:null})}),
    setTimeout:fn=>pending.push(fn),
    Intl,Date,Number,String,encodeURIComponent
  };
  vm.runInNewContext(order,ctx,{filename:'order-status.js',timeout:2000});
  return {window,local,pending,o};
}
(async()=>{
  const x=createContext();
  await new Promise(r=>setImmediate(r));
  assert.equal(x.local.has('pe_purchase_ORDER-ONE_ga4'),false,
    'no GA4 marker without configured gtag');
  assert.equal(x.local.has('pe_purchase_ORDER-ONE_meta'),false,
    'no Meta marker without configured fbq');
  const ga=[],meta=[];
  x.window.gtag=(...args)=>ga.push(args);
  x.window.fbq=(...args)=>meta.push(args);
  x.window.dispatchEvent('pe:ga-ready');
  x.window.dispatchEvent('pe:meta-ready');
  assert.equal(ga.filter(a=>a[1]==='purchase').length,1,
    'exactly one canonical purchase after consent');
  assert.equal(meta.filter(a=>a[1]==='Purchase').length,1,
    'exactly one Meta purchase after consent');
  assert.equal(x.local.get('pe_purchase_ORDER-ONE_ga4'),'1');
  assert.equal(x.local.get('pe_purchase_ORDER-ONE_meta'),'1');
  // A second polling result must not duplicate conversions.
  const again=x.pending.shift();if(again)await again();
  await new Promise(r=>setImmediate(r));
  assert.equal(ga.filter(a=>a[1]==='purchase').length,1);
  assert.equal(meta.filter(a=>a[1]==='Purchase').length,1);
  console.log('PASS: GA4 canonical events, Pix events, contextual recovery, consent-delayed purchase, provider deduplication');
})().catch(e=>{console.error(e);process.exitCode=1});
