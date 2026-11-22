"""Face-centroid / inward-normal wall survey on delivered binary STL, in mm."""
from pathlib import Path
import csv, gzip, json, sys
import numpy as np
from check import read_part, root, mf
from scipy.spatial import cKDTree

EPS=1.e-7
LIMIT=.45
TARGETS={'White':{'basket':[[.40,10.24,-2.25],[.94,10.31,-2.65]],'gallery shoulder':[[-3.15,10.73,.62]]},
         'Champagne':{'left toe':[[-9.3,-.48,.32]],'right toe':[[9.3,-.48,.32]]}}


def fid_mapping(s,m):
    internal=s.to_mesh64()
    triangles=internal.vert_properties[internal.tri_verts,:3]
    ids=internal.face_id
    ds=np.linalg.norm(triangles.mean(1)-m.triangles_center[ids],axis=1)
    assert ds.max()<1.e-7,(ds.max(),len(triangles),len(m.faces))
    return ids


def wall_data(mesh,solid):
    triangles=mesh.triangles
    center=mesh.triangles_center
    normal=mesh.face_normals
    direction=-normal
    targets=np.full(len(center),-1,int)
    end=np.full_like(center,np.nan)
    length=np.full(len(center),np.nan)
    cosine=np.full(len(center),np.nan)
    fid=fid_mapping(solid,mesh)
    for i,(origin,u) in enumerate(zip(center,direction)):
        hits=solid.ray_cast(origin+u*EPS,origin+u*50)
        for hit in hits:
            p=np.array(hit.position)
            dist=np.dot(p-origin,u)
            face=fid[hit.face_id]
            if dist<=EPS or face==i: continue
            # Verify primitive numbering against the actual exit face's plane.
            error=abs(np.dot(p-triangles[face,0],normal[face]))
            if error>1.e-5: raise RuntimeError((i,face,error))
            targets[i]=face
            end[i]=p
            length[i]=dist
            cosine[i]=normal[face]@u
            break
    return direction,end,targets,length,cosine


def crease_info(mesh,threshold_deg=30):
    pair=mesh.face_adjacency_edges
    keep=mesh.face_adjacency_angles>np.deg2rad(threshold_deg)
    line=mesh.vertices[pair[keep]]
    tree=cKDTree(line.mean(1))
    # Split long creases for exact short-radius searches without a giant ball.
    chunks=[]
    for a,b in line:
        nodes=np.linspace(a,b,1+max(1,int(np.ceil(np.linalg.norm(b-a)/.15))))
        chunks.extend(np.stack([nodes[:-1],nodes[1:]],axis=1))
    line=np.asarray(chunks)
    tree=cKDTree(line.mean(1))
    max_half=np.linalg.norm(line[:,1]-line[:,0],axis=1).max()/2
    def near(x,radius=.075):
        ix=tree.query_ball_point(x,radius+max_half)
        if not len(ix):return False
        ab=line[ix,1]-line[ix,0]; ac=x-line[ix,0]
        t=np.clip(np.sum(ac*ab,axis=1)/np.sum(ab*ab,axis=1),0,1)
        return bool(np.any(np.linalg.norm(ac-ab*t[:,None],axis=1)<radius))
    return near


def sector_points(name,center):
    x,y,z=center.T
    if name=='White':
        return {'basket box':(x>=-.1)&(x<=.94)&(y>=10.17)&(y<=10.31)&(z>=-2.87)&(z<=-1.66),
            'basket detail':np.linalg.norm(center-[.94,10.31,-2.65],axis=1)<=.22,
            'gallery shoulder':np.linalg.norm(center-[-3.15,10.73,.62],axis=1)<=.27,
            'bottom y < -8':y<-8}
    return {('right toe' if sign==1 else 'left toe'):(sign*x>=9.1)&(sign*x<=9.5)&(y>=-.65)&(y<=-.30)&(abs(z-.32)<.13) for sign in (-1,1)}


def run(folder,reportdir):
    reportdir.mkdir(parents=True,exist_ok=True)
    full={}
    for name in ('White','Champagne'):
        mesh,_,rep=read_part(folder/(name+'.stl'))
        s=mf.Manifold(mf.Mesh64(np.array(mesh.vertices),np.array(mesh.faces,dtype='uint64'),face_id=np.arange(len(mesh.faces),dtype='uint64')))
        center=mesh.triangles_center
        direction,ends,targets,length,cosine=wall_data(mesh,s)
        crease=crease_info(mesh)
        opposed=cosine>=.5
        thin=length<LIMIT
        near=np.zeros(len(length),dtype=bool)
        for i in np.flatnonzero(thin):
            near[i]=crease(center[i]) or crease(ends[i])
        def witness(i):
            return dict(face=int(i),exitFace=int(targets[i]),lengthMm=float(length[i]),
                        pointMm=center[i].tolist(),direction=direction[i].tolist(),endMm=ends[i].tolist(),
                        opposedCos=float(cosine[i]),nearCrease=bool(near[i]) if thin[i] else None)
        group={}
        for label,mask in sector_points(name,center).items():
            found=np.flatnonzero(mask & np.isfinite(length))
            group[label]=dict(facesInZone=int(mask.sum()),hits=len(found),rawBelow045=int((thin&mask).sum()),
                              min=witness(found[length[found].argmin()]) if len(found) else None)
        points={}
        for label,pts in TARGETS[name].items():
            for idx,pt in enumerate(pts):
                i=int(np.linalg.norm(center-pt,axis=1).argmin())
                points[f'{label} {idx+1}']=witness(i)|{'givenPointMm':pt,'centerDistanceMm':float(np.linalg.norm(center[i]-pt))}
        categories={'opposedAwayFromCrease':thin&opposed&~near,'opposedNearCrease':thin&opposed&near,
                    'obliqueAwayFromCrease':thin&~opposed&~near,'obliqueNearCrease':thin&~opposed&near}
        raw=np.flatnonzero(thin)
        result=dict(sha256=rep['sha256'],rays=len(length),noExit=int(np.isnan(length).sum()),rawBelow045=int(thin.sum()),
                    min=witness(raw[length[raw].argmin()]) if len(raw) else None,
                    rawClasses={k:int(v.sum()) for k,v in categories.items()},zones=group,witnesses=points)
        print(name,rep['triangles'],result['rawBelow045'],result['rawClasses'],flush=True)
        print('zones',[(k,v['facesInZone'],(v['min'] or {}).get('lengthMm')) for k,v in group.items()],flush=True)
        out=reportdir/f'{name}-wall-rays.csv.gz'
        with gzip.open(out,'wt',encoding='utf-8',newline='') as h:
            w=csv.writer(h)
            w.writerow(['face0','exitFace0','x','y','z','dx','dy','dz','tx','ty','tz','lengthMm','exitCos','rawBelow045','nearCreaseIfThin'])
            for i,pt in enumerate(center):
                w.writerow([i,targets[i],*[f'{v:.9g}' for v in np.r_[pt,direction[i],ends[i],length[i],cosine[i]]],int(thin[i]),int(near[i]) if thin[i] else ''])
        full[name]=result
    (reportdir/'wall-summary.json').write_text(json.dumps(full,ensure_ascii=False,indent=2),'utf-8')
    return full


if __name__=='__main__':
    run(Path(sys.argv[1]),Path(sys.argv[2]))
