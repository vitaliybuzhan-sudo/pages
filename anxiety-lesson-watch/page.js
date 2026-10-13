// Интерактив страницы /anxiety-lesson-watch: таймер предложения, тарифы, якоря. Работает внутри shadow root загрузчика.
// Логика таймера — та же, что на оффере тревоги (XL ccUUHqW8okC8DOhSkZk3_Q), включая исправление сбоя:
// если браузер не может сохранить срок (Telegram, приватный режим), активна только полная цена.
// Ключ хранения общий с оффером: один и тот же человек в одном браузере видит один и тот же срок.

const STORAGE_KEY = 'selfguide:anxiety:visitor-offer:v1';
const DURATION_MS = 60 * 60 * 1000;
const CHECKOUT_ENABLED = true;
// Учет ветки B (funnels/anx.ab): к каждой ссылке оплаты добавляется метка ветки.
const BRANCH = 'utm_source=web&utm_content=branchB';
const CHECKOUT_URLS = Object.freeze({
  year: 'https://vitaliybuzhan.ru/anxiety-mvp-checkout-year?' + BRANCH,
  forever: 'https://vitaliybuzhan.ru/anxiety-mvp-checkout-forever?' + BRANCH,
  full: 'https://vitaliybuzhan.ru/anxiety-mvp-checkout-full?' + BRANCH
});

export default function init(root, host) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));

  // Якоря: браузер не видит id внутри shadow root.
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const el = root.getElementById(a.getAttribute('href').slice(1));
    if (!el) return;
    e.preventDefault();
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 12, behavior: 'smooth' });
  });

  // Переключатель тарифов.
  const tabs = $$('[data-plan-tab]');
  const setPlan = (plan) => {
    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.planTab === plan)));
    $$('[data-plan-card]').forEach((c) => { c.hidden = c.dataset.planCard !== plan; });
  };
  tabs.forEach((t) => t.addEventListener('click', () => setPlan(t.dataset.planTab)));
  setPlan('year');

  // Плавающий таймер: показываем, пока скидка действует и блок предложения не на экране.
  const float = $('[data-float]');
  const offerEl = $('#offer');
  const shell = $('.al');
  let offerInView = true;
  const updateFloat = () => {
    if (!float) return;
    const show = host.dataset.offerState === 'active' && !offerInView;
    float.hidden = !show;
    if (shell) shell.classList.toggle('has-float', host.dataset.offerState === 'active');
  };
  if (float && offerEl && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      offerInView = entries[0].isIntersecting;
      updateFloat();
    }, { threshold: 0.15 }).observe(offerEl);
  } else {
    offerInView = false;
  }

  // Таймер предложения.
  const status = $('[data-offer-status]');
  const countdowns = $$('[data-offer-countdown]');
  const firstOpen = Date.now();
  const monotonicStart = performance.now();
  let latestNow = firstOpen;
  let storage, record = null, interval = null, unavailable = false;
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
  const eligible = (plan, state) => state === 'active'
    ? plan === 'year' || plan === 'forever'
    : (state === 'expired' || state === 'unavailable') && plan === 'full';
  const render = (state) => {
    host.dataset.offerState = state;
    $$('[data-when="active"]').forEach((el) => { el.hidden = state !== 'active'; });
    $$('[data-when="full"]').forEach((el) => { el.hidden = state === 'active'; });
    $$('[data-checkout-plan]').forEach((b) => {
      const on = CHECKOUT_ENABLED && eligible(b.dataset.checkoutPlan, state);
      b.disabled = !on;
      b.setAttribute('aria-disabled', String(!on));
    });
    const msg = state === 'unavailable'
      ? 'Не удалось сохранить или проверить срок предложения в этом браузере. Показана обычная цена.'
      : state === 'expired' ? 'Время предложения истекло.'
        : state === 'initializing' ? 'Проверяем срок предложения…' : '';
    if (status && status.textContent !== msg) status.textContent = msg;
    if (status) status.hidden = !msg;
    updateFloat();
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
      const sec = record.expired ? 0 : Math.max(0, Math.ceil((record.deadlineAt - now()) / 1000));
      const text = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
      countdowns.forEach((el) => { el.textContent = text; });
      render(record.expired || sec === 0 ? 'expired' : 'active');
    } catch (_) { failClosed(); }
  };
  window.addEventListener('storage', (event) => {
    if (unavailable || event.storageArea !== storage || (event.key !== STORAGE_KEY && event.key !== null)) return;
    try {
      if (event.newValue === null) throw new Error('Saved offer was removed');
      const changed = decode(event.newValue);
      const previous = decode(event.oldValue);
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
      navigator.locks.request(STORAGE_KEY, () => { try { initialize(); } catch (_) { failClosed(); } }).catch(failClosed);
    } else {
      initialize();
    }
  } catch (_) { failClosed(); }

  // Кнопки оплаты: перед переходом еще раз сверяем срок.
  $$('[data-checkout-plan]').forEach((b) => {
    const plan = b.dataset.checkoutPlan;
    const url = CHECKOUT_URLS[plan];
    if (!url) return;
    b.dataset.checkoutUrl = url;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      if (!CHECKOUT_ENABLED || b.disabled) return;
      tick();
      if (eligible(plan, host.dataset.offerState)) window.location.assign(url);
    });
  });
}
