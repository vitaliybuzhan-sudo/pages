export default function (root) {
  // картинки лежат в медиатеке Продамуса (CDN); адреса задаются здесь
  const IMG = window.__TREVOGA_IMG || {};
  root.querySelectorAll('img[data-img]').forEach(i => { const u = IMG[i.dataset.img]; if (u) i.src = u });
  // шрифт Golos Text: @font-face внутри shadow root не работает, подключаем в <head> страницы
  if (!document.querySelector('link[data-golos]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-golos', '');
    l.href = 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }
  // якорные ссылки (#d-buy и т.п.) внутри shadow root: прокручиваем сами
  root.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const el = root.getElementById(a.getAttribute('href').slice(1));
    if (!el) return; e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));
}
