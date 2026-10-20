// Запись: до 21.10.2026, 21:00 Алматы. Продажи и условия: до 24.10.2026, 23:59 Алматы.
const RECORD_END = Date.parse('2026-10-21T21:00:00+05:00');
const SALES_END = Date.parse('2026-10-24T23:59:00+05:00');
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
  const format = left => {
    const h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4), s = Math.floor(left % 6e4 / 1e3);
    const d = Math.floor(h / 24), hh = h % 24;
    return (d ? d + ' дн ' : '') + (d || hh ? hh + ' ч ' : '') + String(m).padStart(2, '0') + ' мин' + (d ? '' : ' ' + String(s).padStart(2, '0') + ' с');
  };
  const tick = () => {
    const now = Date.now();
    if (wb) {
      wb.classList.toggle('record-over', now >= RECORD_END);
      wb.classList.toggle('sales-over', now >= SALES_END);
    }
    root.querySelectorAll('[data-timer]').forEach(e => e.textContent = format(Math.max(0, RECORD_END - now)));
    root.querySelectorAll('[data-sales-timer]').forEach(e => e.textContent = format(Math.max(0, SALES_END - now)));
    return now < SALES_END;
  };
  if (tick()) { const t = setInterval(() => { if (!tick()) clearInterval(t) }, 1000) }
}
