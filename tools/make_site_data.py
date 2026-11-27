import json, re, os, unicodedata, pymupdf
from PIL import Image
doc=pymupdf.open('/mnt/user-data/uploads/catalogue.pdf')
SITE='/home/claude/site/somacos-main'
IMG=SITE+'/site/assets/img/products'
d=json.load(open('/home/claude/work/out/ocr.json'))
SEC={
 'ACCESSOIRES DE COMPRESSION PP':('accessoires-de-compression-pp','Accessoires de compression PP','Compression PP'),
 'ACCESSOIRES EN PVC PIMTAS':('accessoires-en-pvc','Accessoires en PVC','Accessoires PVC'),
 'VANNES CLAPETS':('vannes-clapets','Vannes, clapets et hydrauliques','Vannes & clapets'),
 'FILTRATION ET FERTILISATION':('filtration-et-fertilisation','Filtration et fertilisation','Filtration & fertilisation'),
 'INSTRUMENTS DE MESURE ET MANCHETTE ANTI-VIBRATOIRE':('instruments-de-mesure-et-manchette-anti-vibratoire','Instruments de mesure et manchette anti-vibratoire','Instruments de mesure'),
 'COLLIERS DE PRISE DE CHARGE':('colliers-de-prise-en-charge','Colliers de prise en charge','Colliers de prise en charge'),
 'OUTILLAGE':('outillage','Outillage','Outillage'),
 'ASPERSION':('aspersion','Aspersion','Aspersion'),
 'DIVERS ACCESSOIRES':('divers-accessoires','Divers accessoires','Divers accessoires'),
 'ACCESSOIRES MICRO IRRIGATION PE':('accessoires-micro-irrigation-pe','Accessoires micro-irrigation PE','Accessoires PE'),
 'ACCESSOIRES IRRIGATION POUR GAINE':('accessoires-micro-irrigation-pour-gaine','Accessoires micro-irrigation pour gaine','Accessoires pour gaine'),
 'ACCESSOIRES MICRO IRRIGATION VANNETTES':('accessoires-micro-irrigation-vannettes','Accessoires micro-irrigation : vannettes','Vannettes'),
 'ACCESSOIRES MICRO IRRIGATION GOUTTEURS':('accessoires-micro-irrigation-goutteurs','Accessoires micro-irrigation : goutteurs','Goutteurs'),
 'CANONS D’ARROSAGE':('canons-darrosage','Canons d’arrosage','Canons d’arrosage'),
 'MICRO IRRIGATION GAINE TUYAU PEBD ET GOUTTEUR INTEGRE':('micro-irrigation-gaine-tuyau-pebd-goutteur-integre','Micro-irrigation : gaine, tuyau PEBD et goutteur intégré','Gaine & tuyau PEBD'),
 'TUBING ET ACCESSOIRES TUBING':('tubing-et-accessoires-tubing','Tubing et accessoires tubing','Tubing'),
}
FIX={'TEFLON ASPERSEUR':'MICRO ASPERSEUR','ULTA':'ULTRA','FEMMELLE':'FEMELLE','FEMELE':'FEMELLE','CERCULAIRE':'CIRCULAIRE','DERIVIATION':'DERIVATION','ACOLLER':'A COLLER','VOIS':'VOIES','ENGRAINS':'ENGRAIS','EXTENTION':'EXTENSION','BALON':'BALLON','REBD':'PEBD','COUTEUR':'COUPE-TUBE','JOIN DE':'JOINT DE','Embot':'EMBOUT','BOUTTON':'BOUTON','ALLUMINIUM':'ALUMINIUM','PAPILON':'PAPILLON','MALE-FEMALE':'MALE-FEMELLE','DISUE':'DISQUE','MALE  PP':'MALE PP','SERIE':'SÉRIE','GP':'GREEN PLAINS'}
def fixname(n):
    n=re.sub(r'\s+',' ',n).strip()
    for a,b in FIX.items(): n=re.sub(r'(?<![A-Z])'+re.escape(a)+r'(?![A-Z])',b,n)
    return n.upper().replace('SÉRIE','SERIE')
def slugify(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')
INCH={'0012':'3/8"','0016':'1/2"','0020':'1/2"','0025':'3/4"','0032':'1"','0040':'1 1/4"','0050':'1 1/2"','0063':'2"','0075':'2 1/2"','0090':'3"','0110':'4"'}
def clean_cell(c,h):
    c=c.replace('’’','"').replace('”','"').replace('“','"').replace("''",'"').replace('’"','"').strip(' |')
    if h=='PRIX': c=c.replace(' ','')
    return c
os.makedirs(IMG,exist_ok=True)
# reassign spare photos to products without any
for p in d:
    if p['photos']: continue
    tb=p['tables'][0] if p['tables'] else None
    if not tb: continue
    best=None
    for q in d:
        if q['page']!=p['page'] or len(q['photos'])<2: continue
        for ph in q['photos'][1:]:
            dist=abs((ph[0]+ph[2])/2-(tb[0]+tb[2])/2)+abs(ph[3]-tb[1])
            if best is None or dist<best[0]: best=(dist,q,ph)
    if best and best[0]<260:
        best[1]['photos'].remove(best[2]); p['photos']=[best[2]]
LAY={}
for pg in json.load(open('/home/claude/work/out/layout.json')): LAY[pg['page']]=pg['imgs']
for pn,ims in LAY.items():
    infos=doc[pn-1].get_image_info(xrefs=True)
    for i in ims:
        i['transform']=[x['transform'] for x in infos if x['xref']==i['xref']][0]
out=[];seen={}
for i,p in enumerate(d):
    if p['section'] not in SEC: print('nosec',p['section']); continue
    cat=SEC[p['section']][0]
    name=fixname(p['name'])
    base=slugify(name); slug=base; k=2
    while slug in seen: slug=f'{base}-{k}'; k+=1
    seen[slug]=1
    tables=[]
    for t in p['ocr']:
        head=[h if h else '—' for h in t['head']]
        rows=[[clean_cell(c,head[j]) for j,c in enumerate(r)] for r in t['rows']]
        if 'Ø' in head and 'CODE' in head:
            ci,oi=head.index('CODE'),head.index('Ø')
            hasinch=sum('"' in r[oi] for r in rows)>len(rows)/2
            for r in rows:
                if hasinch and '"' not in r[oi] and r[ci][-4:] in INCH: r[oi]=INCH[r[ci][-4:]]
        if 'CODE' in head:
            ci=head.index('CODE')
            for r in rows:
                toks=[x for x in r[ci].split() if not re.fullmatch(r'[\W_]+',x)]
                if len(toks)>1:
                    codei=next((k for k,x in enumerate(toks) if re.match(r'^[A-Z]{2,}[A-Z0-9]*\d',x.replace('O','0'))),0)
                    rest=toks[codei+1:]; r[ci]=toks[codei]
                    for j in range(ci+1,len(r)):
                        if not rest: break
                        if not r[j]: r[j]=rest.pop(0)
                    if rest: r[ci+1]=(r[ci+1]+' '+' '.join(rest)).strip()
                c=r[ci]
                m=re.match(r'^([A-Z]+?)(O*)([0-9O]+)$',c)
                if m and re.search(r'\d',m.group(3)): c=m.group(1)+('0'*len(m.group(2)))+m.group(3).replace('O','0')
                r[ci]=c
        if 'Ø' in head:
            oi=head.index('Ø')
            for r in rows: r[oi]=re.sub(r'^\d (?=\d+X)','',r[oi]) if re.match(r'^\d \d{2,3}X\d',r[oi]) else r[oi]
        tables.append(dict(head=head,rows=rows))
    # image
    page=doc[p['page']-1]
    img=None
    if p['photos']:
        bb=p['photos'][0]
        xr=[i['xref'] for i in LAY[p['page']] if all(abs(a-b)<0.5 for a,b in zip(i['bbox'],bb))]
        im=None
        try:
            base=pymupdf.Pixmap(doc,xr[0]); sm=[x[1] for x in doc.get_page_images(p['page']-1) if x[0]==xr[0]][0]
            if base.alpha: base=pymupdf.Pixmap(base,0)
            if base.n>3: base=pymupdf.Pixmap(pymupdf.csRGB,base)
            if sm: 
                rgba=pymupdf.Pixmap(base,pymupdf.Pixmap(doc,sm))
                im=Image.frombytes('RGBA',(rgba.width,rgba.height),rgba.samples)
                bg=Image.new('RGBA',im.size,(255,255,255,255)); bg.alpha_composite(im); im=bg.convert('RGB')
            else: im=Image.frombytes('RGB',(base.width,base.height),base.samples)
            tf=[i['transform'] for i in LAY[p['page']] if i['xref']==xr[0]]
        except Exception as e:
            print('fallback',p['name'],e)
        from PIL import ImageFilter, ImageStat
        if im is not None and name in ('CHANFREINEUR PE ARANGUL','CLE A GRIFFE'):
            print('blurry -> render',p['name']); im=None
            u=pymupdf.Rect(p['photos'][0])
            for b2 in p['photos'][1:]:
                r2=pymupdf.Rect(b2)
                if r2.intersects(u): u|=r2
            bb=list(u)
            if p['tables'] and p['tables'][0][1]>bb[1]: bb[3]=min(bb[3],p['tables'][0][1]-1)
        if im is None:
            pix=page.get_pixmap(clip=pymupdf.Rect(bb)&page.rect,matrix=pymupdf.Matrix(4,4))
            im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
        bbox=Image.eval(im.convert('L'),lambda v:255-v).point(lambda v:255 if v>12 else 0).getbbox()
        if bbox: im=im.crop(bbox)
        img='cat-'+slug
        for size,suf in ((1100,'lg'),(560,'sm')):
            W=max(im.size); pad=int(W*0.08); S=W+2*pad
            sq=Image.new('RGB',(S,S),'white'); sq.paste(im,((S-im.width)//2,(S-im.height)//2))
            sq.resize((size,size),Image.LANCZOS).save(f'{IMG}/{img}-{suf}.webp','WEBP',quality=84)
    out.append(dict(slug=slug,src_slug=slug,name=name,cat=cat,img=img,page=p['page'],desc=[],tables=tables))
# fill missing images with neighbour on same page
for j,p in enumerate(out):
    if not p['img']:
        cands=[q for q in out if q['page']==p['page'] and q['img']] or [q for q in out if q['cat']==p['cat'] and q['img']]
        p['img']=cands[0]['img']; print('noimg',p['name'],'->',p['img'])
import sys; sys.path.insert(0,'/home/claude/work'); from fixes import FIX, IMGCLIP
for (i,k),t in FIX.items():
    p=out[i]
    if i==119 or len(p['tables'])==1: p['tables']=[t]
    elif k<len(p['tables']): p['tables'][k]=t
for i,(pn,bb) in IMGCLIP.items():
    p=out[i]; pix=doc[pn-1].get_pixmap(clip=pymupdf.Rect(bb),matrix=pymupdf.Matrix(5,5))
    im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples); p['img']='cat-'+p['slug']
    for size,suf in ((1100,'lg'),(560,'sm')):
        W=max(im.size); pad=int(W*0.08); S=W+2*pad
        sq=Image.new('RGB',(S,S),'white'); sq.paste(im,((S-im.width)//2,(S-im.height)//2))
        sq.resize((size,size),Image.LANCZOS).save(f'{IMG}/{p["img"]}-{suf}.webp','WEBP',quality=84)
json.dump(out,open(SITE+'/build/data/products.json','w'),ensure_ascii=False,indent=1)
json.dump({v[0]:{'name':v[1],'short':v[2]} for v in SEC.values()},open('/home/claude/work/cats.json','w'),ensure_ascii=False,indent=1)
print(len(out), sum(len(r['rows']) for p in out for r in p['tables']))
