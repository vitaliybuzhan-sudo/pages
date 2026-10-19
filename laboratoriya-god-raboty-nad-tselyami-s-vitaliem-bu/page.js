// Лаборатория (лендинг из Claude Design v9): состояние набора, таймер, места, кнопки и анимации. Работает внутри shadow root загрузчика.
// Ранний доступ для участников вебинара: ?ea=webinar — покупка открыта сразу, до общего набора 21 октября.
const CONFIG = {
  OPEN: Date.UTC(2026, 9, 21, 7, 0, 0),   // 21.10.2026 12:00 Алматы (10:00 МСК) — старт продаж
  CLOSE: Date.UTC(2026, 9, 24, 21, 0, 0), // 24.10.2026 24:00 МСК — конец продаж
  TOTAL_SEATS: 200,
  SEATS_LEFT: 200,                        // обновляется вручную по мере продаж
  CHECKOUT_URL: 'https://vitaliybuzhan.ru/laboratoriya-oplata', // оплата «Лаборатория — год» в Prodamus XL (refs.labPayUrl)
  REMINDER_URL: 'https://vitaliybuzhan.kz/b/107335/103107', // Telegram-бот №107335: напоминание об открытии набора 21.10 12:00 МСК (решение Виталия 15.10)
  MANAGER_URL: 'https://t.me/vitaliybuzhancom' // менеджер в Telegram (Справочник студии)
};

export default function (root) {
  const doc = root.ownerDocument || document;
  const $ = s => root.querySelector(s), $$ = (s, r) => Array.from((r || root).querySelectorAll(s));
  const q = new URLSearchParams(location.search);
  const ea = q.get('ea') === 'webinar';
  const keep = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].filter(k => q.get(k)).map(k => k + '=' + encodeURIComponent(q.get(k))).join('&');
  const withUtm = u => (!u || u.startsWith('#') || !keep) ? u : u + (u.includes('?') ? '&' : '?') + keep;
  const TOTAL = CONFIG.TOTAL_SEATS, seats = Math.max(0, Math.min(TOTAL, CONFIG.SEATS_LEFT));
  const state = () => { const n = Date.now(); if (n >= CONFIG.CLOSE || seats === 0) return 'closed'; return (n >= CONFIG.OPEN || ea) ? 'open' : 'before'; };
  const early = () => ea && Date.now() < CONFIG.OPEN;
  const p = n => String(n).padStart(2, '0');
  const set = (k, v) => $$('[data-v="' + k + '"]').forEach(el => { if (el.textContent !== v) el.textContent = v; });

  // фото с воркшопа: пока файла нет на сайте, блок с картинкой не показываем
  $$('section img').forEach(im => { const hide = () => { if (im.parentElement) im.parentElement.style.display = 'none'; }; if (im.complete && im.naturalWidth === 0 && im.getAttribute('loading') !== 'lazy') hide(); im.addEventListener('error', hide); });

  $$('[data-href="manager"]').forEach(a => { a.href = CONFIG.MANAGER_URL; a.target = '_blank'; a.rel = 'noopener'; });

  let last = '';
  const apply = () => {
    const st = state();
    if (st !== last) {
      last = st;
      const L = {
        before: { href: CONFIG.REMINDER_URL, cta: 'Напомнить 21 октября', cta2: 'Напомнить 21 октября', short: 'Напомнить', note: 'Набор на 200 мест откроется 21 октября в 12:00 по Алматы (10:00 МСК) — пришлю напоминание в Telegram' },
        open: { href: CONFIG.CHECKOUT_URL, cta: 'Занять место в Лаборатории', cta2: 'Занять место — тренинг уже внутри', short: 'Занять место',
          note: early() ? 'Ранний доступ для участников вебинара — до открытия общего набора · 14 дней на возврат' : `Осталось ${seats} из ${TOTAL} мест · продажи до 24 октября · 14 дней на возврат после оплаты` },
        closed: { href: '#price', cta: 'Набор закрыт', cta2: 'Набор закрыт', short: 'Набор закрыт', note: 'Следующий набор — в начале 2027 года, $399 за год' }
      }[st];
      $$('[data-href="cta"]').forEach(a => a.setAttribute('href', withUtm(L.href)));
      set('ctaLabel', L.cta); set('ctaLabel2', L.cta2); set('shortLabel', L.short); set('ctaNote', L.note);
      set('seatsBadge', st === 'open' ? `Осталось ${seats} из ${TOTAL} мест` : `Только ${TOTAL} мест`);
      set('seatsFinal', st === 'open' ? `осталось ${seats} из ${TOTAL} мест` : `всего ${TOTAL} мест`);
      set('seatsLine', st === 'closed' ? 'Все места заняты' : `Свободно ${seats} из ${TOTAL}`);
      set('stickyText', st === 'open' ? `$299 · осталось ${seats} мест` : '$299 · 21–24 окт');
      set('timerLabel', st === 'before' ? 'До открытия набора' : 'До закрытия набора');
      const tm = $('[data-timer]'); if (tm) tm.style.display = st === 'closed' ? 'none' : '';
    }
    const left = Math.max(0, (st === 'before' ? CONFIG.OPEN : CONFIG.CLOSE) - Date.now());
    set('cdD', p(Math.floor(left / 864e5))); set('cdH', p(Math.floor(left / 36e5) % 24));
    set('cdM', p(Math.floor(left / 6e4) % 60)); set('cdS', p(Math.floor(left / 1e3) % 60));
  };
  apply();
  setInterval(apply, 1000);

  // 200 мест: занятые точки — фиолетовые
  const seatGrid = $('[data-seats]');
  if (seatGrid && !seatGrid.children.length) seatGrid.innerHTML = '<span class="s230"></span>'.repeat(TOTAL);
  const sold = seatGrid ? Array.from(seatGrid.children).slice(0, TOTAL - seats) : [];
  sold.forEach(d => { d.style.background = '#6A5AA8'; });

  // Мобильная плашка: выезжает, когда кнопка первого экрана ушла вверх
  const bar = $('[data-sticky-bar]'), heroCta = $('section[data-screen-label^="01 "] [data-cta]');
  if (bar && heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { if (e.boundingClientRect.top < 0 && !e.isIntersecting) bar.setAttribute('data-show', ''); else bar.removeAttribute('data-show'); }).observe(heroCta);
  } else if (bar) bar.setAttribute('data-show', '');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const ease = 'cubic-bezier(.2,.8,.2,1)';
  const once = (el, fn, th) => { if (!el) return; const o = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { o.disconnect(); fn(); } }); }, { threshold: th || 0.35 }); o.observe(el); };
  const prep = (el, kf, opt) => { if (!el || !el.animate) return null; const a = el.animate(kf, Object.assign({ duration: 600, easing: ease, fill: 'both' }, opt)); a.pause(); a.currentTime = 0; return a; };
  const css = (el, k) => (el ? getComputedStyle(el)[k] || '' : '');

  // блик на главной кнопке и на стикере «Выгоднее!»
  const sh = $('[data-cta-shine]');
  if (sh && sh.animate) sh.animate([{ left: '-30%' }, { left: '120%', offset: 0.22 }, { left: '120%' }], { duration: 6000, iterations: Infinity, easing: 'ease-in-out', delay: 1200 });
  const sw = $('[data-shine-sweep]'), arc = $('[data-shine-arc]');
  if (sw && sw.animate) sw.animate([{ left: '-45%' }, { left: '120%', offset: 0.32 }, { left: '120%' }], { duration: 4200, iterations: Infinity, easing: 'ease-in-out' });
  if (arc) {
    let raf = 0;
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const r = arc.getBoundingClientRect(); const k = (r.top + r.height / 2) / window.innerHeight; arc.style.transform = 'rotate(' + (-12 + (0.5 - k) * 140).toFixed(1) + 'deg)'; }); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // заголовки разделов
  $$('section[data-screen-label] h2').forEach(h2 => { if (h2.closest('section[data-screen-label^="01 "]')) return; const a = prep(h2, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 700 }); once(h2, () => a && a.play(), 0.2); });

  // числа набегают от 0
  const counters = ['110', '5+', '36', '$2 858'];
  $$('section[data-screen-label] span, section[data-screen-label] div, section[data-screen-label] b').forEach(el => {
    if (el.children.length) return; const t = el.textContent.replace(/ /g, ' ').trim();
    if (!counters.includes(t)) return;
    const num = parseInt(t.replace(/[^0-9]/g, ''), 10), pre = t.startsWith('$') ? '$' : '', suf = t.endsWith('+') ? '+' : '';
    const fmt = v => pre + (v >= 1000 ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : v) + suf;
    const orig = el.textContent; el.textContent = fmt(0);
    once(el, () => { const t0 = performance.now(), d = 1100; const step = n => { const k = Math.min(1, (n - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = k < 1 ? fmt(Math.round(num * e)) : orig; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }, 0.6);
  });

  // календарь года: линия рисуется, точки загораются
  const yl = $('[data-year-line]');
  if (yl) {
    const grid = yl.parentElement, cols = Array.from(grid.children).filter(c => c !== yl), D = 1800;
    const line = prep(yl, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: D, easing: 'cubic-bezier(.4,0,.2,1)' });
    const dots = cols.map((c, i) => { const d = c.querySelector('[data-ydot]'); const big = !!c.querySelector('[data-ydot] svg'); return prep(d, big ? [{ opacity: 0, transform: 'scale(.3) rotate(-40deg)' }, { opacity: 1, transform: 'scale(1.25) rotate(8deg)', offset: .6 }, { opacity: 1, transform: 'none' }] : [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'none' }], { duration: big ? 700 : 400, delay: (i / Math.max(1, cols.length - 1)) * D * 0.92 }); });
    once(grid, () => { line && line.play(); dots.forEach(a => a && a.play()); }, 0.5);
  }

  // «Если выпаду»: точки по очереди, пауза, золотая вспышка на «вернулись»
  const s6 = $('section[data-screen-label^="06"]');
  const g6 = s6 && Array.from(s6.querySelectorAll('div')).find(d => d.children.length >= 12 && /repeat\(12|(\S+\s+){11}\S+/.test(css(d, 'gridTemplateColumns')) && Array.from(d.children).some(c => c.tagName === 'SPAN'));
  if (g6) {
    const lines = Array.from(g6.children).filter(c => c.tagName === 'SPAN'), cells = Array.from(g6.children).filter(c => c.tagName === 'DIV'), D = 2000;
    const la = lines.map(l => prep(l, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: D, easing: 'linear' }));
    const ca = cells.map((c, i) => {
      const dot = c.children[0]; if (!dot) return [];
      const ret = /248,\s*207,\s*74/.test(css(dot, 'backgroundColor')), pause = css(dot, 'borderTopStyle') === 'dashed'; const delay = (i / 11) * D;
      const kf = ret ? [{ opacity: 0, transform: 'scale(.4)', boxShadow: '0 0 0 0 rgba(248,207,74,0)' }, { opacity: 1, transform: 'scale(1.35)', boxShadow: '0 0 0 14px rgba(248,207,74,.45)', offset: .45 }, { opacity: 1, transform: 'none', boxShadow: '0 0 0 5px #F8CF4A' }] : pause ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'none' }];
      const lab = Array.from(c.children).slice(1).map(l => prep(l, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: delay + 150 }));
      return [prep(dot, kf, { duration: ret ? 900 : pause ? 500 : 380, delay }), ...lab];
    }).flat();
    once(g6, () => { la.forEach(a => a && a.play()); ca.forEach(a => a && a.play()); }, 0.6);
  }

  // чат участников: сообщения появляются по одному
  const s4 = $('section[data-screen-label^="04"]');
  const bub = s4 ? $$('[aria-label="Имя скрыто"]', s4).map(n => n.parentElement) : [];
  if (bub.length) { const order = bub.slice().sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top); const an = order.map((b, i) => prep(b, [{ opacity: 0, transform: 'translateY(18px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: i * 650 })); once(bub[0].parentElement, () => an.forEach(a => a && a.play()), 0.25); }

  // 200 мест: проданные точки заполняются по очереди
  if (seatGrid && sold.length) { const an = sold.map((d, i) => prep(d, [{ background: '#E8E5DF', transform: 'scale(.6)' }, { transform: 'scale(1.2)', offset: .6 }, { transform: 'none' }], { duration: 360, delay: Math.min(i * 10, 1400) })); once(seatGrid, () => an.forEach(a => a && a.play()), 0.5); }
}
