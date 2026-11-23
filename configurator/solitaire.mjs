// A continuous shoulder and blind bezel are constructed as a single closed surface.
// Coordinates are millimetres; the stone enters along -Y from above the crest.
const TAU = 2 * Math.PI;
const STATIONS = 256;
const AXIAL_INTERVALS = 32;

function builder() {
  const vertices = [], faces = [];
  function point(x, y, z) {
    vertices.push([x, y, z]);
    return vertices.length - 1;
  }
  function triangle(a, b, c) { faces.push(a, b, c); }
  function quad(a, b, c, d) { triangle(a, b, c); triangle(a, c, d); }
  function finish() {
    const used = [...new Set(faces)].sort((a,b) => a-b);
    const lookup = new Map(used.map((old, i) => [old, i]));
    const positions = Float32Array.from(used.flatMap(i => vertices[i]));
    const indices = Uint32Array.from(faces, i => lookup.get(i));
    let volume = 0;
    for (let i=0; i<indices.length; i+=3) {
      const a=3*indices[i], b=3*indices[i+1], c=3*indices[i+2];
      volume += positions[a]*(positions[b+1]*positions[c+2]-positions[b+2]*positions[c+1]) +
        positions[a+1]*(positions[b+2]*positions[c]-positions[b]*positions[c+2]) +
        positions[a+2]*(positions[b]*positions[c+1]-positions[b+1]*positions[c]);
    }
    if (volume < 0) {
      for (let i=0; i<indices.length; i+=3) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    }
    return {positions, indices, volume:Math.abs(volume)/6, triangles:indices.length/3};
  }
  return {point, triangle, quad, finish, vertices};
}

function bandProfile(half, thickness, lip) {
  const p = [];
  for (let i=0; i<=AXIAL_INTERVALS; i++) p.push([(2*i/AXIAL_INTERVALS-1)*(half-lip), thickness]);
  function arc(z, r, a, b, includeStart) {
    for (let i=includeStart?0:1; i<=5; i++) {
      const v=a+(b-a)*i/5;
      p.push([z+lip*Math.cos(v), r+lip*Math.sin(v)]);
    }
  }
  arc(half-lip, thickness-lip, Math.PI/2, 0, false);
  arc(half-lip, lip, 0, -Math.PI/2, true);
  arc(-half+lip, lip, -Math.PI/2, -Math.PI, true);
  // The final vertex would duplicate the start of the outer panel.
  for(let i=0;i<5;i++){
    const v=Math.PI-Math.PI*i/10;
    p.push([-half+lip+lip*Math.cos(v),thickness-lip+lip*Math.sin(v)]);
  }
  return p;
}

function facetedStone(radius, girdle, pavilion, aspect) {
  const m=builder(), count=32;
  const tip=m.point(0,girdle-pavilion,0);
  let previous=[];
  const belts=[[.5,-pavilion*.50,.5],[1,0,0],[1,.035,0],[.78,.15*radius,.5],[.54,.29*radius,0]];
  for(const [scale,height,offset] of belts) {
    const belt=[];
    for(let i=0;i<count;i++) {
      const a=TAU*(i+offset)/count;
      belt.push(m.point(radius*scale*Math.cos(a),girdle+height,radius*scale*Math.sin(a)*aspect));
    }
    for(let i=0;i<count;i++) {
      const j=(i+1)%count;
      if(previous.length) m.quad(previous[i],previous[j],belt[j],belt[i]);
      else m.triangle(tip,belt[j],belt[i]);
    }
    previous=belt;
  }
  const top=m.point(0,girdle+.29*radius,0);
  for(let i=0;i<count;i++) m.triangle(previous[i],previous[(i+1)%count],top);
  return m.finish();
}

export function buildSolitaire({template='solitaire',diameter=17,width=3,thickness=1.6,shrink=0,stone=5}={}) {
  for(const [v,min,max] of [[diameter,14,23],[width,2,8],[thickness,1.2,2.8],[shrink,0,3],[stone,3.5,6]]) {
    if(!Number.isFinite(v) || v < min || v > max) throw new RangeError('Размер за пределами диапазона шаблона.');
  }
  const m=builder(), radius=diameter/(2*Math.cos(Math.PI/STATIONS)), gemRadius=stone/2;
  // Only the head is elongated along the finger. The ring gauge and lower band
  // keep their dimensions and the seat follows the selected stone outline.
  const aspect=template==='oval'?1.4:1;
  const lip=Math.min(.24,width*.07,thickness*.15);
  const crestMargin=1.48;
  const crestHalf=Math.max(width/2,(gemRadius+crestMargin)*aspect+lip);
  const outer=radius+thickness;
  const march=TAU/STATIONS;
  const limit=Math.ceil(Math.asin((gemRadius+crestMargin)/outer)/march);
  const angleLimit=limit*march;
  const at=(i)=>((i%STATIONS)+STATIONS)%STATIONS;
  const rows=[];
  for(let i=0;i<STATIONS;i++) {
    const angle=i*march, distance=Math.min(angle,TAU-angle);
    const u=Math.min(1,Math.max(0,(distance-angleLimit)/.90));
    const blend=u*u*(3-2*u);
    const half=crestHalf+(width/2-crestHalf)*blend;
    rows.push(bandProfile(half,thickness,lip).map(([z,h])=>m.point((radius+h)*Math.sin(angle),(radius+h)*Math.cos(angle),z)));
  }
  const n=rows[0].length;
  for(let i=0;i<STATIONS;i++){
    const next=at(i+1);
    for(let j=0;j<n;j++) {
      if((i<limit || i>=STATIONS-limit) && j<AXIAL_INTERVALS) continue;
      const k=(j+1)%n;
      m.quad(rows[i][j],rows[i][k],rows[next][k],rows[next][j]);
    }
  }
  const frame=[];
  for(let j=0;j<AXIAL_INTERVALS;j++) frame.push(rows[at(-limit)][j]);
  for(let i=-limit;i<limit;i++) frame.push(rows[at(i)][AXIAL_INTERVALS]);
  for(let j=AXIAL_INTERVALS;j>0;j--) frame.push(rows[limit][j]);
  for(let i=limit;i>-limit;i--) frame.push(rows[at(i)][0]);
  const angles=frame.map(index=>Math.atan2(m.vertices[index][2]/aspect,m.vertices[index][0]));
  let loop=frame;
  function circle(r,y) {
    const next=angles.map(a=>m.point(r*Math.cos(a),y,r*Math.sin(a)*aspect));
    for(let i=0;i<loop.length;i++) {
      const j=(i+1)%loop.length;
      m.quad(loop[i],loop[j],next[j],next[i]);
    }
    loop=next;
  }
  const pavilion=stone*.43, floor=radius+.96;
  const girdle=Math.max(floor+.20+pavilion,outer+.42);
  const bearing=girdle-.14*pavilion;
  circle(gemRadius+1.14,girdle-.28);
  circle(gemRadius+.97,girdle+.35);
  circle(gemRadius+.92,girdle+.41);
  circle(gemRadius+.10,girdle+.41);
  circle(gemRadius+.055,girdle+.35);
  circle(gemRadius+.055,bearing);
  // A small seating allowance separates the nominal stone from the bearing.
  circle(gemRadius*.86+.008,bearing);
  circle(gemRadius*.20,floor+.08);
  circle(gemRadius*.16,floor);
  const base=m.point(0,floor,0);
  for(let i=0;i<loop.length;i++) m.triangle(loop[i],loop[(i+1)%loop.length],base);
  return {...m.finish(), factor:1/(1-shrink/100), section:bandProfile(width/2,thickness,lip), gem:facetedStone(gemRadius,girdle,pavilion,aspect)};
}
