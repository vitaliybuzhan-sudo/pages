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
