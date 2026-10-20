// Форма регистрации Prodamus XL встроена прямо в лендинг (в блоке «Приходите 20 октября»).
// Кнопки «Зарегистрироваться» прокручивают к форме. Метки из адреса (utm_*) уходят в форму.
// Работает как официальный виджет XL: iframe формы, подстройка высоты, переход на «Спасибо» во всем окне.
export default function (root) {
  // живой блок эфира: таймер → кнопка Зума за 30 минут до старта
  import('https://vitaliybuzhan-sudo.github.io/pages/webinar-trevoga/live.js?v=4').then(m => m.default(root)).catch(e => console.error('[live]', e));
  const ID = '4QNnq_iUIUaC5xHLE4TvuQ';
  const box = root.querySelector('[data-xlform]');
  const q = new URLSearchParams(location.search);
  const keep = new URLSearchParams();
  q.forEach((v, k) => { if (/^utm_/.test(k)) keep.set(k, v) });
  // ссылки-запасные тоже несут метки
  root.querySelectorAll('a[data-reg]').forEach(a => { const u = new URL(a.href); keep.forEach((v, k) => u.searchParams.set(k, v)); a.href = u.toString() });
  // кнопки регистрации выше по странице — прокрутка к форме
  root.querySelectorAll('a[data-reg]:not([data-fallback])').forEach(a => a.addEventListener('click', e => {
    if (!box) return; e.preventDefault();
    const reg = root.getElementById ? root.getElementById('register') : null;
    (reg || box).scrollIntoView({ behavior: 'smooth', block: 'start' });
    const card = box.closest('.regbox'); if (card) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash') }
  }));
  if (!box) return;
  const ax = window.AXLData || {};
  const ck = n => { const m = document.cookie.match(new RegExp('(?:^|; )widget_' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : '' };
  const u = new URL('https://vitaliybuzhan.ru/sw/' + ID);
  u.searchParams.set('fromUri', location.href);
  q.forEach((v, k) => u.searchParams.set(k, v));
  const ids = { a_c: ax.contactId || ck('a_c'), a_g: ax.guestId || ck('a_g'), a_s: ax.sessionId || ck('a_s') };
  Object.entries(ids).forEach(([k, v]) => { if (v && String(v).length > 5) u.searchParams.set(k, v) });
  const f = document.createElement('iframe');
  f.id = ID; f.title = 'Регистрация на вебинар'; f.src = u.toString(); f.style.height = '260px';
  f.allow = 'clipboard-write; payment';
  let ok = false;
  window.addEventListener('message', ev => {
    const d = ev.data || {}; if (d.from !== ID && d.from !== 'widget') return;
    if (d.type === 'resize' && d.height) { ok = true; f.style.height = d.height + 'px'; const w = box.querySelector('.reg-wait'); if (w) w.remove() }
    if ((d.type === 'redirect' || d.type === 'redirect-top') && d.href) location.href = d.href;
    if (d.type === 'emulateClick' && d.href) { const a = document.createElement('a'); a.href = d.href; if (d.target) a.target = d.target; document.body.appendChild(a); a.click(); a.remove() }
    if (d.type === 'cookie') try { (d.cookies || []).forEach(c => { document.cookie = 'widget_' + c.name + '=' + encodeURIComponent(c.value) + '; path=/; SameSite=None; Secure' + (c.expires ? '; max-age=' + Math.round(c.expires * 86400) : '') }) } catch (e) {}
  });
  f.addEventListener('load', () => { setTimeout(() => { const w = box.querySelector('.reg-wait'); if (w) w.remove() }, 400) });
  box.appendChild(f);
  // если форма не ответила за 8 секунд — показываем запасную кнопку
  setTimeout(() => { if (!ok) { const fb = root.querySelector('[data-fallback]'); if (fb) fb.hidden = false } }, 8000);
}
