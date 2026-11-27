import json,re,pymupdf,sys
sys.path.insert(0,'/home/claude/work')
from PIL import Image,ImageDraw
from fixes import FIX
doc=pymupdf.open('/mnt/user-data/uploads/catalogue.pdf')
P=json.load(open('out/prods.json')); d=json.load(open('/home/claude/site/somacos-main/build/data/products.json'))
tabs=[]
for i,p in enumerate(d):
  for k,t in enumerate(p['tables']):
    if (i,k) in FIX: continue
    bad=any(h in('Ø','QTE/BOX','PN') and c and re.search(r'[^0-9X x/"\-,.*]',c.replace('CM','').replace('MM','').replace('L/H','')) for r in t['rows'] for h,c in zip(t['head'],r))
    if bad: tabs.append((i,k))
crops=[]
for i,k in tabs:
    pg=doc[P[i]['page']-1]; pix=pg.get_pixmap(clip=pymupdf.Rect(P[i]['tables'][k]),matrix=pymupdf.Matrix(2.3,2.3))
    im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    c=Image.new('RGB',(im.width+70,im.height),'white'); c.paste(im,(70,0)); ImageDraw.Draw(c).text((5,5),f'#{i}',fill='red'); crops.append(c)
n=0;batch=[];h=0
def flush():
    global n,batch,h
    if not batch: return
    W=max(c.width for c in batch); s=Image.new('RGB',(W,sum(c.height+14 for c in batch)),'white'); y=0
    for c in batch: s.paste(c,(0,y)); y+=c.height+14
    s.save(f'v{n}.png'); n+=1; batch=[]; h=0
for c in crops:
    if h+c.height>1500: flush()
    batch.append(c); h+=c.height+14
flush(); print(n, len(tabs), [t[0] for t in tabs])
