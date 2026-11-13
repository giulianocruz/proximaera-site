/* Próxima Era — apresenta a versão beta a partir do manifesto oficial,
   sem armazenar dados de visitantes e sem afetar os links de download. */
(function () {
  'use strict';
  var indicator = document.getElementById('retro-release');
  if (!indicator || typeof fetch !== 'function') return;
  fetch('../retro/version.json', {method:'GET', cache:'no-store', credentials:'omit'})
    .then(function (response) {
      if (!response.ok) throw new Error('Manifesto indisponível');
      return response.json();
    })
    .then(function (manifest) {
      if (!manifest || typeof manifest.version !== 'string'
          || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(manifest.version)
          || manifest.channel !== 'beta') return;
      var message = 'Beta ' + manifest.version + ' disponível no portal oficial';
      if (typeof manifest.published_at === 'string'
          && /^\d{4}-\d{2}-\d{2}$/.test(manifest.published_at)) {
        var parts = manifest.published_at.split('-');
        message += ' · Atualizada em ' + parts[2] + '/' + parts[1] + '/' + parts[0];
      }
      indicator.textContent = message + '.';
    })
    .catch(function () { /* Mantém o texto estático se a rede falhar. */ });
})();
