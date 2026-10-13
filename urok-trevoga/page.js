// Посадочная урока о тревоге: подписка в два шага. Работает внутри shadow root.
// Ставит старт 60-минутного предложения в момент подписки (тот же ключ, что у оффера тревоги).
const OFFER_KEY = 'selfguide:anxiety:visitor-offer:v1';
const DURATION_MS = 60 * 60 * 1000;

// LINK: адрес страницы урока (vitaliybuzhan.ru/urok-trevoga-video) — ставит Интегратор вместе с сохранением почты в XL.
const NEXT_URL = '';
// LINK: отправка почты в XL (форма/лид, источник anxiety_mvp_web, utm). Функция должна вернуть Promise; пока пусто — почта никуда не уходит.
const SAVE_LEAD = null; // (email, utm) => Promise

export default function init(root) {
  const $ = (s) => root.querySelector(s);
  const step1 = $('[data-step="1"]');
  const form = $('form[data-step="2"]');
  const input = $('#ut-email');
  const err = $('#ut-email-err');
  if (!step1 || !form || !input) return;

  $('[data-open-step2]').addEventListener('click', () => {
    step1.hidden = true;
    form.hidden = false;
    input.focus();
  });

  const valid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const setErr = (msg) => {
    err.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  input.addEventListener('input', () => { if (err.textContent && valid(input.value.trim())) setErr(''); });

  const startOffer = () => {
    try {
      const raw = window.localStorage.getItem(OFFER_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (v && v.version === 1 && Number.isSafeInteger(v.deadlineAt)) return; // уже идет — не продлеваем
      }
      const t = Date.now();
      window.localStorage.setItem(OFFER_KEY, JSON.stringify({ version: 1, startedAt: t, deadlineAt: t + DURATION_MS, expired: false }));
    } catch (_) { /* браузер не хранит данные — страница урока покажет обычную цену */ }
  };

  const utm = {};
  new URLSearchParams(location.search).forEach((val, key) => { if (/^utm_/.test(key)) utm[key] = val; });

  const nextUrl = () => {
    if (NEXT_URL) return NEXT_URL + location.search;
    if (/github\.io$/.test(location.hostname)) return '../urok-trevoga-video/preview.html' + location.search;
    return '';
  };

  let busy = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) return;
    const email = input.value.trim();
    if (!valid(email)) { setErr('Проверьте адрес почты.'); input.focus(); return; }
    setErr('');
    busy = true;
    const btn = form.querySelector('button[type="submit"]');
    btn.setAttribute('aria-disabled', 'true');
    Promise.resolve(SAVE_LEAD ? SAVE_LEAD(email, utm) : null)
      .then(() => {
        startOffer();
        const url = nextUrl();
        if (url) window.location.href = url;
        else { busy = false; btn.removeAttribute('aria-disabled'); }
      })
      .catch(() => {
        busy = false;
        btn.removeAttribute('aria-disabled');
        setErr('Не получилось отправить. Попробуйте еще раз.');
      });
  });
}
