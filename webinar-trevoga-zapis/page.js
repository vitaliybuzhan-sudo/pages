// Таймер до конца условий и записи: 21.10.2026, 21:00 по Алматы. После — блоки .open-only скрываются, видно .closed.
const END = Date.parse('2026-10-21T21:00:00+05:00');
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
  const wb = root.querySelector('.wb'); const els = root.querySelectorAll('[data-timer]');
  const tick = () => { const left = END - Date.now();
    if (left <= 0) { wb && wb.classList.add('is-over'); return false }
    const h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4), s = Math.floor(left % 6e4 / 1e3);
    const d = Math.floor(h / 24), hh = h % 24; els.forEach(e => e.textContent = (d ? d + ' дн ' : '') + (d || hh ? hh + ' ч ' : '') + String(m).padStart(2, '0') + ' мин' + (d ? '' : ' ' + String(s).padStart(2, '0') + ' с')); return true };
  if (tick()) { const t = setInterval(() => { if (!tick()) clearInterval(t) }, 1000) }
}
