'use strict';
/* Valida o conteúdo público publicado; não envia contatos ou eventos de conversão. */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const release='20261109T183008Z';
const base='https://proximaera.com.br';
const files=[
 {path:'/tracking.js',sha:'fb2d4ed51e59ac38516c539680b153b3adc051322eb05820194a610cb283fc1d'},
 {path:'/fecha-negocio/',sha:'d5de335e1f24d5152fe5bb4a7cb6c218b1f6ffaf1df0e323b2a0c9c4e5ddacf1'},
 {path:'/privacidade.html',sha:'08b24fe7f1b405ba7df22b4223de914e125a608696eb8c76be9ba431721afa0e'}
];
async function fetchFile(item){
 const url=base+item.path+(item.path.includes('?')?'&':'?')+'pe_release='+release;
 const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),
   headers:{'cache-control':'no-cache','user-agent':'ProximaEra-FechaNegocio-QA/1.0'}});
 assert.equal(response.status,200,'HTTP 200 esperado em '+item.path);
 const bytes=Buffer.from(await response.arrayBuffer());
 const hash=crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash,item.sha,'Hash diferente de produção em '+item.path);
 console.log('LIVE_PASS',item.path,'HTTP',response.status,'SHA',hash.slice(0,12));
 return bytes.toString('utf8');
}
(async()=>{
 const [tracker,landing,privacy]=await Promise.all(files.map(fetchFile));
 assert.doesNotMatch(landing,/src="https:\/\/www\.googletagmanager\.com\/gtag\/js/i);
 assert.match(landing,/data-track="whatsapp-hero-profissional"/);
 assert.match(landing,/https:\/\/wa\.me\/5514998193831/);
 assert.doesNotMatch(landing,/5514996428874/);
 assert.match(landing,/R\$ 79,90/);
 assert.match(tracker,/peIsFechaNegocio/);
 assert.match(tracker,/WhatsAppClick/);
 assert.match(tracker,/peMarketingChoice\(\)/);
 assert.match(privacy,/marketingConsentRevoke/);
 assert.match(privacy,/marketingConsentReset/);
 console.log('LIVE_RELEASE_PASS=3/3: conteúdo publicado e integridade SHA confirmados');
})().catch(err=>{console.error('LIVE_RELEASE_FAIL',err.message);process.exitCode=1});
