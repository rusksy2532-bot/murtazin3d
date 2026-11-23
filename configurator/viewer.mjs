import * as T from './vendor/three-r170.module.js';

const finishes = {
  champagne: '#e4bd80',
  white: '#e1e4e5',
  rose: '#e5a087'
};
const home = { yaw: -.55, pitch: .72, roll: -.17 };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// An analytic studio environment keeps the preview local and avoids an HDR download.
const studio = `
  float panel(vec3 direction, vec3 axis, float w, float h) {
    axis = normalize(axis);
    float forward = dot(direction, axis);
    vec3 right = normalize(cross(vec3(0.,1.,0.),axis));
    vec2 uv = vec2(dot(direction,right),dot(direction,cross(axis,right))) /
              max(.01,forward);
    vec2 edge = smoothstep(vec2(.83),vec2(1.1),abs(uv)/vec2(w,h));
    return (1.-edge.x)*(1.-edge.y)*step(0.,forward);
  }
  vec3 environment(vec3 d) {
    float base = .08 + .13*smoothstep(-.55,.85,d.y);
    vec3 c = vec3(base);
    c += vec3(2.8,2.55,2.18)*panel(d,vec3(-.77,.45,.52),.34,.85);
    c += vec3(2.8,2.95,3.1)*panel(d,vec3(.85,.08,.38),.09,1.7);
    c += vec3(1.48,1.53,1.61)*panel(d,vec3(-.28,.9,-.75),.74,.35);
    c += vec3(1.55,1.31,1.01)*panel(d,vec3(.37,-.32,-.93),.37,.5);
    c += vec3(.84,.76,.65)*panel(d,vec3(-.63,-.45,.55),.55,.075);
    return c;
  }
  vec3 film(vec3 c) {
    return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);
  }
`;

const vertexShader = `
  varying vec3 worldP;
  varying vec3 worldN;
  void main() {
    worldP=(modelMatrix*vec4(position,1.)).xyz;
    worldN=normalize(mat3(modelMatrix)*normal);
    gl_Position=projectionMatrix*viewMatrix*vec4(worldP,1.);
  }`;

function material(gem) {
  const fragment = gem ? `
    vec3 n=normalize(worldN);
    vec3 eye=normalize(worldP-cameraPosition);
    vec3 reflected=reflect(eye,n);
    vec3 inside=refract(eye,n,1./2.418);
    vec3 fire=vec3(environment(normalize(inside+1.69*n)).r,
                   environment(normalize(inside+1.73*n)).g,
                   environment(normalize(inside+1.78*n)).b);
    float fresnel=.17+.83*pow(1.-abs(dot(-eye,n)),5.);
    vec3 color=vec3(.15,.17,.18)+mix(fire*.84,environment(reflected),fresnel);
  ` : `
    vec3 n=normalize(worldN);
    vec3 viewDir=normalize(cameraPosition-worldP);
    vec3 r=reflect(-viewDir,n);
    vec3 tint=mix(metalColor,vec3(.99),.35*pow(1.-abs(dot(viewDir,n)),4.));
    vec3 color=tint*(environment(r)+.055);
  `;
  return new T.ShaderMaterial({
    uniforms: { metalColor: { value: new T.Color(finishes.champagne) } },
    vertexShader,
    fragmentShader: `varying vec3 worldP; varying vec3 worldN; uniform vec3 metalColor;
      ${studio}
      void main(){ ${fragment} gl_FragColor=vec4(film(color),1.);
      #include <colorspace_fragment>
      }`
  });
}

function geometry(data, faceted) {
  let shape = new T.BufferGeometry();
  shape.setAttribute('position', new T.BufferAttribute(data.positions,3));
  shape.setIndex(new T.BufferAttribute(data.indices,1));
  if (faceted) {
    const flat = shape.toNonIndexed();
    shape.dispose();
    shape = flat;
  }
  shape.computeVertexNormals();
  return shape;
}

// Use actual projected STL triangles for the fallback, so custom inputs stay visible
// even in browsers where hardware acceleration is disabled.
function drawSoftware(ctx, canvas, objects, root, camera, width, height, metal) {
  const matrix = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
  const faces = [];
  for (const object of objects) {
    const shape = object.geometry;
    const vertices = shape.attributes.position;
    const indices = shape.index?.array;
    const transform = matrix.clone().multiply(object.matrixWorld);
    const projected = new Float32Array(vertices.count*3);
    const point = new T.Vector3();
    for (let i=0; i<vertices.count; i++) {
      point.fromBufferAttribute(vertices,i).applyMatrix4(transform);
      projected.set([(point.x+1)*width/2,(1-point.y)*height/2,point.z],i*3);
    }
    const normal = new T.Vector3();
    const gem = object === objects[1];
    const tint = gem ? [229,236,240] : metal.match(/\w\w/g).map(c=>parseInt(c,16));
    for (let i=0; i<(indices?.length ?? vertices.count); i+=3) {
      const a=(indices?.[i] ?? i)*3, b=(indices?.[i+1] ?? i+1)*3, c=(indices?.[i+2] ?? i+2)*3;
      const ax=projected[a], ay=projected[a+1], bx=projected[b], by=projected[b+1], cx=projected[c], cy=projected[c+1];
      if ((bx-ax)*(cy-ay)-(by-ay)*(cx-ax)>=0) continue;
      normal.fromBufferAttribute(shape.attributes.normal,a/3).transformDirection(root.matrixWorld);
      const band = Math.cos(7.1*normal.x + 4.8*normal.y + 1.15)*.5+.5;
      const light = .34+.66*Math.pow(band,.6)+.19*Math.max(0,normal.y);
      const paint = 'rgb('+tint.map(v=>Math.min(255,Math.round(v*light))).join(',')+')';
      faces.push([projected[a+2]+projected[b+2]+projected[c+2],paint,ax,ay,bx,by,cx,cy]);
    }
  }
  faces.sort((a,b)=>b[0]-a[0]);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (const [,paint,ax,ay,bx,by,cx,cy] of faces) {
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.closePath();
    ctx.fillStyle=paint;ctx.fill();ctx.strokeStyle=paint;ctx.lineWidth=.55;ctx.stroke();
  }
}

export function createViewer(canvas) {
  let renderer;
  try { renderer = new T.WebGLRenderer({canvas, antialias:true,alpha:true, powerPreference:'low-power'}); }
  catch { /* The same generated mesh can be drawn in its projected view below. */ }
  const fallback = renderer ? undefined : canvas.getContext('2d');
  const scene = new T.Scene(), root = new T.Group();
  const camera = new T.PerspectiveCamera(32,1,.1,25);
  scene.add(root);
  const surface = material(false), jewel = material(true);
  let zoom=1, yaw=home.yaw, pitch=home.pitch, finish='champagne', scheduled=false;
  const pointers = new Map();
  const pairDistance = () => {
    const [a,b] = Array.from(pointers.values());
    return Math.hypot(a.x-b.x,a.y-b.y);
  };

  function draw() {
    scheduled=false;
    const w=canvas.clientWidth, h=canvas.clientHeight;
    if (!w || !h) return;
    const ratio=Math.min(window.devicePixelRatio || 1, renderer ? 2 : 1.25);
    const pw=Math.round(w*ratio), ph=Math.round(h*ratio);
    if (canvas.width!==pw || canvas.height!==ph) {
      if (renderer) renderer.setSize(pw,ph,false);
      else {canvas.width=pw;canvas.height=ph;}
    }
    camera.aspect=w/h;
    camera.position.set(0,0,4.75/(Math.min(1,camera.aspect)*zoom));
    camera.far=Math.max(25,camera.position.z+4);
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
    root.rotation.set(pitch,yaw,home.roll,'ZXY');
    root.updateMatrixWorld(true);
    if (renderer) renderer.render(scene,camera);
    else if (fallback) drawSoftware(fallback,canvas,root.children,root,camera,pw,ph,finishes[finish]);
  }
  function requestDraw() {
    if (!scheduled) {scheduled=true;requestAnimationFrame(draw);}
  }
  function reset() {yaw=home.yaw;pitch=home.pitch;zoom=1;requestDraw();}
  function update(mesh, selectedFinish='champagne') {
    finish=Object.hasOwn(finishes,selectedFinish)?selectedFinish:'champagne';
    surface.uniforms.metalColor.value.set(finishes[finish]);
    for(const child of [...root.children]) {root.remove(child);child.geometry.dispose();}
    root.add(new T.Mesh(geometry(mesh,false),surface));
    if(mesh.gem?.positions?.length) root.add(new T.Mesh(geometry(mesh.gem,true),jewel));
    const bounds=new T.Box3();
    for(const child of root.children) {
      child.geometry.computeBoundingBox();bounds.union(child.geometry.boundingBox);
    }
    const size=bounds.getSize(new T.Vector3());
    const center=bounds.getCenter(new T.Vector3());
    root.scale.setScalar(2/Math.max(size.x,size.y,size.z));
    for(const child of root.children) child.position.copy(center).negate();
    requestDraw();
  }
  canvas.style.touchAction='none';
  canvas.style.cursor='grab';
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0) return;
    canvas.focus({preventScroll:true});
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    canvas.style.cursor='grabbing';
  });
  canvas.addEventListener('pointermove',event=>{
    const last=pointers.get(event.pointerId);
    if(!last) return;
    const dx=event.clientX-last.x, dy=event.clientY-last.y;
    const pinch=pointers.size===2 ? pairDistance() : 0;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch>1) zoom=clamp(zoom*pairDistance()/pinch,.64,1.95);
    else if(pointers.size===1){yaw+=dx*.012;pitch+=dy*.012;}
    requestDraw();
  });
  function release(event){pointers.delete(event.pointerId);if(!pointers.size)canvas.style.cursor='grab';}
  canvas.addEventListener('pointerup',release);
  canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('wheel',event=>{
    event.preventDefault();
    const wheel=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1);
    zoom=clamp(zoom*Math.exp(-wheel*.0013),.64,1.95);requestDraw();
  },{passive:false});
  canvas.addEventListener('keydown',event=>{
    switch(event.key) {
      case 'ArrowLeft':yaw-=.12;break; case 'ArrowRight':yaw+=.12;break;
      case 'ArrowUp':pitch-=.12;break; case 'ArrowDown':pitch+=.12;break;
      case '+':case '=':zoom=clamp(zoom*1.12,.64,1.95);break;
      case '-':zoom=clamp(zoom/1.12,.64,1.95);break; case 'Home':reset();break;
      default:return;
    }
    event.preventDefault();requestDraw();
  });
  new ResizeObserver(requestDraw).observe(canvas);
  canvas.addEventListener('webglcontextrestored',requestDraw);
  return {update,reset};
}
