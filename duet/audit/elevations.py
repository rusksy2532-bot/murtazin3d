"""Read actual girdle and free end heights in the stone's coordinate frame."""
import numpy as np
from scipy.spatial import ConvexHull, distance
from scipy.optimize import linear_sum_assignment
from sweep import frame


def widths(loop):
    points=loop[ConvexHull(loop).vertices]
    segments=np.roll(points,-1,axis=0)-points
    normals=segments[:,::-1].copy()
    normals[:,0]*=-1
    normals/=np.linalg.norm(normals,axis=1)[:,None]
    return float(np.ptp(points@normals.T,axis=0).min()),float(distance.pdist(points).max())


def curve_distance(poly,other):
    e=np.roll(other,-1,axis=0)-other
    d=poly[:,None,:]-other[None,:,:]
    t=np.clip(np.sum(d*e[None,:,:],axis=2)/np.maximum(np.sum(e*e,axis=1),1e-30),0,1)
    return float(np.linalg.norm(d-t[:,:,None]*e[None,:,:],axis=2).min())


def read_tips(body,stone,row):
    pear=row['id'].startswith('Pear')
    basis=frame(row['direction'])
    verts=stone.vertices@basis
    hull=ConvexHull(verts[:,:2])
    outline=verts[hull.vertices,:2]
    # Both girdle levels project to the same convex outline up to STL rounding.
    z=[verts[np.linalg.norm(verts[:,:2]-pt,axis=1)<2e-5,2].max() for pt in outline]
    if np.ptp(z)>.003: raise ValueError(('upper girdle is not planar',row['id'],z))
    ztop=float(np.median(z))
    lift=.20 if pear else .14
    cut=ztop+lift
    m=body.transform(np.column_stack((basis.T,np.zeros(3))))
    contours=[]
    centers=[]
    for poly in m.slice(cut).to_polygons():
        if len(poly)<4 or max(np.ptp(poly,axis=0))>1.55: continue
        center=(poly.max(0)+poly.min(0))*.5
        rim=max(hull.equations[:,:2]@center+hull.equations[:,2])
        if rim<-.12 or rim>(.65 if pear else .39): continue
        if widths(poly)[0]<.06: continue
        centers.append(center)
        contours.append(poly)
    count=row['prongs']
    witness=row.get('prongCentersMm')
    if witness is not None and len(centers)>=count:
        expected=np.array(witness)@basis[:,:2]
        d=distance.cdist(expected,centers)
        i,j=linear_sum_assignment(d)
        if d[i,j].max()>.16:
            raise ValueError((row['id'],'free-end witness mismatch',d[i,j].tolist()))
        centers=[centers[k] for k in j]
        contours=[contours[k] for k in j]
    elif len(centers)!=count and not pear:
        # R1 does not carry center witnesses. Its nominal grains sit immediately
        # outside the stone; nearby ends from a neighbouring mount are farther.
        order=np.argsort([max(hull.equations[:,:2]@c+hull.equations[:,2]) for c in centers])[:count]
        centers=[centers[k] for k in order]
        contours=[contours[k] for k in order]
    if len(centers)!=count: raise ValueError((row['id'],'expected separate standing ends',count,centers))
    caps=[]
    top,_=m.split_by_plane((0.,0.,1.),cut)
    for cap in top.decompose():
        b=np.array(cap.bounding_box())
        if b[2]>cut+.002 or b[5]<=cut+.03 or max(b[3:5]-b[0:2])>1.55: continue
        v=cap.to_mesh64().vert_properties[:,:3]
        foot=v[abs(v[:,2]-cut)<5.e-5]
        if len(foot)<3:continue
        caps.append(((foot[:,:2].min(0)+foot[:,:2].max(0))/2,b[5],cap))
    if len(caps)<count: raise ValueError((row['id'],'joined or missing tips above section',len(caps),count))
    distances=distance.cdist(centers,[c[0] for c in caps])
    ii,jj=linear_sum_assignment(distances)
    if distances[ii,jj].max()>.04: raise ValueError((row['id'],'could not trace free caps',distances[ii,jj]))
    heights=[float(caps[j][1]-ztop) for j in jj]
    gaps=[min(curve_distance(l,r),curve_distance(r,l)) for i,l in enumerate(contours) for r in contours[i+1:]]
    tip_gaps=[caps[j][2].min_gap(caps[k][2],4.) for i,j in enumerate(jj) for k in jj[i+1:]]
    rim_min,rim_max=widths(outline)
    return dict(girdleMaxDiameterMm=rim_max,girdleMinCaliperMm=rim_min,
                upperGirdleOffsetMm=ztop-float(np.dot(row['centerMm'],row['direction'])),
                heightAboveOutlineMm=lift,tipHeightsAboveUpperGirdleMm=heights,
                minHeightMm=min(heights),maxHeightMm=max(heights),
                minWidthMm=min(widths(p)[0] for p in contours),measuredIslands=len(centers),
                widthsMm=[widths(p)[0] for p in contours],minGapInSectionMm=min(gaps),
                minGapBetweenFreeCapsMm=min(tip_gaps))
