'use strict';
/* Chrome DevTools Protocol (Node 24+), sem Puppeteer e sem envio de formulário.
 * Testa viewports reais e salva capturas em %TEMP% para revisão visual.
 */
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');

const chrome=process.env.CHROME_BIN||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'google-chrome');
const port=19309;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
  for(let i=0;i<35;i++){
    try{
      const response=await fetch('http://127.0.0.1:'+port+'/json/list');
      if(response.ok){const pages=await response.json();const tab=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);if(tab)return tab}
    }catch{}
    await delay(200);
  }
  throw Error('Chrome DevTools não respondeu');
}
async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'pe-diagnostic-cdp-'));
  const args=['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'];
  const child=spawn(chrome,args,{stdio:'ignore'});
  let socket=null;
  try{
    const page=await ready();
    socket=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
    let seq=0;
    const pending=new Map();
    socket.addEventListener('message',ev=>{
      let msg;
      try{msg=JSON.parse(ev.data)}catch{return}
      if(!msg.id||!pending.has(msg.id))return;
      const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);
      if(msg.error)reject(Error(msg.error.message));
      else resolve(msg.result);
    });
    const send=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++seq;pending.set(id,{resolve,reject});
      socket.send(JSON.stringify({id,method,params}));
    });
    await send('Page.enable');
    await send('Runtime.enable');
    for(const viewport of [{name:'mobile',width:390,height:844,mobile:true},{name:'desktop',width:1366,height:900,mobile:false}]){
      await send('Emulation.setDeviceMetricsOverride',{width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:viewport.mobile,screenWidth:viewport.width,screenHeight:viewport.height});
      await send('Page.navigate',{url:'https://proximaera.com.br/diagnostico-gratuito/?pe_qa=20261109'});
      await delay(1800);
      const expression='(()=>{const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}};const h=document.querySelector(".hero h1");const range=document.createRange();range.selectNodeContents(h);const textRight=Math.max(...[...range.getClientRects()].map(r=>r.right));return {width:innerWidth,docWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,title:document.title,h1:rect(h),textRight:Math.round(textRight),navCta:rect(document.querySelector(".nav-cta")),heroButton:rect(document.querySelector(".hero-actions .button")),form:!!document.getElementById("diagnosticForm"),fields:document.querySelectorAll(".field").length,overflow:[...document.querySelectorAll("body *")].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2&&r.width>0&&getComputedStyle(e).position!=="absolute"}).slice(0,6).map(e=>e.tagName.toLowerCase()+"."+(e.className||""))}})()';
      const evaluated=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(evaluated.exceptionDetails)throw Error('Avaliação no navegador falhou');
      const info=evaluated.result.value;
      console.log(viewport.name.toUpperCase(),JSON.stringify(info));
      assert.equal(info.width,viewport.width,'viewport emulado incorreto');
      assert.ok(info.docWidth<=info.width+2,viewport.name+' rolagem horizontal');
      assert.ok(info.navCta.right<=info.width+2,viewport.name+' navegação cortada');
      assert.ok(info.textRight<=info.width+2,viewport.name+' texto do título cortado');
      assert.ok(info.form&&info.fields>=6,viewport.name+' formulário ausente');
      const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
      const file=path.join(os.tmpdir(),'pe-diagnostic-cdp-'+viewport.name+'-20261109.png');
      fs.writeFileSync(file,Buffer.from(screenshot.data,'base64'));
      console.log('SCREENSHOT',file,fs.statSync(file).size);
    }
    console.log('BROWSER_DIAGNOSTIC_PASS=2/2');
  }finally{
    try{socket?.close()}catch{}
    try{child.kill()}catch{}
  }
}
main().catch(e=>{console.error('BROWSER_DIAGNOSTIC_FAIL',e.stack||e.message);process.exitCode=1});
