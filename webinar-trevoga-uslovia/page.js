// Таймер до конца условий и записи: 21.10.2026, 21:00 по Алматы. После — блоки .open-only скрываются, видно .closed.
const END = Date.parse('2026-10-21T21:00:00+05:00');
export default function (root) {
  const wb = root.querySelector('.wb'); const els = root.querySelectorAll('[data-timer]');
  const tick = () => { const left = END - Date.now();
    if (left <= 0) { wb && wb.classList.add('is-over'); return false }
    const h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4), s = Math.floor(left % 6e4 / 1e3);
    const d = Math.floor(h / 24), hh = h % 24; els.forEach(e => e.textContent = (d ? d + ' дн ' : '') + (d || hh ? hh + ' ч ' : '') + String(m).padStart(2, '0') + ' мин' + (d ? '' : ' ' + String(s).padStart(2, '0') + ' с')); return true };
  if (tick()) { const t = setInterval(() => { if (!tick()) clearInterval(t) }, 1000) }
}
