// Интерактив страницы /anxiety-lesson: подписка в два шага. Работает внутри shadow root загрузчика.
// UTM и метки из адреса запоминаются и передаются дальше на страницу урока.

// LINK: Интегратор — адрес страницы урока в Продамусе. В превью на github.io ведет на превью урока.
const LESSON_URL = 'https://vitaliybuzhan.ru/anxiety-lesson-watch';
const LESSON_PREVIEW = '../anxiety-lesson-watch/preview.html';
const SOURCE_TAG = 'anxiety_mvp_web';

// LINK: Интегратор — сохранить почту в базу Prodamus XL (лид/форма XL), метка SOURCE_TAG, utm из params.
// Должна вернуть Promise; при ошибке сохранения урок все равно открываем, чтобы человек не застрял.
async function saveLead(email, params) {
  return { email, params, tag: SOURCE_TAG };
}

export default function init(root, host) {
  const $ = (s) => root.querySelector(s);
  const open = $('[data-optin-open]');
  const form = $('[data-optin-form]');
  const input = $('#al-email');
  const err = $('[data-optin-err]');
  if (!open || !form || !input) return;

  const params = new URLSearchParams(location.search);
  const keep = new URLSearchParams();
  params.forEach((v, k) => { if (/^utm_|^(yclid|gclid|fbclid|ref)$/.test(k)) keep.set(k, v); });

  open.addEventListener('click', () => {
    open.hidden = true;
    form.hidden = false;
    input.focus();
  });

  const valid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true' && valid(input.value.trim())) {
      input.removeAttribute('aria-invalid');
      err.hidden = true;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!valid(email)) {
      input.setAttribute('aria-invalid', 'true');
      err.hidden = false;
      input.focus();
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try { await saveLead(email, Object.fromEntries(keep)); } catch (_) { /* урок открываем в любом случае */ }
    const base = host.dataset.next || (/github\.io$|^localhost$|^127\./.test(location.hostname) ? LESSON_PREVIEW : LESSON_URL);
    const q = keep.toString();
    location.assign(base + (q ? (base.includes('?') ? '&' : '?') + q : ''));
  });
}
