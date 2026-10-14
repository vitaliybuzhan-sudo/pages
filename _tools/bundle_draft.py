# Собирает страницу в один HTML для живого черновика в студии: python3 _tools/bundle_draft.py <папка> [...]. Результат: _drafts/bundles/<папка>.html → записать в drafts/<воронка>_<шаг>.html студии.
import re,sys,os,base64
import pathlib
R=str(pathlib.Path(__file__).resolve().parent.parent)+'/'
OUT=R+'_drafts/bundles/'
os.makedirs(OUT,exist_ok=True)
MIME={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'}
def build(name):
    base=R+name+'/'
    shell=open(base+'page.html').read()
    def inc(m):
        p=os.path.normpath(base+m.group(1));t=open(p).read()
        if p.endswith('.css'):return '<style>'+t+'</style>'
        d=base
        def img(mm):
            src=mm.group(2)
            if re.match(r'(https?:|data:|#|mailto:)',src):return mm.group(0)
            f=os.path.normpath(d+src)
            if os.path.exists(f):
                ext=os.path.splitext(f)[1].lower()
                return mm.group(1)+'data:'+MIME.get(ext,'application/octet-stream')+';base64,'+base64.b64encode(open(f,'rb').read()).decode()+'"'
            return mm.group(0)
        return re.sub(r'(\ssrc=")([^"]+)"',img,t)
    body=re.sub(r'<gh-include\s+src="([^"]+)"\s*></gh-include>',inc,shell)
    js=''
    if os.path.exists(base+'page.js'):
        js='<script type="module">'+open(base+'page.js').read().replace('export default function','function __page')+'\n__page(document);</script>'
    html=('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=Literata:ital,wght@0,400;0,500;1,400;1,500&family=Onest:wght@500;600;700;800;900&family=PT+Mono&display=swap">'
      '<style>html,body{margin:0;background:#FBFAF7}</style></head><body>'+body+js+'</body></html>')
    open(OUT+name+'.html','w').write(html);return len(html)
for n in sys.argv[1:]:print(n,build(n))
