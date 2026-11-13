'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function patch(file,oldText,newText){
 const f=path.join(root,file),text=fs.readFileSync(f,'utf8');
 if(text.includes(newText)){console.log('ALREADY '+file);return;}
 assert.equal(text.split(oldText).length-1,1,'Unexpected '+file+' anchor: no patch applied');
 fs.writeFileSync(f,text.replace(oldText,newText),'utf8');
}
const medium='utm_source=proximaera&amp;utm_medium=site&amp;utm_campaign=retro_beta&amp;utm_content=';
patch('index.html',
 'href="retro/" data-track="projeto-retro-home"',
 'href="retro/?'+medium+'home" data-track="projeto-retro-home"');
patch('aplicativos/index.html',
 'href="../retro/#download">Baixar beta gratuita',
 'href="../retro/?'+medium+'apps#download">Baixar beta gratuita');
const sitemap=path.join(root,'sitemap.xml'),text=fs.readFileSync(sitemap,'utf8');
if(!text.includes('https://proximaera.com.br/retro/')){
 const target='  <url><loc>https://proximaera.com.br/aplicativos/</loc><lastmod>2026-10-28</lastmod><changefreq>monthly</changefreq></url>';
 assert.equal(text.split(target).length-1,1,'Existing sitemap Apps entry unexpected');
 fs.writeFileSync(sitemap,text.replace(target,
  '  <url><loc>https://proximaera.com.br/retro/</loc><lastmod>2026-11-13</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n'+
  '  <url><loc>https://proximaera.com.br/aplicativos/</loc><lastmod>2026-11-13</lastmod><changefreq>monthly</changefreq></url>'
 ),'utf8');
}
console.log('RETRO SEO LINKS AND SITEMAP READY');
