import json, re, sys, difflib
import numpy as np
sys.path.insert(0,'/home/claude/work')
from ocr3 import ocr_table
OUT='/home/claude/work/out'
prods=json.load(open(OUT+'/prods.json'))
VOC={'CODE':'CODE','QTE/BOX':'QTE/BOX','QTEBOX':'QTE/BOX','QTEIBOX':'QTE/BOX','BOX':'QTE/BOX','PN':'PN','PRIX':'PRIX','TYPE':'TYPE','DEBIT':'DÉBIT','MATIERE':'MATIÈRE','VOLTAGE':'VOLTAGE','ARTICLE':'ARTICLE','ARTICLES':'ARTICLES','DESIGNATION':'DÉSIGNATION','LONGUEUR':'LONGUEUR','EPAISSEUR':'ÉPAISSEUR','ESPACEMENT':'ESPACEMENT','DIAMETRE':'Ø','PRESSION':'PRESSION','DIMENSION':'DIMENSION','MODELE':'MODÈLE','REF':'RÉF','ROULEAU':'ROULEAU','METRAGE':'MÉTRAGE','LARGEUR':'LARGEUR','TAILLE':'TAILLE','COULEUR':'COULEUR','PUISSANCE':'PUISSANCE'}
def norm_head(t):
    u=re.sub(r'[^A-Z/]','',t.upper().replace('É','E').replace('È','E'))
    if len(u)<2: return None
    if u in VOC: return VOC[u]
    m=difflib.get_close_matches(u,list(VOC),n=1,cutoff=0.7)
    return VOC[m[0]] if m else None
JUNK=re.compile(r'^[\W_]+$')
def fix_code(s):
    s=s.strip(' )(|.,;:"\'')
    s=re.sub(r'(?<=[0-9])O|O(?=[0-9]{2})','0',s)
    s=re.sub(r'(?<=[0-9])[Il]|[Il](?=[0-9]{3})','1',s) if re.match(r'^[A-Z]{2,}',s) else s
    return s
def process(p):
    tables=[]
    for bb in p['tables']:
        head,rows,W=ocr_table(p['page'],bb)
        rows=[[w for w in r if not JUNK.match(w[2])] for r in rows]
        rows=[r for r in rows if r]
        occ=np.zeros(W+50,bool)
        for r in rows:
            for x0,x1,t in r: occ[max(0,x0-12):x1+12]=True
        cols=[];i=0
        while i<len(occ):
            if occ[i]:
                j=i
                while j<len(occ) and occ[j]: j+=1
                cols.append([i,j]); i=j
            else: i+=1
        if not cols: continue
        cen=lambda a,b:(a+b)/2
        anchors=[]; used=set(); other=[]
        for x0,x1,t in head:
            h=norm_head(t)
            if h and h not in used: anchors.append([cen(x0,x1),h]); used.add(h)
            elif not h and not re.fullmatch(r'[|—\-_]+',t): other.append(cen(x0,x1))
        if 'CODE' in used and 'Ø' not in used and len(anchors)>=2:
            anchors.sort(); ci=[a[1] for a in anchors].index('CODE')
            if ci+1<len(anchors):
                lo,hi=anchors[ci][0],anchors[ci+1][0]
                mid=[o for o in other if lo+30<o<hi-30]
                if mid: anchors.append([sum(mid)/len(mid),'Ø'])
        anchors.sort()
        nm=[a[1] for a in anchors]
        if 'CODE' in nm and 'Ø' not in nm and nm.index('CODE')+1<len(nm):
            ci=nm.index('CODE'); lo,hi=anchors[ci][0],anchors[ci+1][0]
            cs=[cen(x0,x1) for r in rows for (x0,x1,t) in r[1:]]
            mid=[c for c in cs if lo+(hi-lo)*0.3<c<hi-(hi-lo)*0.3]
            if len(mid)>=max(1,len(rows)//2): anchors.append([sorted(mid)[len(mid)//2],'Ø']); anchors.sort()
        if len(anchors)>=2:
            names=[a[1] for a in anchors]
            pos=[a[0] for a in anchors]
            # widen: CODE anchor shifted to its left edge since codes left-aligned -> use word centre distance anyway
            def colof(x0,x1):
                c=cen(x0,x1); return min(range(len(pos)),key=lambda k:abs(pos[k]-c))
            cols=[None]*len(names)
        else:
            names=['']*len(cols)
            if not names[0]: names[0]='CODE'
            for k in range(1,len(names)):
                if not names[k] and 'Ø' not in names: names[k]='Ø'
            def colof(x0,x1):
                c=cen(x0,x1)
                return min(range(len(cols)),key=lambda k:0 if cols[k][0]<=c<=cols[k][1] else min(abs(cols[k][0]-c),abs(cols[k][1]-c)))
        trows=[]
        for r in rows:
            cells=['']*len(names)
            for x0,x1,t in r:
                c=colof(x0,x1)
                cells[c]=(cells[c]+' '+t).strip()
            if names[0]=='CODE': cells[0]=fix_code(cells[0])
            if sum(1 for c in cells if c)<2: continue
            trows.append(cells)
        # merge consecutive duplicate column names
        tables.append(dict(head=names,rows=trows))
    return tables
res=[]
for i,p in enumerate(prods):
    try: t=process(p)
    except Exception as e: print('ERR',i,p['name'],e); t=[]
    res.append(dict(p,ocr=t))
    print(i,p['name'],[ (x['head'],len(x['rows'])) for x in t],flush=True)
json.dump(res,open(OUT+'/ocr.json','w'),ensure_ascii=False,indent=1)
