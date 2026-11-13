'use strict';
/* Conferência SOMENTE LEITURA do snapshot público de 13/11/2026.
   Evita publicar uma cópia mais antiga por cima de alterações em produção.
   Não faz SSH, escrita, backup ou deploy. */
const crypto=require('node:crypto');
const {strict:assert}=require('node:assert');
const base='https://proximaera.com.br';
const expected={
  '/aplicativos/':'8ea6e783b1e85a06a9be78168f0ecce9b9e55ed480c5e9fd76c44fb907b66967',
  '/aplicativos/apps.css':'9412358ddbc7d7676c597378706b133fc4e0022d1aeaab0eeb9934f93fbba55d'
};
async function main(){
  let drift=false;
  for(const [pathname,sha] of Object.entries(expected)){
    const response=await fetch(base+pathname,{
      method:'GET',redirect:'follow',signal:AbortSignal.timeout(15000),
      cache:'no-store',headers:{'Accept':'text/html,text/css;q=0.8,*/*;q=0.5'}
    });
    assert.equal(response.status,200,'Rota fora do ar: '+pathname);
    const data=Buffer.from(await response.arrayBuffer());
    const actual=crypto.createHash('sha256').update(data).digest('hex');
    const match=actual===sha;
    console.log((match?'OK BASELINE ':'MUDANÇA EM PRODUÇÃO ')+pathname+
      ' ('+data.length+' bytes, sha256 '+actual.slice(0,16)+'…)');
    if(!match)drift=true;
  }
  if(drift){
    console.error('ABORTAR PUBLICAÇÃO: arquivos públicos mudaram desde a auditoria. Reconciliar antes de substituir.');
    process.exitCode=2;
  }else{
    console.log('SNAPSHOT CONFERIDO. Isto NÃO autoriza publicar: backup, revisão do diff, credenciais e testes ainda são necessários.');
  }
}
main().catch(err=>{console.error('SEM BASELINE CONFIÁVEL: '+err.message);process.exitCode=1;});
