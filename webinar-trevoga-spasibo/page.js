// Живой блок эфира на странице «Спасибо»: таймер → кнопка Зума за 30 минут до старта
export default function (root) {
  import('https://vitaliybuzhan-sudo.github.io/pages/webinar-trevoga/live.js?v=1').then(m => m.default(root)).catch(e => console.error('[live]', e));
}
