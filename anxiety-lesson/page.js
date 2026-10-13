// Интерактив страницы /anxiety-lesson: подписка в два шага. Работает внутри shadow root загрузчика.
// UTM и метки из адреса запоминаются и передаются дальше на страницу урока.

// Адрес страницы урока в Продамусе (XL 2PsPUkf6GUayUgTT3mr7tA). В превью на github.io ведет на превью урока.
const LESSON_URL = 'https://vitaliybuzhan.ru/anxiety-lesson-watch';
const LESSON_PREVIEW = '../anxiety-lesson-watch/preview.html';
const SOURCE_TAG = 'anxiety_mvp_web';

// Сохранение почты в Prodamus XL.
// На странице /anxiety-lesson в XL (9ESFwHMtsEyD4Kruklcc3A) стоит скрытая родная форма XL с именем anxiety_mvp_web
// (поле email). Страница переносит почту в эту форму и отправляет ее: XL создает или находит контакт,
// а сценарий страницы (WVr3TzKGfUG7XPKpzslDPw) ставит метку anxiety_mvp_web. UTM XL берет из визита страницы.
// Вернуть true, если форма XL найдена и отправлена (дальше XL сам переводит на страницу урока).
// Нет формы (превью) или ошибка — false: урок открываем сами, чтобы человек не застрял.
const XL_FORM = 'form[form-name="' + SOURCE_TAG + '"]';
function saveLead(email) {
  try {
    const form = document.querySelector(XL_FORM);
    const input = form && form.querySelector('input[name="email"]');
    const submit = form && form.querySelector('[type="submit"]');
    if (!input || !submit) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, email);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    submit.click();
    return true;
  } catch (_) {
    return false;
  }
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
    const base = host.dataset.next || (/github\.io$|^localhost$|^127\./.test(location.hostname) ? LESSON_PREVIEW : LESSON_URL);
    const q = keep.toString();
    const go = () => location.assign(base + (q ? (base.includes('?') ? '&' : '?') + q : ''));
    // Форма XL отправлена — ждем, пока XL сохранит почту и сам переведет на урок; если не перевел за 4 с, открываем урок сами.
    if (saveLead(email)) setTimeout(go, 4000); else go();
  });
}
