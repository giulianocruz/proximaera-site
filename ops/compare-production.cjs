'use strict';
// Inventario somente leitura de drift entre GitHub e VPS publica.
// Nao sobrescreve personalizacoes do servidor; auxilia release cirurgica.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const base = process.env.PROXIMAERA_SITE_URL || 'https://proximaera.com.br';
const files = process.argv.slice(2).length ? process.argv.slice(2) : [
  'index.html', 'privacidade.html', 'tracking.js',
  'fecha-negocio/index.html', 'fecha-negocio/experiment.js',
  'fecha-negocio/preview.js', 'fecha-negocio/responsive.css',
  'fecha-negocio/conversion.css'
];
const sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
async function main() {
  let unavailable = 0;
  for (const file of files) {
    const localPath = path.join(root, file);
    if (!fs.existsSync(localPath)) {
      console.log('MISSING_LOCAL', file); unavailable++; continue;
    }
    try {
      const url = new URL('/' + file.replaceAll('\\', '/'), base);
      const response = await fetch(url, {signal: AbortSignal.timeout(12000)});
      if (!response.ok) { console.log('HTTP_' + response.status, file); unavailable++; continue; }
      const remote = Buffer.from(await response.arrayBuffer());
      const local = fs.readFileSync(localPath);
      const norm = b => b.toString('utf8').replace(/\r\n/g, '\n').trimEnd();
      const sameText = norm(remote) === norm(local);
      const state = remote.equals(local) ? 'IDENTICAL_BYTES' : sameText ? 'IDENTICAL_TEXT' : 'CONTENT_DRIFT';
      console.log(state, file, 'remote=' + sha(remote), 'local=' + sha(local),
        'size=' + remote.length + '/' + local.length);
    } catch (err) { unavailable++; console.log('ERROR', file, err.message); }
  }
  if (unavailable) process.exitCode = 1;
}
main().catch(e => {console.error(e);process.exitCode=1});
