// Регистрация: форма-квиз Prodamus XL (виджет) встраивается в блок регистрации видимой версии (мобильная/десктоп).
// После отправки квиз возвращает на эту же страницу с ?registered=1 — показываем подтверждение.
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

  // таймер до эфира: 5 декабря 2026, 13:00 МСК (10:00 UTC), 90 минут
  const START = Date.UTC(2026, 11, 5, 10, 0, 0), END = START + 90 * 60 * 1000;
  const cell = (n, l) => `<div style="flex:1;min-width:0;max-width:96px;background:#F5F3ED;border:1px solid #DEDBD0;border-radius:6px;padding:10px 4px;text-align:center"><div style="font-size:28px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums" data-n>${n}</div><div style="font-size:12px;color:#686A65;margin-top:6px;letter-spacing:.04em">${l}</div></div>`;
  const note = t => `<div style="padding:14px 16px;background:#F5F3ED;border-left:4px solid #F5BC2F;border-radius:4px;font-size:16px;line-height:1.45;font-weight:600">${t}</div>`;
  const timers = [...root.querySelectorAll('[data-timer]')];
  const pad = n => String(n).padStart(2, '0');
  let mode = '';
  const tick = () => {
    const now = Date.now();
    if (now >= END) { if (mode !== 'after') { mode = 'after'; timers.forEach(t => t.innerHTML = note('Эфир прошёл. Запись появится на этой странице сразу после эфира или на следующий день.')) } return }
    if (now >= START) { if (mode !== 'live') { mode = 'live'; timers.forEach(t => t.innerHTML = note('Эфир идёт прямо сейчас.')) } return }
    let s = Math.floor((START - now) / 1000);
    const v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
    const days = n => (n % 10 === 1 && n % 100 !== 11) ? 'день' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'дня' : 'дней';
    if (mode !== 'count') { mode = 'count'; timers.forEach(t => t.innerHTML = `<div style="display:flex;gap:8px">${cell(v[0], days(v[0]))}${cell(pad(v[1]), 'часов')}${cell(pad(v[2]), 'минут')}${cell(pad(v[3]), 'секунд')}</div>`) }
    else timers.forEach(t => t.querySelectorAll('[data-n]').forEach((el, i) => { const x = i ? pad(v[i]) : String(v[i]); if (el.textContent !== x) { el.textContent = x; if (!i) el.nextElementSibling.textContent = days(v[0]) } }));
  };
  tick(); setInterval(tick, 1000);

  const ID = '2njqKW3lik6hLEUcxewKBg';
  const q = new URLSearchParams(location.search);
  const boxes = [...root.querySelectorAll('[data-xlform]')];
  if (q.get('registered') === '1') {
    boxes.forEach(b => { b.hidden = true; const ok = b.parentNode.querySelector('.js-ok'); if (ok) ok.hidden = false; });
    const reg = [...root.querySelectorAll('#d-reg,#e-reg')].find(el => el.offsetParent !== null);
    if (reg) setTimeout(() => reg.scrollIntoView({ block: 'start' }), 300);
    return;
  }
  const ax = window.AXLData || {};
  const ck = n => { const m = document.cookie.match(new RegExp('(?:^|; )widget_' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : '' };
  const u = new URL('https://vitaliybuzhan.ru/sw/' + ID);
  u.searchParams.set('fromUri', location.href);
  q.forEach((v, k) => u.searchParams.set(k, v));
  const ids = { a_c: ax.contactId || ck('a_c'), a_g: ax.guestId || ck('a_g'), a_s: ax.sessionId || ck('a_s') };
  Object.entries(ids).forEach(([k, v]) => { if (v && String(v).length > 5) u.searchParams.set(k, v) });
  const f = document.createElement('iframe');
  f.id = ID; f.title = 'Регистрация на вебинар'; f.src = u.toString();
  f.style.cssText = 'display:block;width:100%;border:0;height:260px';
  f.allow = 'clipboard-write; payment';
  let ok = false;
  const clearWait = () => root.querySelectorAll('.reg-wait').forEach(w => w.remove());
  window.addEventListener('message', ev => {
    const d = ev.data || {}; if (d.from !== ID && d.from !== 'widget') return;
    if (d.type === 'resize' && d.height) { ok = true; f.style.height = d.height + 'px'; clearWait() }
    if ((d.type === 'redirect' || d.type === 'redirect-top') && d.href) location.href = d.href;
    if (d.type === 'emulateClick' && d.href) { const a = document.createElement('a'); a.href = d.href; if (d.target) a.target = d.target; document.body.appendChild(a); a.click(); a.remove() }
    if (d.type === 'cookie') try { (d.cookies || []).forEach(c => { document.cookie = 'widget_' + c.name + '=' + encodeURIComponent(c.value) + '; path=/; SameSite=None; Secure' + (c.expires ? '; max-age=' + Math.round(c.expires * 86400) : '') }) } catch (e) {}
  });
  f.addEventListener('load', () => setTimeout(clearWait, 400));
  // форма живет в блоке той версии, которая сейчас видна; при смене ширины окна переезжает
  const place = () => {
    const vis = boxes.find(b => b.offsetParent !== null) || boxes[0];
    if (vis && f.parentNode !== vis) vis.appendChild(f);
  };
  place();
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(place, 250) });
  // если форма не ответила за 8 секунд — показываем запасную ссылку
  setTimeout(() => { if (!ok) root.querySelectorAll('[data-fallback]').forEach(a => { a.href = u.toString(); a.hidden = false }) }, 8000);
}
