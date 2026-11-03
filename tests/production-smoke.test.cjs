'use strict';

// Verifica a versão publicada, sem efetuar login ou enviar formulários.
const base = process.env.PROXIMAERA_SITE_URL || 'https://proximaera.com.br';
const checks = [
  { path: '/', markers: ['href="radar/"'], anyMarkers: ['href="aplicativos/"', 'href="apps/"'] },
  { path: '/radar/', markers: ['Radar', 'https://elitewp.com.br/radar'] },
  { path: '/aplicativos/', markers: ['Boleto Rush!', 'MyEggs', 'República dos Malandros', 'Brasil em Apuros'] },
  { path: '/aplicativos/boleto-rush/privacidade.html', markers: ['Boleto Rush'] },
  { path: '/contato.html', markers: ['contactForm'] },
  { path: '/editorial/', markers: [] },
  { path: '/botucatu/', markers: [] },
  { path: '/sitemap.xml', markers: ['https://proximaera.com.br/radar/'] },
];

async function main() {
  let failures = 0;
  for (const check of checks) {
    const url = new URL(check.path, base);
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
        headers: { 'user-agent': 'ProximaEra-SiteSmoke/1.0' },
      });
      const body = await response.text();
      const missing = check.markers.filter(marker => !body.includes(marker));
      const missingNavigation = check.anyMarkers && !check.anyMarkers.some(marker => body.includes(marker));
      if (!response.ok || missing.length || missingNavigation) {
        failures++;
        console.error('FAIL', check.path, 'HTTP', response.status,
          missing.length ? 'missing: ' + missing.join(', ') : '',
          missingNavigation ? 'missing any navigation: ' + check.anyMarkers.join(' or ') : '');
      } else {
        console.log('PASS', check.path, 'HTTP', response.status);
      }
    } catch (error) {
      failures++;
      console.error('FAIL', check.path, error.message);
    }
  }
  console.log(`SITE_SMOKE: ${checks.length - failures}/${checks.length} passed`);
  if (failures) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
