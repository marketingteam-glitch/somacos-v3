import pymupdf, json, subprocess, csv, io, os, sys, re
import numpy as np
from PIL import Image, ImageOps
doc = pymupdf.open('/mnt/user-data/uploads/catalogue.pdf')
OUT='/home/claude/work/out'; os.makedirs(OUT+'/tables',exist_ok=True)
def tess(img, psm=6):
    f='/tmp/t.png'; img.save(f)
    tsv=subprocess.run(['tesseract',f,'-','--psm',str(psm),'-l','eng','tsv'],capture_output=True,text=True).stdout
    ws=[w for w in csv.DictReader(io.StringIO(tsv),delimiter='\t',quoting=csv.QUOTE_NONE) if w['text'] and w['text'].strip()]
    lines={}
    for w in ws: lines.setdefault((w['block_num'],w['par_num'],w['line_num']),[]).append(w)
    out=[]
    for l in lines.values():
        out.append((min(int(w['top']) for w in l),[(int(w['left']),int(w['left'])+int(w['width']),w['text']) for w in sorted(l,key=lambda w:int(w['left']))]))
    return sorted(out)
def ocr_table(pn,bbox,zoom=5):
    page=doc[pn-1]
    pix=page.get_pixmap(clip=pymupdf.Rect(bbox),matrix=pymupdf.Matrix(zoom,zoom))
    a=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width,pix.n)[:,:,:3].astype(int)
    mx=a.max(2); mn=a.min(2); lum=a.mean(2)
    dark_bg=((lum<170)|((mx-mn)>90)).mean(1)   # header band rows: mostly dark/strong colour
    band=np.where(dark_bg>0.45)[0]
    H=None; head=[]
    if len(band) and band[0]<pix.height*0.5:
        # contiguous band from first
        e=band[0]
        while e+1<pix.height and dark_bg[e+1]>0.45: e+=1
        hb=Image.fromarray(lum[band[0]:e+1].astype(np.uint8)); hb=ImageOps.invert(hb)
        hb=ImageOps.expand(hb,20,fill=255)
        hl=tess(hb,7)
        head=[(x0-20,x1-20,t) for _,ws in hl for (x0,x1,t) in ws]
        H=e
    body=lum.astype(np.uint8)
    if H is not None: body=body[H+1:]
    bl=tess(ImageOps.expand(Image.fromarray(body),20,fill=255),6)
    rows=[[(x0-20,x1-20,t) for (x0,x1,t) in ws] for _,ws in bl]
    return head,rows,pix.width
if __name__=='__main__':
    prods=json.load(open(OUT+'/prods.json'))
    for i in map(int,sys.argv[1:]):
        p=prods[i]
        for t in p['tables']:
            h,rows,W=ocr_table(p['page'],t); print(p['name'],'|| HEAD:',[x[2] for x in h])
            for r in rows[:4]: print('   ',' | '.join(x[2] for x in r))
