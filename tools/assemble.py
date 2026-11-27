import pymupdf, json, re, os, subprocess, csv, io
doc = pymupdf.open('/mnt/user-data/uploads/catalogue.pdf')
OUT='/home/claude/work/out'
L=json.load(open(OUT+'/layout.json'))
SECT={}
def section(pn):
    page=doc[pn-1]; h=[]
    for b in page.get_text('dict')['blocks']:
        if b['type']!=0: continue
        for l in b['lines']:
            t=' '.join(s['text'] for s in l['spans']).strip()
            if t and l['bbox'][1]<45 and l['bbox'][0]>250: h.append(t)
    return ' '.join(h)
def ov(a0,a1,b0,b1): return max(0,min(a1,b1)-max(a0,b0))
prods=[]
for P in L:
    pn=P['page']; sec=section(pn)
    if not sec or pn in (7,24,33,60,69): continue
    P['lines']=[l for l in P['lines'] if not (l['t']=='TEFLON' and pn!=45)]
    lines=sorted(P['lines'],key=lambda l:(l['b'][1],l['b'][0]))
    # drop stray overlapping lines
    keep=[]
    for l in lines:
        bad=any(o is not l and ov(l['b'][0],l['b'][2],o['b'][0],o['b'][2])>5 and ov(l['b'][1],l['b'][3],o['b'][1],o['b'][3])>8 and len(o['t'])>len(l['t']) for o in lines)
        if not bad: keep.append(l)
    blocks=[]
    for l in keep:
        for bl in blocks:
            last=bl[-1]
            if abs(l['b'][0]-bl[0]['b'][0])<15 and 0<=l['b'][1]-last['b'][3]<12:
                bl.append(l); break
        else: blocks.append([l])
    titles=[dict(name=' '.join(x['t'] for x in bl), box=[min(x['b'][0] for x in bl),bl[0]['b'][1],max(x['b'][2] for x in bl),bl[-1]['b'][3]], tables=[], photos=[]) for bl in blocks]
    def is_table(i):
        b=i['bbox']; w=b[2]-b[0]; h=b[3]-b[1]
        if w/h<0.5: return False
        return any(-6<=b[1]-ti['box'][3]<=70 and abs(b[0]-ti['box'][0])<32 for ti in titles)
    tables=[i for i in P['imgs'] if is_table(i)]
    photos=[i for i in P['imgs'] if not is_table(i)]
    for t in tables:
        tb=t['bbox']
        c=[ti for ti in titles if -10<=tb[1]-ti['box'][3]<=80 and ov(tb[0],tb[2],ti['box'][0]-10,ti['box'][2]+10)>0]
        if not c: c=[ti for ti in titles if ti['box'][3]<=tb[1]+10]
        if not c: print('orphan table',pn,tb); continue
        ti=min(c,key=lambda ti:abs(tb[1]-ti['box'][3])+abs(tb[0]-ti['box'][0])*0.5)
        ti['tables'].append(t)
    for ph in photos:
        b=ph['bbox']; cx=(b[0]+b[2])/2; cy=(b[1]+b[3])/2
        if not titles: continue
        ti=min(titles,key=lambda ti:abs(cx-(ti['box'][0]+ti['box'][2])/2)+abs(cy-(ti['box'][1]+ti['box'][3])/2))
        ti['photos'].append(ph)
    if pn==43:
        for ti in titles:
            if ti['name']=='COLLIER DE PRISE EN': ti['name']='COLLIER DE PRISE EN CHARGE'; ti['tables']=[i for i in P['imgs'] if i['bbox'][1]>210 and i['bbox'][3]<600]
        titles=[t for t in titles if t['name']!='CHARGE']
    for ti in titles:
        if not ti['tables'] and not ti['photos']: print('no table',pn,ti['name']); continue
        if not ti['tables']: print('photo only',pn,ti['name'])
        ti['tables'].sort(key=lambda t:(t['bbox'][0]//50,t['bbox'][1]))
        prods.append(dict(page=pn,section=sec,name=ti['name'],tables=[t['bbox'] for t in ti['tables']],photos=[p['bbox'] for p in sorted(ti['photos'],key=lambda p:-(p['bbox'][2]-p['bbox'][0])*(p['bbox'][3]-p['bbox'][1]))]))
json.dump(prods,open(OUT+'/prods.json','w'),ensure_ascii=False,indent=1)
print(len(prods))
for p in prods: print(p['page'],len(p['tables']),len(p['photos']),p['name'])
