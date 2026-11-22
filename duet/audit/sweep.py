"""Continuous straight-line withdrawal between two oriented triangle boundaries.

An entering contact projects to a forward-facing moving face and a backward-
facing stationary face. Over their projected convex overlap, the difference
in axial coordinates is affine; its extrema occur at polygon vertices.
The start position is separately checked with a 3D volume intersection.
"""
from collections import defaultdict
import numpy as np


def cross2(a, b):
    return a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]


def frame(axis):
    w = np.array(axis, dtype=float)
    w /= np.linalg.norm(w)
    u = np.cross(np.eye(3)[np.argmin(abs(w))], w)
    u /= np.linalg.norm(u)
    return np.column_stack([u, np.cross(w,u), w])


def candidate_pairs(first, second, distance, cell=.45):
    alo, ahi = first.min(1), first.max(1)
    blo, bhi = second.min(1), second.max(1)
    bins = defaultdict(list)
    for j, (lo, hi) in enumerate(zip(np.floor(blo[:,:2]/cell).astype(int),
                                     np.floor(bhi[:,:2]/cell).astype(int))):
        for x in range(lo[0],hi[0]+1):
            for y in range(lo[1],hi[1]+1):
                bins[x,y].append(j)
    fa,fb = [],[]
    for i,(lo,hi) in enumerate(zip(np.floor(alo[:,:2]/cell).astype(int),
                                    np.floor(ahi[:,:2]/cell).astype(int))):
        nearby=set()
        for x in range(lo[0],hi[0]+1):
            for y in range(lo[1],hi[1]+1):
                nearby.update(bins.get((x,y), ()))
        if not nearby:
            continue
        j=np.fromiter(nearby,dtype=int)
        keep=np.all(bhi[j,:2]>alo[i,:2],axis=1)&np.all(ahi[i,:2]>blo[j,:2],axis=1)
        keep &= (bhi[j,2]>=alo[i,2]) & (blo[j,2]<=ahi[i,2]+distance)
        j=j[keep]
        fa.extend([i]*len(j))
        fb.extend(j)
        if len(fa)>=8000:
            yield first[fa], second[fb]
            fa,fb=[],[]
    if fa:
        yield first[fa], second[fb]


def intervals(a,b):
    """Positive-area overlap via inward shrink 1e-8, suppressing edge grazes."""
    def vertices(tri):
        q=tri[:,:,:2]
        return q + (q.mean(axis=1,keepdims=True)-q)*1e-8
    a2,b2=vertices(a),vertices(b)
    edges_a=np.roll(a2,-1,axis=1)-a2
    edges_b=np.roll(b2,-1,axis=1)-b2
    def contained(points,tri,edges):
        vals=cross2(edges[:,None,:,:],points[:,:,None,:]-tri[:,None,:,:])
        return np.all(vals>=-1.e-15,axis=2) | np.all(vals<=1.e-15,axis=2)
    delta=b2[:,None,:,:]-a2[:,:,None,:]
    ea=edges_a[:,:,None,:]
    eb=edges_b[:,None,:,:]
    den=cross2(ea,eb)
    with np.errstate(divide='ignore',invalid='ignore'):
        s=cross2(delta,eb)/den
        t=cross2(delta,ea)/den
    valid=(abs(den)>1e-18)&(s>=0)&(s<=1)&(t>=0)&(t<=1)
    xy=a2[:,:,None,:]+np.where(valid,s,0)[...,None]*ea
    points=np.concatenate([a2,b2,xy.reshape((-1,9,2))],axis=1)
    mask=np.concatenate([contained(a2,b2,edges_b),contained(b2,a2,edges_a),valid.reshape((-1,9))],axis=1)
    def plane(tri):
        normal=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
        slope=-normal[:,:2]/normal[:,2,None]
        return tri[:,0,2,None]+np.einsum('npi,ni->np',points-tri[:,None,0,:2],slope)
    heights=plane(b)-plane(a)
    return np.where(mask,heights,np.inf).min(1),np.where(mask,heights,-np.inf).max(1)


def test_joint(moving, fixed, direction, travel, eps=1e-5):
    basis=frame(direction)
    a=moving.triangles[moving.face_normals@basis[:,2]>1e-9]@basis
    b=fixed.triangles[fixed.face_normals@basis[:,2]<-1e-9]@basis
    hits=0
    first,last=None,None
    for am,bm in candidate_pairs(a,b,travel):
        lo,hi=intervals(am,bm)
        keep=(hi>eps)&(lo<travel-eps)&(lo<=hi)
        if keep.any():
            hits+=int(keep.sum())
            low,high=max(0,float(lo[keep].min())),min(travel,float(hi[keep].max()))
            first=low if first is None else min(first,low)
            last=high if last is None else max(last,high)
    return dict(enteringFacePairs=hits,firstContactOffsetMm=first,lastContactOffsetMm=last,
                axialToleranceMm=eps)
