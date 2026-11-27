import pymupdf, json, re, os, sys
doc = pymupdf.open('/mnt/user-data/uploads/catalogue.pdf')
OUT='/home/claude/work/out'; os.makedirs(OUT+'/tables',exist_ok=True); os.makedirs(OUT+'/photos',exist_ok=True)
pages = range(7, 79)  # 1-based
result=[]
for pn in pages:
    page=doc[pn-1]
    smask={x[0]:x[1] for x in page.get_images(full=True)}
    imgs=[]
    for info in page.get_image_info(xrefs=True):
        x0,y0,x1,y1=info['bbox']; w=x1-x0; h=y1-y0
        if y1<85 and x0<160: continue           # logo
        if y0>800: continue                      # footer
        if x0>525 or w<25 or h<10: continue     # side icons
        if w>500 and h>500: continue            # background
        imgs.append(dict(xref=info['xref'],bbox=[x0,y0,x1,y1],mask=smask.get(info['xref'],0)>0))
    lines=[]
    for b in page.get_text('dict')['blocks']:
        if b['type']!=0: continue
        for l in b['lines']:
            t=' '.join(s['text'] for s in l['spans']).strip(); sz=l['spans'][0]['size']
            x0,y0,x1,y1=l['bbox']
            if not t or y0<45 or y0>815 or sz<10.5: continue
            if re.fullmatch(r'[A-C0-9]{1,2}',t): continue
            lines.append(dict(t=t,b=[x0,y0,x1,y1],sz=sz))
    result.append(dict(page=pn,imgs=imgs,lines=lines))
json.dump(result,open(OUT+'/layout.json','w'),indent=0,ensure_ascii=False)
