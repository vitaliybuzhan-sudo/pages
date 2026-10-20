// Живой блок эфира: вход за 30 минут → «Мы в эфире» → ожидание записи → честный статус подготовки.
// Время берется с сервера (заголовок Date), а не с часов телефона.
// Проверка без ожидания: добавить к адресу ?qa_now=2026-10-20T15:40:00Z
const ZOOM = 'https://us02web.zoom.us/j/83700365933?pwd=69F2oWCIUa4YkwIaFHLRzXFvbqjqO9.1';
const OPEN = Date.parse('2026-10-20T15:30:00Z');   // 20:30 Алматы · 18:30 МСК — появляется кнопка
const START = Date.parse('2026-10-20T16:00:00Z');  // 21:00 Алматы · 19:00 МСК — старт
const CLOSE = Date.parse('2026-10-20T17:24:49Z');  // 22:24:49 Алматы — эфир завершен, открываем ожидание записи
const REC_EXPECTED = Date.parse('2026-10-20T18:05:00Z'); // 20.10, 23:05 Алматы — ожидаем публикацию, не подтверждаем готовность
const SALES_END = Date.parse('2026-10-24T18:59:00Z'); // 24.10, 23:59 Алматы — продажи закрываются
const REC = 'https://vitaliybuzhan.ru/webinar-trevoga-zapis';

const CSS = `
.live{border-top:1px solid #D9D1EE;padding-top:16px;display:flex;flex-direction:column;gap:10px}
.live-k{font-family:Literata,Georgia,serif;font-style:italic;font-size:15px;color:var(--muted)}
.live-t[hidden]{display:none}
.live-t{font-family:"PT Mono",monospace;font-size:clamp(22px,2.4vw,28px);font-weight:700;letter-spacing:-.01em;color:var(--ink)}
.live-n{font-size:14px;color:var(--muted);line-height:1.5}
.live .cta{width:100%;justify-content:space-between}
.live-on .live-k{color:#C0392B;font-style:normal;font-family:Onest,sans-serif;font-weight:700;display:flex;align-items:center;gap:8px}
.live-on .live-k:before{content:"";width:9px;height:9px;border-radius:50%;background:#E5484D;animation:livepulse 1.4s infinite}
@keyframes livepulse{50%{opacity:.25}}
.live-wide{max-width:560px;margin-top:28px;background:var(--lav-card);border:0;border-radius:24px;padding:clamp(20px,3vw,32px)}
@media(prefers-reduced-motion:reduce){.live-on .live-k:before{animation:none}}
`;

const ARR = '<span class="arr" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
const recBtn = (u, t) => `<a class="cta" href="${u}"><span>${t}</span>${ARR}</a>`;
function recUrl() {
  const u = new URL(REC); let q; try { q = new URLSearchParams(location.search) } catch (e) { q = new URLSearchParams() }
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => { const v = q.get(k); if (v) u.searchParams.set(k, v) });
  if (!u.searchParams.get('utm_source')) { u.searchParams.set('utm_source', 'web2010'); if (!u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', 'landing'); if (!u.searchParams.get('utm_content')) u.searchParams.set('utm_content', 'after_live') }
  return u.toString();
}
const zoomBtn = t => `<a class="cta" href="${ZOOM}" target="_blank" rel="noopener"><span>${t}</span>${ARR}</a>`;

function pad(n) { return String(n).padStart(2, '0') }
function left(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), c = s % 60;
  const dd = d ? d + ' ' + (d % 10 === 1 && d % 100 !== 11 ? 'день' : (d % 10 >= 2 && d % 10 <= 4 && (d % 100 < 10 || d % 100 >= 20)) ? 'дня' : 'дней') + ' ' : '';
  return dd + pad(h) + ':' + pad(m) + ':' + pad(c);
}

export default async function mountLive(root) {
  const boxes = [...root.querySelectorAll('[data-live]')];
  const ctas = [...root.querySelectorAll('[data-live-cta]')];
  if (!boxes.length && !ctas.length) return;
  const st = document.createElement('style'); st.textContent = CSS; (root.querySelector('.wb') || root).appendChild(st);

  // поправка часов: сервер против устройства
  let skew = 0;
  const qa = new URLSearchParams(location.search).get('qa_now');
  if (qa && !isNaN(Date.parse(qa))) skew = Date.parse(qa) - Date.now();
  else try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    let r;
    try { r = await fetch(location.origin + '/?_t=' + Date.now(), { method: 'HEAD', cache: 'no-store', signal: controller.signal }); }
    finally { clearTimeout(timeout); }
    const d = Date.parse(r.headers.get('date') || '');
    if (!isNaN(d)) skew = d - Date.now();
  } catch (e) {}
  const now = () => Date.now() + skew;

  let phase = '';
  let redirected = false;
  function render() {
    const t = now();
    // После завершения эфира ведем на запись/ожидание, сохраняя только UTM-метки.
    // replace не возвращает человека назад в регистрацию; на странице записи редиректа нет.
    if (t >= CLOSE && !redirected && /^\/svoboda-ot-trevogi\/?$/.test(location.pathname)) {
      redirected = true;
      location.replace(recUrl());
    }
    const p = t < OPEN ? 'before' : t < CLOSE ? 'live' : t < REC_EXPECTED ? 'preparing' : t < SALES_END ? 'pending' : 'sales-closed';
    if (p === 'before') {
      boxes.forEach(b => {
        if (phase !== 'before') {
          b.className = b.className.replace(/\blive-on\b/, '').trim();
          b.innerHTML = '<p class="live-k">До начала эфира</p><p class="live-t" data-left></p><p class="live-n">За 30 минут до начала, в 20:30 по Алматы (18:30 по Москве), здесь появится кнопка входа в Зум.</p>';
        }
        b.querySelector('[data-left]').textContent = left(START - t);
      });
    } else if (p === 'live' && phase !== 'live') {
      boxes.forEach(b => {
        b.innerHTML = '<p class="live-k" data-k></p><p class="live-t" data-start-left></p>' + zoomBtn('Подключиться к эфиру в Зум') + '<p class="live-n" data-n></p>';
      });
      root.querySelectorAll('[data-live-cta]').forEach(old => {
        const a = old.cloneNode(true); // копия без обработчика «прокрутить к форме»
        old.replaceWith(a);
        a.href = ZOOM; a.target = '_blank'; a.rel = 'noopener';
        a.removeAttribute('data-reg');
        const s = a.querySelector('span'); if (s) s.textContent = 'Подключиться к эфиру в Зум'; else a.textContent = 'Войти в эфир';
        const note = a.parentElement && a.parentElement.querySelector('.cta-note'); if (note) note.textContent = 'Эфир 20 октября в 21:00 по Алматы, 19:00 по Москве';
      });
    } else if (['preparing', 'pending', 'sales-closed'].includes(p) && phase !== p) {
      const rec = recUrl(); const salesOpen = t < SALES_END;
      const title = salesOpen ? 'Готовим запись' : 'Эфир завершен';
      const waiting = p === 'preparing' ? '<p class="live-n">До ожидаемой публикации записи</p><p class="live-t" data-record-left></p>' : '';
      const note = p === 'preparing'
        ? 'Ожидаем запись к 23:05 по Алматы. После публикации запись останется доступной.'
        : p === 'pending'
          ? 'Запись готовится. Появится <a href="' + rec + '">здесь</a>. После публикации запись останется доступной.'
          : 'Продажи закрылись 24 октября в 23:59 по Алматы. Запись вебинара остается доступной на странице записи.';
      boxes.forEach(b => {
        b.className = b.className.replace(/\blive-on\b/, '').trim();
        b.innerHTML = '<p class="live-k">' + title + '</p>' + waiting + recBtn(rec, 'Открыть страницу записи') + '<p class="live-n">' + note + '</p>';
      });
      root.querySelectorAll('[data-live-cta]').forEach(old => {
        const a = old.cloneNode(true); old.replaceWith(a);
        a.href = rec; a.removeAttribute('target'); a.removeAttribute('data-reg'); a.style.removeProperty('display');
        const s = a.querySelector('span'); if (s) s.textContent = 'Открыть страницу записи'; else a.textContent = 'Запись эфира';
        const note = a.parentElement && a.parentElement.querySelector('.cta-note'); if (note) note.textContent = p === 'preparing' ? 'Готовим запись. Ожидаем публикацию в 23:05 по Алматы' : salesOpen ? 'Запись готовится. Появится на странице записи' : 'Запись эфира и что дальше';
      });
    }
    if (p === 'live') {
      const started = t >= START;
      boxes.forEach(b => {
        b.classList.toggle('live-on', started);
        const timer = b.querySelector('[data-start-left]');
        timer.hidden = started; timer.textContent = left(START - t);
        b.querySelector('[data-k]').textContent = started ? 'Мы в эфире' : 'Скоро начинаем';
        b.querySelector('[data-n]').textContent = started ? 'Заходите, мы уже в эфире.' : 'Старт в 21:00 по Алматы (19:00 по Москве), через ' + Math.max(1, Math.ceil((START - t) / 60000)) + ' мин. Можно зайти заранее.';
      });
    }
    if (p === 'preparing') boxes.forEach(b => { b.querySelector('[data-record-left]').textContent = left(REC_EXPECTED - t); });
    phase = p;
  }
  render();
  setInterval(render, 1000);
}
