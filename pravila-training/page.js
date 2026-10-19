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

  // Общие продажи: 21.10 12:00 Алматы — 24.10 23:59 Алматы (21:59 МСК). Кнопки предзаписи сами меняются на «Оплатить».
  // Проверка без ожидания: ?qa_now=2026-10-21T07:05:00Z
  const OPEN = Date.parse('2026-10-21T07:00:00Z');
  const CLOSE = Date.parse('2026-10-24T18:59:59Z');
  const PAY = 'https://vitaliybuzhan.ru/pravila-oplata';
  const CHAT = 'https://t.me/+xIlds4Qm_dplZjky';
  const qa = new URLSearchParams(location.search).get('qa_now');
  const skew = qa && !isNaN(Date.parse(qa)) ? Date.parse(qa) - Date.now() : 0;
  const now = () => Date.now() + skew;
  const payUrl = () => {
    const u = new URL(PAY); const q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => { const v = q.get(k); if (v) u.searchParams.set(k, v); });
    if (!u.searchParams.get('utm_source')) { u.searchParams.set('utm_source', 'landing'); u.searchParams.set('utm_medium', 'pravila-training'); }
    return u.toString();
  };
  const chatLinks = $$('a[href^="' + CHAT + '"]');
  const orig = chatLinks.map((a) => ({ a, label: (a.querySelector('b') || a).firstChild && (a.querySelector('b') || a).childNodes[0].textContent }));
  const label = (a, t) => { const b = a.querySelector('b'); if (b) b.textContent = t; else if (a.firstChild) a.firstChild.textContent = t + ' '; };
  const cdTitle = $('.s295'); const cdNote = $('.s301');
  let phase = '';
  const setPhase = () => {
    const t = now(); const ph = t >= CLOSE ? 'closed' : t >= OPEN ? 'open' : 'before';
    if (ph === phase) return; phase = ph;
    orig.forEach(({ a, label: l }) => {
      if (ph === 'open') { a.href = payUrl(); a.removeAttribute('target'); label(a, a.closest('header') ? 'Оплатить' : 'Оплатить участие'); }
      else { a.href = CHAT; a.target = '_blank'; if (l != null) label(a, l.trim()); }
    });
    if (cdTitle) cdTitle.textContent = ph === 'open' ? 'До закрытия продаж' : ph === 'closed' ? 'Продажи закрыты' : 'До открытия общих продаж';
    if (cdNote) cdNote.textContent = ph === 'open' ? 'Продажи открыты до 24 октября, 23:59 по Алматы / 21:59 МСК' : ph === 'closed' ? 'Следите за новостями в канале' : 'Общие продажи открываются 21 октября в 12:00 Алматы / 10:00 МСК';
  };

  // Countdown: до открытия продаж, затем до закрытия.
  const cd = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
  const p = (n) => String(n).padStart(2, '0');
  const tick = () => {
    setPhase();
    const deadline = phase === 'before' ? OPEN : CLOSE;
    const s = Math.max(0, Math.floor((deadline - now()) / 1000));
    if (cd.d) cd.d.textContent = String(Math.floor(s / 86400));
    if (cd.h) cd.h.textContent = p(Math.floor((s % 86400) / 3600));
    if (cd.m) cd.m.textContent = p(Math.floor((s % 3600) / 60));
    if (cd.s) cd.s.textContent = p(s % 60);
  };
  tick();
  setInterval(tick, 1000);
}
