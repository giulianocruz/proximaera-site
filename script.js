const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

const closeMenu = () => {
  nav?.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
  if (toggle) toggle.textContent = '☰';
};

window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 18), { passive: true });
toggle?.addEventListener('click', () => {
  const open = nav?.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(Boolean(open)));
  toggle.textContent = open ? '✕' : '☰';
});
document.querySelectorAll('.nav a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => {
  if (nav?.classList.contains('open') && !nav.contains(event.target) && !toggle?.contains(event.target)) closeMenu();
});

const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.08 });
  items.forEach(el => observer.observe(el));
} else items.forEach(el => el.classList.add('visible'));

const localFeed = document.querySelector('#local-feed[data-feed]');
if (localFeed) {
  fetch(localFeed.dataset.feed, { cache: 'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error('feed indisponível')))
    .then(feed => {
      if (!Array.isArray(feed) || !feed.length) return;
      localFeed.replaceChildren();
      feed.slice(0, 3).forEach(item => {
        const card = document.createElement('a');
        card.className = 'local-feed-card';
        card.href = item.url;
        const label = document.createElement('span');
        label.textContent = `GUIA LOCAL ${String(item.number).padStart(3, '0')} · BOTUCATU`;
        const title = document.createElement('h3');
        title.textContent = item.title;
        const description = document.createElement('p');
        description.textContent = item.description;
        const action = document.createElement('b');
        action.textContent = 'Ler guia →';
        card.append(label, title, description, action);
        localFeed.append(card);
      });
    })
    .catch(() => {});
}
