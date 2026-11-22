"""Exhaustive CGAL self-intersections on the stored binary STL (millimetres)."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

local_libs = Path(__file__).resolve().parent / 'check-libs'
if local_libs.is_dir():
    sys.path.insert(0, str(local_libs))
import numpy as np
from CGAL.CGAL_Kernel import Point_3
from CGAL.CGAL_Polyhedron_3 import Polyhedron_3
from CGAL import CGAL_Polygon_mesh_processing as pmp

def scan(tri):
    vertices, faces = np.unique(tri.reshape(-1, 3), axis=0, return_inverse=True)
    faces = faces.reshape(-1, 3)
    mesh = Polyhedron_3()
    pmp.polygon_soup_to_polygon_mesh([Point_3(*p) for p in vertices.astype('float64')], faces.tolist(), mesh)
    assert mesh.size_of_facets() == len(faces) and mesh.size_of_vertices() == len(vertices)
    ids = {tuple(sorted(f)): i for i, f in enumerate(faces.tolist())}
    indices = {tuple(v): i for i, v in enumerate(vertices)}
    for facet in mesh.facets():
        edge=facet.halfedge()
        seq=[]
        for _ in range(3):
            p=edge.vertex().point()
            seq.append(indices[p.x(),p.y(),p.z()])
            edge=edge.next()
        facet.set_id(ids[tuple(sorted(seq))])
    pairs=[]
    pmp.self_intersections(mesh,pairs)
    results=[]
    for pair in pairs:
        a,b=pair[0],pair[1]
        ia,ib=sorted((a.id(),b.id()))
        results.append(dict(faces=[ia,ib],centersMm=tri[[ia,ib]].mean(axis=1).tolist(),
                            trianglesMm=tri[[ia,ib]].tolist()))
    return dict(faces=len(tri),vertices=len(vertices),closed=mesh.is_closed(),intersectingPairs=len(results),
                pairs=sorted(results,key=lambda r:r['faces']))

def check_file(path):
    raw=path.read_bytes()
    n=struct.unpack_from('<I',raw,80)[0]
    assert len(raw)==84+n*50
    records=np.dtype([('normal','<f4',(3,)),('verts','<f4',(3,3)),('flags','<u2')])
    data=scan(np.frombuffer(raw,dtype=records,count=n,offset=84)['verts'].astype('float64'))
    return dict(sha256=hashlib.sha256(raw).hexdigest(),**data)

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('folder',type=Path)
    p.add_argument('output',type=Path)
    p.add_argument('--require-clean',action='store_true',help='fail if a file has open topology or intersecting triangle pairs')
    args=p.parse_args()
    # Positive and negative controls check that the wrapped predicate returns actual face IDs.
    t=[[0,0,0],[2,0,0],[0,2,0]]
    assert scan(np.array([t,[[.5,.5,-1],[.5,.5,1],[1.1,.5,1]]]))['intersectingPairs']==1
    assert scan(np.array([t,[[2,0,0],[2,2,0],[0,2,0]]]))['intersectingPairs']==0
    result=dict(method='CGAL Polygon Mesh Processing self_intersections; exact equality of stored vertex coordinates; zero-based STL facet indices.',
                reference='https://doc.cgal.org/latest/Polygon_mesh_processing/',
                files={name:check_file(args.folder/(name+'.stl')) for name in ('White','Champagne')})
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2),encoding='utf-8')
    print({name:(v['faces'],v['closed'],v['intersectingPairs']) for name,v in result['files'].items()})
    if args.require_clean and any(not x['closed'] or x['intersectingPairs'] for x in result['files'].values()):
        sys.exit(2)
