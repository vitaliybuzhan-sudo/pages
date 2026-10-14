// Кнопки регистрации ведут на форму Prodamus XL; метки из адреса лендинга (utm_*) передаются в форму.
export default function (root) {
  const q = new URLSearchParams(location.search); const keep = new URLSearchParams();
  q.forEach((v, k) => { if (/^utm_/.test(k)) keep.set(k, v) });
  if (![...keep].length) return;
  root.querySelectorAll('a[data-reg]').forEach(a => { const u = new URL(a.href); keep.forEach((v, k) => u.searchParams.set(k, v)); a.href = u.toString() });
}
