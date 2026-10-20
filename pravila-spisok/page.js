// Таймер до конца окна продаж для списка предзаписи: 24.10.2026, 23:59:59 по Алматы. После — блоки .open-only скрываются, видно .closed.
const END = Date.parse('2026-10-24T23:59:59+05:00');
// Проверка без ожидания: ?qa_now=2026-10-24T18:59:50Z
function passUtm(root) {
  let q; try { q = new URLSearchParams(location.search) } catch (e) { return }
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const inc = {}; keys.forEach(k => { const v = q.get(k); if (v) inc[k] = v });
  if (!Object.keys(inc).length) return;
  root.querySelectorAll('a[data-link]').forEach(a => {
    let u; try { u = new URL(a.href) } catch (e) { return }
    if (!/^https?:$/.test(u.protocol)) return;
    if (inc.utm_source && /^qa_/.test(inc.utm_source)) u.searchParams.set('utm_source', inc.utm_source);
    ['utm_medium', 'utm_content', 'utm_term'].forEach(k => { if (inc[k]) u.searchParams.set(k, inc[k]) });
    a.href = u.toString();
  });
}
export default function (root) {
  passUtm(root);
  // Якорные ссылки (#choice): браузер не видит id внутри shadow root, поэтому прокрутка вручную.
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = id && root.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const header = root.querySelector('header');
    const offset = (header ? header.offsetHeight : 0) + 16;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  });
  const wb = root.querySelector('.wb');
  const cd = { d: root.querySelectorAll('[data-cd="d"]'), h: root.querySelectorAll('[data-cd="h"]'), m: root.querySelectorAll('[data-cd="m"]'), s: root.querySelectorAll('[data-cd="s"]') };
  let skew = 0; try { const qa = new URLSearchParams(location.search).get('qa_now'); if (qa && !isNaN(Date.parse(qa))) skew = Date.parse(qa) - Date.now() } catch (e) {}
  const p2 = n => String(n).padStart(2, '0');
  const set = (k, v) => cd[k].forEach(e => e.textContent = v);
  const tick = () => { const left = END - (Date.now() + skew);
    if (left <= 0) { wb && wb.classList.add('is-over'); return false }
    const t = Math.floor(left / 1000);
    set('d', String(Math.floor(t / 86400))); set('h', p2(Math.floor(t % 86400 / 3600))); set('m', p2(Math.floor(t % 3600 / 60))); set('s', p2(t % 60));
    return true };
  if (tick()) { const t = setInterval(() => { if (!tick()) clearInterval(t) }, 1000) }
}
