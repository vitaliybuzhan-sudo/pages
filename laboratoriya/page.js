// Лаборатория: состояние набора (до открытия / открыт / закрыт), таймер и кнопки. Работает внутри shadow root загрузчика.
// Ранний доступ для участников вебинара: ?ea=webinar — покупка открыта сразу, до общего набора 21 октября.
const OPEN = Date.UTC(2026, 9, 21, 7, 0, 0);    // 21.10, 12:00 Алматы (10:00 МСК)
const CLOSE = Date.UTC(2026, 9, 24, 21, 0, 0);  // 24.10, 24:00 МСК
const CHECKOUT = 'https://vitaliybuzhan.ru/laboratoriya-oplata';   // оплата «Лаборатория — год» в Prodamus XL (страница DUk3ZSX8ZE2OmVLLdpY9xA, продукт gMMyOtQIC0yMdpsKWC1zFg); откроется после публикации
const REMIND = '#remind';      // Интегратор: подписка на напоминание 21.10
export default function (root) {
  const q = new URLSearchParams(location.search);
  const ea = q.get('ea') === 'webinar';
  const keep = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].filter(k => q.get(k)).map(k => k + '=' + encodeURIComponent(q.get(k))).join('&');
  const withUtm = u => u.startsWith('#') || !keep ? u : u + (u.includes('?') ? '&' : '?') + keep;
  const state = () => { const n = Date.now(); return n >= CLOSE ? 'closed' : (n >= OPEN || ea) ? 'open' : 'before'; };
  const early = () => ea && Date.now() < OPEN;
  const T = {
    before: { cta: 'Напомнить 21 октября', short: 'Напомнить', href: REMIND, label: 'До открытия набора', note: 'Набор на 200 мест откроется 21 октября в 12:00 по Алматы (10:00 МСК) — пришлем напоминание' },
    open: { cta: 'Занять место в Лаборатории', short: 'Занять место', href: CHECKOUT, label: 'До закрытия набора', note: '' },
    closed: { cta: 'Набор закрыт', short: 'Набор закрыт', href: '#price', label: '', note: 'Следующий набор — в начале 2027 года, $399 за год' }
  };
  const ctas = [...root.querySelectorAll('a')].filter(a => /Напомнить/.test(a.textContent)).map(a => {
    const sp = [...a.querySelectorAll('span')].find(s => /Напомнить/.test(s.textContent)) || a;
    return { a, sp, short: !/октября/.test(sp.textContent) };
  });
  const texts = re => { const w = (root.ownerDocument || document).createTreeWalker(root, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) if (re.test(n.nodeValue)) out.push(n); return out; };
  const notes = texts(/Набор на 200 мест откроется 21 октября/);
  const labels = texts(/^\s*До открытия набора\s*$/);
  const units = [...root.querySelectorAll('span')].filter(s => /^(дней|часов|минут|секунд)$/i.test(s.textContent.trim()));
  const digits = units.map(u => u.previousElementSibling && (u.previousElementSibling.querySelector('span') || u.previousElementSibling));
  const p = n => String(n).padStart(2, '0');
  let last = '';
  const apply = () => {
    const st = state(), t = T[st];
    if (st !== last) {
      last = st;
      ctas.forEach(c => { c.sp.textContent = c.short ? t.short : t.cta; c.a.setAttribute('href', withUtm(t.href)); });
      const note = st === 'open' ? (early() ? 'Ранний доступ для участников вебинара — до открытия общего набора · 14 дней на возврат' : 'Продажи до 24 октября или пока есть места · 14 дней на возврат после оплаты') : t.note;
      notes.forEach(n => { n.nodeValue = note; });
      labels.forEach(n => { n.nodeValue = t.label; });
      if (st === 'closed') digits.forEach(d => d && d.closest('div') && (d.closest('div').parentElement.style.display = 'none'));
    }
    const left = Math.max(0, (st === 'before' ? OPEN : CLOSE) - Date.now());
    const v = [p(Math.floor(left / 864e5)), p(Math.floor(left / 36e5) % 24), p(Math.floor(left / 6e4) % 60), p(Math.floor(left / 1e3) % 60)];
    digits.forEach((d, i) => { if (d) d.textContent = v[i % 4]; });
  };
  apply();
  setInterval(apply, 1000);
}
