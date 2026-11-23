// Deterministic periodic contours. The same seed always gives the same family
// of curves, even when the diameter, width or relief is edited later.
export function freeformSection(seed, width, thickness, character, stations) {
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff)
    throw new RangeError('Номер формы должен быть целым от 1 до 4294967295.');
  let state = seed;
  function random() {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  }
  const tau = Math.PI * 2;
  function contour() {
    const peaks = 1 + Math.floor(random() * 4);
    const phase = [random()*tau, random()*tau, random()*tau];
    const secondary = 0.15 + 0.27*random();
    return angle => (1-secondary-0.12)*Math.cos(peaks*angle + phase[0])
      + secondary*Math.cos((peaks+1)*angle + phase[1]) + 0.12*Math.cos(angle + phase[2]);
  }
  const sweep = contour(), breadth = contour(), depth = contour(), crest = contour();
  // On narrow bands retain enough metal at each waist, even with maximum relief.
  const intensity = (0.42 + 0.11*character)*Math.min(1,width/3.5);
  const sway = (0.16 + 0.24*random()) * intensity;
  const taper = (0.12 + 0.27*random()) * intensity;
  const skew = (0.15 + 0.27*random()) * intensity;
  const relief = (0.10 + 0.18*random()) * intensity;
  const sections = Array.from({length:stations}, (_,i) => {
    const a = tau*i/stations;
    const center = sway*sweep(a), half = 0.5 + taper*breadth(a);
    return {left:center-half, right:center+half, height:depth(a), crest:skew*crest(a)};
  });
  const lo = Math.min(...sections.map(s=>s.left)), hi = Math.max(...sections.map(s=>s.right));
  const tallest = Math.max(...sections.map(s=>s.height));
  return index => {
    const s=sections[index];
    const center = width*((0.5*(s.right+s.left)-lo)/(hi-lo)-0.5);
    const half = width*(s.right-s.left)/(2*(hi-lo));
    const height = thickness-Math.min(relief*thickness,thickness-1.08)*(tallest-s.height)*0.5;
    const lip = Math.min(0.22, height*0.14, half*0.2);
    const points = [];
    function arc(x,y,start,end) {
      for(let i=0;i<=5;i++){
        const a=start+(end-start)*i/5;
        points.push([center+x+lip*Math.cos(a),y+lip*Math.sin(a)]);
      }
    }
    arc(half-lip,lip,-Math.PI/2,0);
    for(let i=0;i<=32;i++){
      const a=Math.PI*i/32, v=Math.sin(a);
      const edgeHeight=Math.max(0.90,0.66*height);
      points.push([center+half*(Math.cos(a)+s.crest*v*v),edgeHeight+(height-edgeHeight)*v]);
    }
    arc(-half+lip,lip,Math.PI,1.5*Math.PI);
    return points;
  };
}
