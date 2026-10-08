/* node tests/offer-funnel.test.cjs ofertas/offer.js ofertas/order-status.js */
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const offer=fs.readFileSync(process.argv[2]||'ofertas/offer.js','utf8');
const order=fs.readFileSync(process.argv[3]||'ofertas/order-status.js','utf8');
assert.match(offer,/gaEventNames=\{ViewContent:'view_item',InitiateCheckout:'begin_checkout',AddPaymentInfo:'add_payment_info'\}/);
assert.match(offer,/PETracking\?\.send\?\.\('order_created'/);
assert.doesNotMatch(offer,/PETracking\?\.send\?\.\('pix_generated'/);
assert.match(order,/function trackPix\(o\)/);
assert.match(order,/PETracking\.send\("pix_generated"/);
assert.match(offer,/recuperar\/\?offer=/);
assert.match(order,/window\.addEventListener\('pe:ga-ready',fireGa/);
assert.match(order,/window\.addEventListener\('pe:meta-ready',fireMeta/);
assert.match(order,/transaction_id:orderId/);
function createContext(overrides={}){
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
    amountCents:6990,status:'paid',pix:null,fulfillmentUrl:null,...overrides};
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
  const pixCtx=createContext({id:'ORDER-PIX',status:'awaiting_payment',pix:null});
  await new Promise(r=>setImmediate(r));
  assert.equal(pixCtx.local.has('pe_pix_ORDER-PIX_operational'),false,
    'order without actual Pix must not report generated Pix');
  const ops=[],pixGa=[],pixMeta=[];
  pixCtx.window.PETracking={send:(...args)=>ops.push(args)};
  pixCtx.o.pix={code:'TEST-PIX-CODE'};
  const poll1=pixCtx.pending.shift();assert.equal(typeof poll1,'function');
  await poll1();await new Promise(r=>setImmediate(r));
  assert.equal(ops.filter(a=>a[0]==='pix_generated').length,1,
    'real Pix code must trigger first party event once');
  assert.equal(pixCtx.local.has('pe_pix_ORDER-PIX_ga4'),false,
    'do not mark GA4 Pix event before consent');
  pixCtx.window.gtag=(...args)=>pixGa.push(args);
  pixCtx.window.fbq=(...args)=>pixMeta.push(args);
  pixCtx.window.dispatchEvent('pe:ga-ready');
  pixCtx.window.dispatchEvent('pe:meta-ready');
  assert.equal(pixGa.filter(a=>a[1]==='pix_generated').length,1);
  assert.equal(pixGa.filter(a=>a[1]==='add_payment_info').length,1);
  assert.equal(pixMeta.filter(a=>a[1]==='AddPaymentInfo').length,1);
  assert.equal(pixGa.filter(a=>a[1]==='purchase').length,0,
    'awaiting Pix must never count as a purchase');
  const poll2=pixCtx.pending.shift();if(poll2)await poll2();
  await new Promise(r=>setImmediate(r));
  assert.equal(ops.filter(a=>a[0]==='pix_generated').length,1);
  assert.equal(pixGa.filter(a=>a[1]==='pix_generated').length,1);
  assert.equal(pixMeta.filter(a=>a[1]==='AddPaymentInfo').length,1);
  console.log('PASS: payment event only after Pix exists, delayed consent, no fake purchase, deduplication');
})().catch(e=>{console.error(e);process.exitCode=1});
