/* Run: node tests/tracking-offers-consent.test.cjs tracking.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(process.argv[2]||'tracking.js','utf8');
function simulate(consent,path='/ofertas/combo-criador/'){
  const storage=new Map();
  if(consent!==undefined)storage.set('pe_marketing_consent',consent);
  const sess=new Map();
  const scripts=[],banners=[],timers=[],events=[];
  const make=(tag)=>({
    tag,dataset:{},style:{},children:[],textContent:'',innerHTML:'',
    append(...children){this.children.push(...children)},
    remove(){this.removed=true}
  });
  const body={append(el){banners.push(el)}};
  const head={append(el){scripts.push(el)}};
  const document={
    body,head,referrer:'',visibilityState:'visible',
    createElement:make,
    querySelector(){return null},
    querySelectorAll(){return []},
    addEventListener(){}
  };
  const window={
    PE_OFFER:{metaPixelId:null},
    addEventListener(){},
    dispatchEvent(event){events.push(event.type)}
  };
  const store=map=>({
    getItem(key){return map.has(key)?map.get(key):null},
    setItem(key,val){map.set(key,String(val))},
    removeItem(key){map.delete(key)}
  });
  const ctx={
    document,window,location:{pathname:path,search:''},
    navigator:{webdriver:false,userAgent:'Mozilla/5.0'},
    URL,URLSearchParams,Event,
    crypto:require('node:crypto').webcrypto,
    localStorage:store(storage),sessionStorage:store(sess),
    fetch(){return Promise.resolve({ok:true})},
    setTimeout(fn){timers.push(fn)}
  };
  vm.runInNewContext(source,ctx,{timeout:1500,filename:'tracking.js'});
  for(const fn of timers.splice(0))fn();
  return {window,storage,scripts,banners,events};
}
const gaCount = x=>x.scripts.filter(s=>String(s.src||'').includes('googletagmanager.com/gtag/js?id=')).length;
const pixelCount = x=>x.scripts.filter(s=>String(s.src||'').includes('connect.facebook.net/en_US/fbevents.js')).length;
const yes=simulate('granted');
assert.equal(gaCount(yes),1,'consented offers load GA4 once');
assert.equal(pixelCount(yes),1,'consented offers load account Meta pixel once');
assert.equal(Array.from(yes.window.fbq.queue||[]).some(call=>call[0]==='init'&&call[1]==='1534363811135198'),true,'matching ad account Pixel');
assert.equal(yes.events.includes('pe:ga-ready'),true,'GA4 ready event emitted');
assert.equal(Array.from(yes.window.dataLayer).some(v=>Array.from(v)[0]==='config'&&Array.from(v)[1]==='G-RR7D4MYJZ8'),true,'expected measurement ID');
const no=simulate('denied');
assert.equal(gaCount(no),0,'declined consent blocks GA4');
assert.equal(pixelCount(no),0,'declined consent blocks Meta Pixel');
assert.equal(no.banners.length,0,'prior decline not reprompted');
const pending=simulate(undefined);
assert.equal(gaCount(pending),0,'no analytics before consent');
assert.equal(pixelCount(pending),0,'no Meta Pixel before consent');
assert.equal(pending.banners.length,1,'one consent banner');
const accept=pending.banners[0].children[1].children[0];
assert.equal(typeof accept.onclick,'function');
accept.onclick();
assert.equal(gaCount(pending),1,'accept loads GA4');
assert.equal(pixelCount(pending),1,'accept loads Meta Pixel');
const home=simulate('granted','/');
assert.equal(gaCount(home),0,'avoid duplicate GA4 injection on other pages');
assert.equal(pixelCount(home),0,'no pixel injected on institutional home by the offer tracker');
console.log('PASS: granted, denied, pending/accept, non-offer, measurement id');
