"""Independent audit of the final delivery. World coordinates, millimetres."""
import argparse, hashlib, json, sys
from pathlib import Path

root=next((p for p in Path(__file__).resolve().parents if (p/'work/portrait-r3/libs').is_dir()),Path.cwd())
if (root/'work/portrait-r3/libs').is_dir():
    sys.path.insert(0,str(root/'work/portrait-r3/libs'))
import numpy as np
import manifold3d as mf
import trimesh as tm
from scipy.spatial import ConvexHull
from sweep import frame, test_joint
from elevations import read_tips


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def net(m):
    return mf.Manifold(mf.Mesh64(np.asarray(m.vertices,dtype='float64').copy(),
                                 np.asarray(m.faces,dtype='uint64').copy()))


def volume(a,b):
    return max(0.,(a^b).volume())


def bore(mesh):
    """Smallest radius from the Z axis to the projected mesh surface."""
    tri=mesh.triangles[:,:,:2]
    v=np.roll(tri,-1,axis=1)-tri
    c=tri[:,:,0]*v[:,:,1]-tri[:,:,1]*v[:,:,0]
    nonzero=abs(np.sum(c,axis=1))>1.e-14
    inside=(np.all(c>0,axis=1)|np.all(c<0,axis=1))&nonzero
    if inside.any():
        return 0.
    t=np.clip(-np.sum(v*tri,axis=2)/np.maximum(np.sum(v*v,axis=2),1.e-20),0,1)
    return float(np.linalg.norm(tri+t[:,:,None]*v,axis=2).min()*2)


def read_part(path):
    m=tm.load_mesh(path,process=False)
    # Binary STL exports exact float32 coordinate triples for coincident vertices.
    verts,inv=np.unique(m.vertices,axis=0,return_inverse=True)
    m=tm.Trimesh(vertices=verts,faces=inv[m.faces],process=False)
    _,counts=np.unique(m.edges_sorted,axis=0,return_counts=True)
    s=net(m)
    assert s.status()==mf.Error.NoError,(path,s.status())
    report=dict(name=path.stem,sha256=digest(path),triangles=len(m.faces),
                openEdges=int(np.count_nonzero(counts==1)),nonManifoldEdges=int(np.count_nonzero(counts>2)),
                degenerateTriangles=int(np.count_nonzero(m.area_faces==0)),consistent=bool(m.is_winding_consistent),
                components=len(s.decompose()),volumeMm3=s.volume(),sizeXYZmm=m.extents.tolist())
    assert report['components']==1 and m.is_volume and not any(report[k] for k in ['openEdges','nonManifoldEdges','degenerateTriangles']),report
    return (m,s,report)


def calipers(points):
    """Minimum width of the convex hull of a plane section."""
    pts=points[ConvexHull(points).vertices]
    edges=np.roll(pts,-1,axis=0)-pts
    normals=edges[:,::-1].copy()
    normals[:,0]*=-1
    normals/=np.linalg.norm(normals,axis=1)[:,None]
    return float((pts@normals.T).ptp(axis=0).min()) if np.__version__[0]=='1' else float(np.ptp(pts@normals.T,axis=0).min())


def prong_section(metal,stone,direction,center):
    basis=frame(direction)
    local=stone.vertices@basis
    hull=ConvexHull(local[:,:2])
    # Identify girdle level from the elevations of the outline vertices.
    level=float(np.dot(center,direction))
    dims=np.ptp(local,axis=0)
    lift=.23 if dims[:2].max()>2 else .09
    if dims[:2].max()<=2: lift=.14
    sec=metal.transform(np.column_stack((basis.T,np.zeros(3)))).slice(level+lift)
    sizes=[]
    contours=[]
    for pl in sec.to_polygons():
            if len(pl)<4 or np.max(np.ptp(pl,axis=0))>1.6: continue
            c=(pl.max(0)+pl.min(0))/2
            # Signed distances to projected outline edge half-planes.
            signed=(hull.equations[:,:2]@c+hull.equations[:,2]).max()
            if -.10<=signed<=(.55 if dims[:2].max()>2 else .24):
                w=calipers(pl)
                if w>.03:
                    sizes.append(w)
                    contours.append(pl)
    # Minimum contour distance among individual free ends in this station plane.
    def curve_distance(poly, other):
        e=np.roll(other,-1,axis=0)-other
        d=poly[:,None,:]-other[None,:,:]
        t=np.clip(np.sum(d*e[None,:,:],axis=2)/np.maximum(np.sum(e*e,axis=1),1e-30),0,1)
        return float(np.linalg.norm(d-t[:,:,None]*e[None,:,:],axis=2).min())
    gaps=[min(curve_distance(a,b),curve_distance(b,a)) for i,a in enumerate(contours) for b in contours[i+1:]]
    return dict(heightAboveOutlineMm=lift,minWidthMm=min(sizes,default=None),
                measuredIslands=len(sizes),widthsMm=sizes,minGapInSectionMm=min(gaps,default=None))


def support_spread(over,center,u):
    vertices=over.to_mesh64().vert_properties[:,:3]
    if not len(vertices): return 360.
    projected=(vertices-center)@frame(u)[:,:2]
    angles=np.sort(np.degrees(np.arctan2(projected[:,1],projected[:,0]))%360)
    return float(np.diff(np.r_[angles,angles[0]+360]).max())


def grains(metal,stone,row):
    """Map a physical grain to each of four quadrants; test free metal envelope."""
    u=np.array(row['direction'])
    origin=np.array(row['centerMm'])
    ex=np.array([u[1],-u[0],0]); ex/=np.linalg.norm(ex)
    ey=np.cross(u,ex)
    axes=np.column_stack([ex,ey,u])
    diameter=np.ptp(stone.vertices@ex)
    p2=origin@axes[:,:2]
    r=diameter/2+.135
    ss=metal.transform(np.column_stack((axes.T,np.zeros(3))))
    result={}
    for dx,dy in [(-1,-1),(-1,1),(1,-1),(1,1)]:
        d=np.array([dx*.55,dy*.835]); d/=np.linalg.norm(d)
        c=p2+r*d
        trace={}
        for lift in (.14,.22,.27,.30,.33):
            measurements=[]
            for loop in ss.slice(origin@u+lift).to_polygons():
                q=loop-c
                if not np.all(q.min(axis=0)<0) or not np.all(q.max(axis=0)>0):continue
                v=np.roll(q,-1,axis=0)
                winding=np.arctan2(q[:,0]*v[:,1]-q[:,1]*v[:,0],np.sum(q*v,axis=1)).sum()
                if winding>3.:
                    measurements.append(float(np.ptp(loop,axis=0).max()))
            trace[str(lift)]=min(measurements,default=None)
        result[f'{dx},{dy}']=trace
    return result


def pin_measurements(fixed,moving,pins):
    measured=[]
    for p in pins:
        c=np.asarray(p['centerMm'])
        z=np.array([0.,0.,1.])
        def ray(s,a,b):
            return [np.array(h.position) for h in s.ray_cast(a,b)]
        seat_z=ray(moving,c-z*.016,c+z*3)
        pin_end=ray(fixed,c+z*.03,c+z*2)[0]
        axis_dims=[]
        for d in np.eye(3)[:2]:
            axis=c+z*.32
            widths=[]
            for s in (moving,fixed):
                high=ray(s,axis,axis+d)[0];low=ray(s,axis,axis-d)[0]
                widths.append(float(np.dot(high-low,d)))
            axis_dims.append(widths)
        measured.append(dict(centerMm=c.tolist(),boreXYmm=[dim[0] for dim in axis_dims],
                              pinXYmm=[dim[1] for dim in axis_dims],projectionMm=float(pin_end[2]-c[2]),
                              depthMm=float(seat_z[0][2]-c[2]),metalOverSocketMm=float(seat_z[1][2]-seat_z[0][2])))
    return measured


def run(folder,analytic_joint=True):
    meta=json.loads((folder/'assembly.json').read_text('utf-8-sig'))
    print('Checking final delivery',flush=True)
    metal={k:read_part(folder/(k+'.stl')) for k in ('White','Champagne')}
    stones={row['id']:read_part(folder/'stones'/(row['id']+'.stl')) for row in meta['stones']}
    assert len(stones)==len(meta['stones']) and len(stones)>=2
    for m,s,rep in metal.values(): rep['boreDiameterMm']=bore(m)
    geometric_epsilon=1e-6
    # Min-gap is the Euclidean distance of triangulated surfaces up to this cap.
    def gap(a,b): return a.min_gap(b,1.)
    metals=mf.Manifold.compose([v[1] for v in metal.values()])
    rows=[]
    for row in meta['stones']:
        id=row['id']
        mesh,gem,info=stones[id]
        u=np.array(row['direction'],dtype=float)
        u/=np.linalg.norm(u)
        length=row['strokeMm']
        # For a convex body the hull of the two endpoint shapes is the exact
        # continuous sweep. For a non-convex body it conservatively encloses it.
        hull=mf.Manifold.batch_hull([gem,gem.translate(u*length)])
        hull_extra=gem.hull().volume()-gem.volume()
        metal_hits={n:volume(hull,val[1]) for n,val in metal.items()}
        others={i:volume(hull,g[1]) for i,g in stones.items() if i!=id}
        distances={n:gap(gem,v[1]) for n,v in metal.items()}
        alloy=min(distances,key=distances.get)
        supported=metal[alloy][1]
        over=gem.translate(-u*.025)^supported
        bearing=max(0.,over.volume())
        g25=gap(gem.translate(u*.25),metals)
        gem_pair_volume=max(others.values())
        result=dict(id=id,label=row['label'],strokeMm=length,direction=u.tolist(),
                    convexityExcessMm3=hull_extra,metalSweepMm3=metal_hits,
                    peakStoneSweepMm3=gem_pair_volume,otherStones=others,finalGapMm=distances[alloy],
                    supportAlloy=alloy,overtravelDepthMm=.025,overtravelVolumeMm3=bearing,
                    supportContactIslands=sum(x.volume()>1e-9 for x in over.decompose()),
                    gapAtQuarterMm=g25,maxUnsupportedAngleDeg=support_spread(over,np.array(row['centerMm']),u),
                    prongs=read_tips(supported,mesh,row))
        result['routeOK']=max(max(metal_hits.values()),gem_pair_volume)<geometric_epsilon
        if id.startswith('Pave') and folder.name=='Duet-Casting':
            result['grainSpanMmByLift']=grains(supported,mesh,row)
        result['seatOK']=distances[alloy]<.015 and bearing>1.e-8
        rows.append(result)
        print(id,'route',result['routeOK'],'metal',metal_hits,'gems',gem_pair_volume,'rest',distances[alloy],
              'support',bearing,'sections',result['prongs']['widthsMm'],flush=True)
    j=meta['joint']
    u=np.asarray(j['direction'],dtype=float)
    u/=np.linalg.norm(u)
    moving=j['moving']
    fixed=next(n for n in metal if n!=moving)
    m,ms,_=metal[moving];f,fs,_=metal[fixed]
    print('Metal joint',flush=True)
    joint=test_joint(m,f,u,j['strokeMm']) if analytic_joint else {}
    joint['forwardChecksMm3']={str(t):volume(ms.translate(u*t),fs) for t in (0,.0001,.025,.15,.5,1,2,4,j['strokeMm'])}
    joint['overtravelMm3']=volume(ms.translate(-u*.025),fs)
    joint['endGapMm']=gap(ms,fs)
    joint['pinsMeasured']=pin_measurements(fs,ms,j['pins'])
    joint['strokeMm']=j['strokeMm']
    joint['ok']=joint.get('enteringFacePairs',1)==0 and max(joint['forwardChecksMm3'].values())<geometric_epsilon
    print('joint result',joint,flush=True)
    # GLB wears materials but must show the same assembly and mm convention.
    preview=tm.load_scene(folder/'Assembly.glb',process=False)
    check={}
    for n,(m,_,_) in {**metal,**stones}.items():
        trans,key=preview.graph[n]
        rendered=preview.geometry[key].copy()
        rendered.apply_transform(trans); rendered.apply_scale(1000)
        check[n]=dict(boundsDeltaMm=float(abs(rendered.bounds-m.bounds).max()),
                      triangleDelta=int(len(rendered.faces)-len(m.faces)))
        assert check[n]['boundsDeltaMm']<.005,(n,check[n])
    result=dict(sourceMetaSha256=digest(folder/'assembly.json'),glbSha256=digest(folder/'Assembly.glb'),units='mm',volEpsilonMm3=geometric_epsilon,
                files={n:v[2] for n,v in {**metal,**stones}.items()},stones=rows,joint=joint,glb=check)
    if folder.name.endswith('-R2'):
        baseline=json.loads((Path(__file__).parent/'r1-measured.json').read_text('utf-8'))
        result['r1Reference']={'files':{k:digest(folder.parent/'Duet-Casting'/(k+'.stl')) for k in metal},
                               'tips':baseline}
    (folder/'qa.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf-8')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('folder',nargs='?',type=Path,default=root/'outputs/RR-Design/Duet-Casting')
    result=run(parser.parse_args().folder)
    sys.exit(0 if result['joint']['ok'] and all(r['routeOK'] and r['seatOK'] for r in result['stones']) else 2)
