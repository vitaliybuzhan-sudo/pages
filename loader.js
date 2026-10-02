/*!
 * Page loader for Prodamus XL → GitHub Pages.
 * Usage inside a Prodamus HTML block:
 *   <div data-gh-page="pravila-training" data-fullbleed></div>
 *   <script src="https://vitaliybuzhan-sudo.github.io/pages/loader.js" async></script>
 * Page folder: page.html (shell with <gh-include src="…">), style.css, sections/*.html, page.js, img/.
 * Optional attribute on the div:
 *   data-fullbleed   stretch to full viewport width if the block sits in a narrow container
 */
(function () {
  var script = document.currentScript;
  var BASE = script ? script.src.replace(/[^/]*$/, '') : '';
  if (!BASE) return console.error('[gh-page] cannot resolve loader URL');

  // @font-face rules are ignored inside shadow roots, so the font stylesheet goes into the host page head.
  if (!document.querySelector('link[data-gh-fonts]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = BASE + 'fonts.css';
    link.setAttribute('data-gh-fonts', '');
    document.head.appendChild(link);
  }

  function get(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
      return r.text();
    });
  }

  function absolutize(html, base) {
    return html.replace(/(\s(?:src|href|poster)=")(?!https?:|data:|mailto:|tel:|#|\/\/|\/)([^"]+)"/g,
      function (_, attr, path) { return attr + base + path + '"'; });
  }

  // Replace <gh-include src="…"></gh-include> with the file's contents (.css → <style>).
  function resolveIncludes(shell, base) {
    var re = /<gh-include\s+src="([^"]+)"\s*><\/gh-include>/g, srcs = [], m;
    while ((m = re.exec(shell))) srcs.push(m[1]);
    return Promise.all(srcs.map(function (s) { return get(base + s); })).then(function (texts) {
      var i = 0;
      return shell.replace(re, function (_, src) {
        var t = texts[i++];
        return /\.css$/.test(src) ? '<style>' + t + '</style>' : absolutize(t, base);
      });
    });
  }

  // Stretch the block to the page width (without the scrollbar, unlike 100vw), even inside a narrow container.
  function fullbleed(host) {
    function fit() {
      host.style.setProperty('width', document.documentElement.clientWidth + 'px', 'important');
      host.style.setProperty('margin-left', '0px', 'important');
      var left = host.getBoundingClientRect().left;
      host.style.setProperty('margin-left', -left + 'px', 'important');
    }
    fit();
    window.addEventListener('resize', fit);
    // A scrollbar appears once the page content is in; re-fit whenever the block or the page changes size.
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { requestAnimationFrame(fit); });
      ro.observe(host);
      ro.observe(document.documentElement);
    }
    return fit;
  }

  function mount(host) {
    if (host.__ghMounted) return;
    host.__ghMounted = true;
    var name = host.getAttribute('data-gh-page');
    var pageBase = BASE + name + '/';

    // Shield the host element itself from site CSS (inline !important beats any stylesheet rule).
    var css = { all: 'initial', display: 'block', 'min-height': '100vh' };
    if (host.hasAttribute('data-fullbleed')) css['max-width'] = 'none';
    for (var k in css) host.style.setProperty(k, css[k], 'important');
    var refit = host.hasAttribute('data-fullbleed') ? fullbleed(host) : function () {};
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    Promise.all([get(pageBase + 'page.html').then(function (s) { return resolveIncludes(s, pageBase); }),
                 get(pageBase + 'page.js').catch(function () { return ''; })])
      .then(function (res) {
        root.innerHTML = res[0];
        host.style.removeProperty('min-height');
        refit();
        setTimeout(refit, 300);
        if (location.hash) {
          var el = root.getElementById && root.getElementById(location.hash.slice(1));
          if (el) setTimeout(function () { el.scrollIntoView(); }, 50);
        }
        if (!res[1]) return;
        var url = URL.createObjectURL(new Blob([res[1]], { type: 'text/javascript' }));
        return import(url).then(function (m) {
          if (m && typeof m.default === 'function') m.default(root, host);
        });
      })
      .catch(function (err) {
        console.error('[gh-page] ' + name + ':', err);
        host.style.removeProperty('min-height');
      });
  }

  function run() {
    var hosts = document.querySelectorAll('[data-gh-page]');
    for (var i = 0; i < hosts.length; i++) mount(hosts[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
