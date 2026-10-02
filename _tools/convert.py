#!/usr/bin/env python3
"""
Claude Design bundle (one-file HTML export) -> page folder for the Prodamus/GitHub Pages loader.

Usage:
  python3 convert.py <bundle.html> <slug> <out_site_dir> [--marks marks.json] [--names a,b,c]

Output: <out_site_dir>/<slug>/{page.html, style.css, sections/NN-name.html, img/*.webp}
page.js (interactivity) is NOT generated: write it by hand from the component logic
printed to <work>/component.js (the bundle's DCLogic class).

marks.json (optional) — literal text replacements applied to the template before rendering,
used to tag dynamic spots for page.js, e.g. {"{{ ss }}": "<span data-cd=\"s\">{{ ss }}</span>"}.
Needs: python3 + Pillow, node + playwright (Chromium). Run from any dir.
"""
import argparse, base64, functools, gzip, html as H, http.server, json, os, re, shutil, subprocess, sys, tempfile, threading

ap = argparse.ArgumentParser()
ap.add_argument('bundle'); ap.add_argument('slug'); ap.add_argument('site')
ap.add_argument('--marks'); ap.add_argument('--names', help='comma-separated section file names')
ap.add_argument('--work', default=None)
a = ap.parse_args()
W = a.work or tempfile.mkdtemp(prefix='convert-')
os.makedirs(W + '/assets', exist_ok=True)

# 1. Unbundle -------------------------------------------------------------
src = open(a.bundle, encoding='utf-8').read()
def island(t):
    m = re.search(r'<script type="__bundler/%s">(.*?)</script>' % t, src, re.S)
    return json.loads(m.group(1)) if m else None
man, tpl, ext = island('manifest'), island('template'), island('ext_resources') or []
EXT = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg',
       'text/javascript': 'js', 'font/woff2': 'woff2', 'text/css': 'css'}
files = {}
for uid, e in man.items():
    b = base64.b64decode(e['data'])
    if e.get('compressed'): b = gzip.decompress(b)
    fn = '%s.%s' % (uid, EXT.get(e['mime'], 'bin'))
    open(W + '/assets/' + fn, 'wb').write(b); files[uid] = fn
for uid, fn in files.items(): tpl = tpl.replace(uid, 'assets/' + fn)
i = tpl.find('<script type="text/x-dc"')
if i >= 0:
    j = tpl.find('</script>', i); open(W + '/component.js', 'w').write(H.unescape(tpl[tpl.find('>', i) + 1:j]))
if a.marks:
    for k, v in json.load(open(a.marks)).items():
        assert tpl.count(k) == 1, 'mark must match exactly once: ' + k
        tpl = tpl.replace(k, v)
res = {e['id']: 'assets/' + files[e['uuid']] for e in ext}
react = [res[k] for k in sorted(res) if '/react@' in k] + [res[k] for k in sorted(res) if '/react-dom@' in k]
pre = '<script>window.__resources=%s;</script>' % json.dumps(res) + ''.join('<script src="%s"></script>' % s for s in react)
tpl = tpl.replace('<head>', '<head>' + pre, 1)
open(W + '/local.html', 'w').write(tpl)

# 2. Render in Chromium and capture the DOM -----------------------------------
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(
    type('Q', (http.server.SimpleHTTPRequestHandler,), {'log_message': lambda *x: None}), directory=W))
threading.Thread(target=srv.serve_forever, daemon=True).start()
port = srv.server_address[1]
js = r"""
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:%d/local.html',{waitUntil:'networkidle'}); await p.waitForTimeout(2000);
 const r=await p.evaluate(()=>{
   const w=document.querySelector('#dc-root > .sc-host > div') || document.querySelector('#dc-root');
   const styles=[...document.querySelectorAll('style')].map(s=>({attrs:[...s.attributes].map(a=>a.name).join(' '),css:s.textContent,
      rules:(()=>{try{return [...s.sheet.cssRules].map(x=>x.cssText).join('\n')}catch(e){return ''}})()}));
   return {wrapStyle:w.getAttribute('style')||'', parts:[...w.children].map(c=>({html:c.outerHTML,label:c.getAttribute('data-screen-label')||c.tagName.toLowerCase(),id:c.id})), styles};
 });
 r.errs=errs; fs.writeFileSync('%s/render.json',JSON.stringify(r)); await b.close();})();
""" % (port, W)
open(W + '/render.js', 'w').write(js)
npm_root = subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()
subprocess.run(['node', W + '/render.js'], check=True, env={**os.environ, 'NODE_PATH': npm_root})
srv.shutdown()
r = json.load(open(W + '/render.json'))
if r['errs']: print('render errors:', r['errs'], file=sys.stderr)

# 3. Build the page folder ------------------------------------------------------
D = os.path.join(a.site, a.slug)
for sub in ('sections', 'img'): shutil.rmtree(os.path.join(D, sub), ignore_errors=True)
os.makedirs(D + '/sections'); os.makedirs(D + '/img')

def slugify(label, idx):
    s = re.sub(r'^\d+\s*', '', label).strip().lower()
    tr = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a','b','v','g','d','e','e','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','ts','ch','sh','sch','','y','','e','yu','ya']))
    s = ''.join(tr.get(c, c) for c in s); s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'part%d' % idx
names = a.names.split(',') if a.names else [slugify(p['label'], i) for i, p in enumerate(r['parts'])]
assert len(names) == len(r['parts']), 'names: %d, parts: %d' % (len(names), len(r['parts']))

cls = {}
def cname(st):
    st = re.sub(r';\s*$', '', st.strip())
    return cls.setdefault(st, 's%d' % (len(cls) + 1))
def tag_fix(m):
    t = m.group(0); sm = re.search(r'\sstyle="([^"]*)"', t)
    if not sm or not sm.group(1).strip(): return re.sub(r'\sstyle="\s*"', '', t)
    c = cname(H.unescape(sm.group(1))); t = t.replace(sm.group(0), '')
    cm = re.search(r'\sclass="([^"]*)"', t)
    return t.replace(cm.group(0), ' class="%s %s"' % (c, cm.group(1))) if cm else re.sub(r'^(<[\w-]+)', r'\1 class="%s"' % c, t)
wrap = cname(r['wrapStyle']) if r['wrapStyle'] else None

from PIL import Image
imgs = {}
for i, (n, p) in enumerate(zip(names, r['parts'])):
    h = re.sub(r'\s(data-dc-tpl|data-sc-name)="[^"]*"', '', p['html']).replace('<span class="sc-interp">', '<span>')
    h = re.sub(r'<[a-zA-Z][^<>]*>', tag_fix, h)
    for s in re.findall(r'(?:src|href)="assets/([^"]+\.(?:png|jpg|webp))"', h):
        if s not in imgs:
            imgs[s] = 'img/img%d.webp' % (len(imgs) + 1)
            Image.open(W + '/assets/' + s).save(os.path.join(D, imgs[s]), 'WEBP', quality=88, method=6)
        h = h.replace('assets/' + s, imgs[s])
    assert 'assets/' not in h, 'unhandled asset in section ' + n
    open('%s/sections/%02d-%s.html' % (D, i, n), 'w').write(h.strip() + '\n')

# CSS: page rules (from the helmet <style> with a body rule) + :hover atomics, in @layer page,
# then former inline styles as unlayered classes — same precedence as inline styles had.
page_css = next((s['css'] for s in r['styles'] if 'data-dc-tpl' in s['attrs'] and re.search(r'(^|\s|})body\s*\{', s['css'])), '')
hover = '\n'.join(s['rules'] for s in r['styles'] if not s['css'].strip() and ':hover' in s['rules'])
fonts = '\n'.join(s['css'] for s in r['styles'] if '@font-face' in s['css'])
css = re.sub(r'(^|[\s}])body\s*\{', r'\1:host{all:initial;display:block;text-align:left;', page_css)
css = re.sub(r'(^|[\s}])html\s*\{[^}]*\}', r'\1', css)
if re.search(r'(^|[\s,}])(html|body)\b', css): print('WARN: html/body selectors left in CSS — review by hand', file=sys.stderr)
out = '/* Page rules */\n@layer page{\n' + css.strip() + '\n' + hover.strip() + '\n}\n\n/* Element styles (former inline styles) */\n'
out += '\n'.join('.%s{%s}' % (c, st) for st, c in cls.items()) + '\n'
open(D + '/style.css', 'w').write(out)

shell = ['<gh-include src="style.css"></gh-include>'] + (['<div class="%s">' % wrap] if wrap else [])
shell += ['<gh-include src="sections/%02d-%s.html"></gh-include>' % (i, n) for i, n in enumerate(names)]
shell += ['</div>'] if wrap else []
open(D + '/page.html', 'w').write('\n'.join(shell) + '\n')

fams = sorted(set(re.findall(r"font-family:\s*'([^']+)'", fonts)))
print('OK ->', D)
print('sections:', ', '.join('%02d-%s' % (i, n) for i, n in enumerate(names)))
print('images:', len(imgs), '| classes:', len(cls), '| fonts used:', ', '.join(fams) or '-')
print('component logic:', W + '/component.js', '(write page.js from it)')
