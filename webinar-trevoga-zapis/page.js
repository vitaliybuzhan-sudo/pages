// Запись без срока закрытия. Продажи и условия: до 24.10.2026, 23:59 Алматы.
const RECORD_EXPECTED = Date.parse('2026-10-20T23:05:00+05:00'); // Только ожидаемое время, не подтверждение готовности видео.
const SALES_END = Date.parse('2026-10-24T23:59:00+05:00');
const OFFER_DELAY = 180000;
const OFFER_START_KEY = 'webinar-trevoga-zapis:2026-10-20:offer-start';
function offerStartedAt() {
  const openedAt = Date.now();
  try {
    const saved = Number(sessionStorage.getItem(OFFER_START_KEY));
    if (Number.isSafeInteger(saved) && saved > 0 && saved <= openedAt) return saved;
    sessionStorage.setItem(OFFER_START_KEY, String(openedAt));
  } catch (e) {} // Запрет хранилища не мешает таймеру на открытой странице.
  return openedAt;
}
// Метки: ссылки data-link получают UTM, с которыми человек пришел (utm_source=qa_* для проверок тоже), чтобы источник дошел до заказа.
function passUtm(root) {
  let q; try { q = new URLSearchParams(location.search) } catch (e) { return }
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const inc = {}; keys.forEach(k => { const v = q.get(k); if (v) inc[k] = v });
  if (!Object.keys(inc).length) return;
  root.querySelectorAll('a[data-link]').forEach(a => {
    let u; try { u = new URL(a.href) } catch (e) { return }
    if (!/^https?:$/.test(u.protocol)) return;
    // utm_source остается web2010 (метка воронки), кроме проверок qa_*; источник письма или бота уходит в utm_content.
    if (inc.utm_source && /^qa_/.test(inc.utm_source)) u.searchParams.set('utm_source', inc.utm_source);
    else if (inc.utm_source && inc.utm_source !== 'web2010' && !inc.utm_content) u.searchParams.set('utm_content', inc.utm_source);
    ['utm_medium', 'utm_content', 'utm_term'].forEach(k => { if (inc[k]) u.searchParams.set(k, inc[k]) });
    a.href = u.toString();
  });
}
export default function (root) {
  passUtm(root);
  const wb = root.querySelector('.wb');
  const offerStart = offerStartedAt();
  let skew = 0;
  const format = left => {
    const h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4), s = Math.floor(left % 6e4 / 1e3);
    const d = Math.floor(h / 24), hh = h % 24;
    return (d ? d + ' дн ' : '') + (d || hh ? hh + ' ч ' : '') + String(m).padStart(2, '0') + ' мин' + (d ? '' : ' ' + String(s).padStart(2, '0') + ' с');
  };
  const tick = () => {
    const now = Date.now() + skew;
    // Этот блок существует только пока вместо видео показана заглушка.
    const waiting = root.querySelector('[data-record-wait]');
    if (waiting) {
      const beforeExpected = now < RECORD_EXPECTED;
      const countdown = waiting.querySelector('[data-ready-countdown]');
      const timer = waiting.querySelector('[data-ready-timer]');
      const note = waiting.querySelector('[data-ready-note]');
      if (countdown) countdown.hidden = !beforeExpected;
      if (timer) timer.textContent = format(Math.max(0, RECORD_EXPECTED - now));
      if (note) note.textContent = beforeExpected
        ? 'Ожидаем запись к 23:05 по Алматы. Она появится здесь после публикации.'
        : 'Запись готовится. Появится здесь после публикации.';
    }
    if (wb) {
      // Время на странице не зависит от поправки серверных часов.
      // Предложение открывается через три минуты, но не после конца продаж.
      wb.classList.toggle('offer-wait', now >= SALES_END || Date.now() - offerStart < OFFER_DELAY);
      wb.classList.toggle('sales-over', now >= SALES_END);
    }
    root.querySelectorAll('[data-sales-timer]').forEach(e => e.textContent = format(Math.max(0, SALES_END - now)));
    return now < SALES_END;
  };
  let interval;
  const refresh = () => {
    if (tick() && !interval) interval = setInterval(() => {
      if (!tick()) { clearInterval(interval); interval = null; }
    }, 1000);
  };
  refresh(); // Сразу показываем отсчет, не ждем сети.
  // Тот же серверный ориентир, что на странице эфира; при сбое остаются часы устройства.
  fetch(location.origin + '/?_t=' + Date.now(), { method: 'HEAD', cache: 'no-store' })
    .then(r => {
      const d = Date.parse(r.headers.get('date') || '');
      if (!isNaN(d)) { skew = d - Date.now(); refresh(); }
    }).catch(() => {});
}
