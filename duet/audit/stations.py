"""Thickness stations around the casting lands of Duet, world XYZ in mm."""
import numpy as np
import json,sys
from pathlib import Path
from check import read_part

AX=np.eye(3)


def chord(s,p,d):
    """Intersections bounding p. A witness in a designed opening has no chord."""
    p=np.asarray(p,dtype=float);d=np.asarray(d,dtype=float)
    start=p-d*30
    hits=s.ray_cast(start,p+d*30)
    intervals=[]
    for h1,h2 in zip(hits[::2],hits[1::2]):
        p1,p2=np.array(h1.position),np.array(h2.position)
        t1=(p1-p)@d;t2=(p2-p)@d
        if t1<=1e-5 and t2>=-1e-5:
            intervals.append((float(t2-t1),p1.tolist(),p2.tolist()))
    if not intervals: return None
    dist,a,b=max(intervals)
    return dict(lengthMm=dist,enterMm=a,exitMm=b)


def rim_samples(s,origin,axes):
    records=[]
    for y in axes:
        start=np.array([origin[0],y,origin[2]])
        for deg in range(0,360,2):
            phi=np.deg2rad(deg)
            d=np.array([np.cos(phi),0.,np.sin(phi)])
            refs=s.ray_cast(start,start+d*14)
            if not refs:continue
            first=refs[0]
            p=np.array(first.position)
            inward=-np.array(first.normal)
            n=inward.copy(); n[1]=0.
            if np.linalg.norm(n)<1e-4: continue
            n/=np.linalg.norm(n)
            if n@d<.05: continue
            hits=s.ray_cast(p+n*.00002,p+n*14)
            candidates=[h for h in hits if (np.array(h.position)-p)@n>.000021]
            if not candidates:continue
            finish=np.array(candidates[0].position)
            thick=float((finish-p)@n)
            records.append(dict(y=y,azimuth=deg,innerMm=p.tolist(),outwardInPlane=n.tolist(),outerMm=finish.tolist(),widthMm=thick))
    return records


def measure(folder,reportdir):
    reportdir.mkdir(parents=True,exist_ok=True)
    meta=json.loads((folder/'assembly.json').read_text('utf-8'))
    bodies={k:read_part(folder/(k+'.stl')) for k in ['White','Champagne']}
    out={}
    s=bodies['Champagne'][1]
    toes=[]
    for sign in [-1,1]:
        # Exact vertical chords on the flat toe, including both endpoints
        # and the locations highlighted in the original review.
        for xx in np.round(np.arange(9.10,9.501,.025),4):
            for yy in np.round(np.arange(-.65,-.299,.025),4):
                p=[sign*xx,yy,.321]
                toes.append({'pointMm':p,'chord':chord(s,p,AX[2])})
    out['toeZGrid']=toes
    s=bodies['White'][1]
    stations=[([.94,10.31,-2.65],AX[0]),([.8372,10.2163,-2.6711],AX[2]),([.8893,10.1587,-2.5859],AX[0]),
              ([-3.1548,10.73,.6222],AX[1]),([-.1,10.20,-2.87],AX[1]),([.9,10.30,-1.66],AX[1])]
    out['namedWhiteChords']=[dict(pointMm=p,axis=d.tolist(),chord=chord(s,p,d)) for p,d in stations]
    seat=next(row for row in meta['stones'] if row['id']=='PearWhite')
    center=seat['centerMm']
    # Two member elevations in the replacement gallery. Three parallel planes each.
    out['rimPlanes']={'lower':rim_samples(s,center,[10.00,10.20,10.31]),
                      'upper':rim_samples(s,center,[10.80,10.95,11.08])}
    by_y={}
    for name,records in out['rimPlanes'].items():
        by_y[name]={}
        for y in sorted(set(a['y'] for a in records)):
            chosen=[a for a in records if a['y']==y]
            by_y[name][str(y)]=dict(count=len(chosen),min=min(chosen,key=lambda a:a['widthMm']),maxMm=max(q['widthMm'] for q in chosen))
    t=[v['chord']['lengthMm'] for v in toes if v['chord']]
    out['summary']=dict(toeMinMm=min(t) if t else None,toeMaxMm=max(t) if t else None,toeHits=len(t),toeProbes=len(toes),annular=by_y)
    # Shank dimension at the bottom y< -8, on its central transverse plane.
    shank={}
    for x in (-.5,0,.5):
        p=[x,-9.15,0.]
        shank[str(x)]={'radial':chord(s,p,AX[1]),'axial':chord(s,p,AX[2])}
    out['bottomShank']=shank
    # Section normal to each brace's centerline in the free span. Independent
    # 12-direction diametral probe. Also survey the two shoulders around the
    # concrete original defect with a regular XZ grid at fixed Y.
    braces={'left':[[-6.13005,6.80811,-2.58510],[-5.22827,8.58783,-1.13430],[-4.15191,10.21,-1.11363]],
            'right':[[5.50999,8.16890,-1.68366],[3.35807,9.37922,-2.17558],[1.03965,10.21,-2.70557]]}
    out['braceSpans']={}
    for label,pts in braces.items():
        a,p,b=np.array(pts)
        tangent=b-a;tangent/=np.linalg.norm(tangent)
        nu=np.cross(AX[np.argmin(abs(tangent))],tangent);nu/=np.linalg.norm(nu)
        nv=np.cross(tangent,nu)
        rows=[]
        for angle in range(0,180,5):
            ph=np.deg2rad(angle)
            d=nu*np.cos(ph)+nv*np.sin(ph)
            rows.append(dict(angle=angle,axis=d.tolist(),pointMm=p.tolist(),chord=chord(s,p,d)))
        out['braceSpans'][label]=rows
    shoulder=[]
    for x in np.linspace(-3.2148,-3.0948,9):
        for z in np.linspace(.5622,.6822,9):
            p=[x,10.73,z]
            shoulder.append(dict(pointMm=p,chord=chord(s,p,AX[1])))
    out['shoulderYGrid']=shoulder
    lhs=bodies['White'][1].split_by_plane(AX[1],6.)[0]
    rhs=bodies['Champagne'][1].split_by_plane(AX[1],6.)[0]
    out['alloyGapForYAtLeast6mm']=lhs.min_gap(rhs,3.)
    (reportdir/'stations.json').write_text(json.dumps(out,indent=1),'utf-8')
    print('Toe',out['summary']['toeMinMm'],out['summary']['toeHits'],out['summary']['toeProbes'])
    for n,rec in by_y.items():print(n,[(y,round(v['min']['widthMm'],4),v['min']['azimuth']) for y,v in rec.items()])
    for w in out['namedWhiteChords']: print('at',w['pointMm'],w['chord']['lengthMm'] if w['chord'] else None)
    return out


if __name__=='__main__':
    measure(Path(sys.argv[1]),Path(sys.argv[2]))
