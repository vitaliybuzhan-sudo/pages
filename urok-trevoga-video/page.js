// Урок + предложение (ветка B воронки тревоги). Работает внутри shadow root.
// Логика таймера перенесена с оффера тревоги (ccUUHqW8okC8DOhSkZk3_Q) с принятым исправлением:
// при сбое хранилища (unavailable) доступна только полная цена. Ключ хранения общий с оффером.
const STORAGE_KEY = 'selfguide:anxiety:visitor-offer:v1';
const DURATION_MS = 60 * 60 * 1000;

export default function init(root) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));

  // Якоря внутри shadow root.
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-checkout-plan')) return;
    const id = a.getAttribute('href').slice(1);
    const el = id && root.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const header = $('header');
    const offset = (header ? header.offsetHeight : 0) + 16;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  });

  // Переключатель тарифов.
  const setPlan = (plan) => {
    $$('[data-plan-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.planBtn === plan)));
    $$('[data-plan]').forEach((p) => { p.hidden = p.dataset.plan !== plan; });
  };
  $$('[data-plan-btn]').forEach((b) => b.addEventListener('click', () => setPlan(b.dataset.planBtn)));
  setPlan('year');

  // ===== Таймер предложения =====
  const toggle = (name, show) => $$('[data-ui-when="' + name + '"]').forEach((el) => { el.hidden = !show; });
  const status = $('[data-integration-status]');
  const countdowns = $$('[data-offer-countdown]');
  const firstOpen = Date.now();
  const monotonicStart = performance.now();
  let latestNow = firstOpen;
  let storage, record = null, interval = null, unavailable = false, state = 'initializing';
  const now = () => {
    latestNow = Math.max(latestNow, Date.now(), firstOpen + performance.now() - monotonicStart);
    return latestNow;
  };
  const decode = (raw) => {
    if (raw === null) return null;
    const v = JSON.parse(raw);
    if (!v || v.version !== 1 || !Number.isSafeInteger(v.startedAt) || v.startedAt <= 0 ||
        !Number.isSafeInteger(v.deadlineAt) || v.deadlineAt - v.startedAt !== DURATION_MS ||
        (v.expired !== undefined && typeof v.expired !== 'boolean')) throw new Error('Invalid saved offer');
    return v;
  };
  const same = (a, b) => a.startedAt === b.startedAt && a.deadlineAt === b.deadlineAt && !!a.expired === !!b.expired;
  const earliest = (values) => {
    const valid = values.filter(Boolean);
    const w = valid.reduce((a, b) => (b.deadlineAt < a.deadlineAt ? b : a));
    return { version: 1, startedAt: w.startedAt, deadlineAt: w.deadlineAt, expired: valid.some((v) => v.expired === true) };
  };
  const eligible = (plan, st) => (st === 'active'
    ? plan === 'year' || plan === 'forever'
    : (st === 'expired' || st === 'unavailable') && plan === 'full');
  const render = (st) => {
    state = st;
    toggle('active', st === 'active');
    toggle('expired', st !== 'active' && st !== 'initializing');
    $$('[data-checkout-plan]').forEach((btn) => {
      const ok = eligible(btn.dataset.checkoutPlan, st);
      btn.setAttribute('aria-disabled', String(!ok));
      btn.tabIndex = ok ? 0 : -1;
    });
    const msg = st === 'unavailable'
      ? 'Не удалось сохранить или проверить срок предложения в этом браузере. Показана обычная цена.'
      : st === 'expired' ? 'Время предложения истекло.'
      : st === 'initializing' ? 'Проверяем срок предложения…' : '';
    if (status && status.textContent !== msg) status.textContent = msg;
  };
  const failClosed = () => {
    unavailable = true;
    if (interval !== null) { clearInterval(interval); interval = null; }
    countdowns.forEach((el) => { el.textContent = '—'; });
    render('unavailable');
  };
  const persist = (value) => {
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
    const saved = decode(storage.getItem(STORAGE_KEY));
    if (!saved) throw new Error('Offer storage did not persist');
    return earliest([value, saved]);
  };
  const tick = (observed = []) => {
    if (unavailable || !record) return;
    try {
      const saved = decode(storage.getItem(STORAGE_KEY));
      if (!saved) throw new Error('Saved offer was removed');
      record = earliest([record, saved, ...observed]);
      if (record.deadlineAt - now() <= 0) record.expired = true;
      if (!same(saved, record)) record = persist(record);
      const s = record.expired ? 0 : Math.max(0, Math.ceil((record.deadlineAt - now()) / 1000));
      const text = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      countdowns.forEach((el) => { el.textContent = text; });
      render(record.expired || s === 0 ? 'expired' : 'active');
    } catch (_) { failClosed(); }
  };
  window.addEventListener('storage', (e) => {
    if (unavailable || e.storageArea !== storage || (e.key !== STORAGE_KEY && e.key !== null)) return;
    try {
      if (e.newValue === null) throw new Error('Saved offer was removed');
      const changed = decode(e.newValue), previous = decode(e.oldValue);
      if (!record) record = earliest([changed, previous]);
      tick([changed, previous]);
    } catch (_) { failClosed(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('pageshow', () => tick());
  window.addEventListener('focus', () => tick());

  const initialize = () => {
    if (unavailable) return;
    const saved = decode(storage.getItem(STORAGE_KEY));
    if (saved && saved.startedAt > now()) throw new Error('Saved offer is ahead of the browser clock');
    // Обычно срок уже поставила посадочная в момент подписки; если нет — стартует с открытия урока.
    const firstVisit = { version: 1, startedAt: firstOpen, deadlineAt: firstOpen + DURATION_MS, expired: false };
    record = earliest([saved, record, firstVisit]);
    if (!saved || !same(saved, record)) record = persist(record);
    tick();
    if (!unavailable) interval = setInterval(() => tick(), 1000);
  };
  render('initializing');
  try {
    storage = window.localStorage;
    if (navigator.locks && typeof navigator.locks.request === 'function') {
      navigator.locks.request(STORAGE_KEY, initialize).catch(failClosed);
    } else initialize();
  } catch (_) { failClosed(); }

  // Кнопки оплаты: ссылку ставит Интегратор в href; пока href="#" — переход не происходит.
  $$('[data-checkout-plan]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (btn.getAttribute('aria-disabled') === 'true') return;
      tick();
      if (!eligible(btn.dataset.checkoutPlan, state)) return;
      const href = btn.getAttribute('href');
      if (href && href !== '#') window.location.href = href;
    });
  });
}
