// Interactivity for /pravila-training. Runs against the page's shadow root.
export default function init(root, host) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));

  // Anchor links (#top, #approach…) — the browser can't see ids inside a shadow root.
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = id && root.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const header = $('header');
    const offset = (header ? header.offsetHeight : 0) + 50;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  });

  // "Узнали себя" — toggle situations, update summary line.
  const scenes = $('[data-scenes]');
  const summary = $('[data-selsum]');
  const buttons = $$('button[data-scene]');
  const update = () => {
    const n = buttons.filter((b) => b.getAttribute('aria-pressed') === 'true').length;
    if (scenes) scenes.setAttribute('data-any', n ? 'true' : 'false');
    if (summary) summary.textContent = n
      ? `Узнали себя в ${n} ${n === 1 ? 'ситуации' : 'ситуациях'} из 6. Именно с этим работаем на тренинге.`
      : '';
  };
  buttons.forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    update();
  }));
  update();

  // "Показать все" on mobile.
  const more = $('button[data-more]');
  if (more && scenes) more.addEventListener('click', () => scenes.setAttribute('data-scenes', 'expanded'));

  // Countdown to sales opening.
  const deadline = new Date(host.dataset.deadline || '2026-10-21T12:00:00+03:00').getTime();
  const cd = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
  const p = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const s = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    if (cd.d) cd.d.textContent = String(Math.floor(s / 86400));
    if (cd.h) cd.h.textContent = p(Math.floor((s % 86400) / 3600));
    if (cd.m) cd.m.textContent = p(Math.floor((s % 3600) / 60));
    if (cd.s) cd.s.textContent = p(s % 60);
  };
  tick();
  setInterval(tick, 1000);
}
