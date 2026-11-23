import * as T from './model-three.js';
import { mechanismViews } from './model-mechanisms.js';

const meshUrl = name => new URL('model-' + name + '.bin', import.meta.url);
const stillUrl = name => new URL('../order-01/' + name + '.webp', import.meta.url);
const vec = (v) => new T.Vector3(...v);
const incline = 41 * Math.PI / 180;
const sn = Math.sin(incline), cs = Math.cos(incline);
function shoulder(s, y, height) {
  return [cs * s + sn * height, y, -sn * s + cs * height];
}
const defaultViews = {
  ring: {
    title:'Кольцо целиком', center:[0,0,1.5], dir:[.43,-1,.38], span:29.5,
    overview:['center','pave','shank'], still:'whole',
    points:{
      center:{title:'Центральная вставка',at:[0,0,13.30],dir:[.26,-.85,.8],span:11},
      prong:{title:'Крапан',at:[2.10,-2.10,13.20],dir:[.56,-1,.32],span:7.6},
      pave:{title:'Дорожка паве',at:shoulder(-.725,0,10.01),dir:[.85,-.50,1.20],span:11.5},
      bead:{title:'Корнер',at:shoulder(0,-.525,10.17),dir:[.85,-.55,1.13],span:4.4},
      window:{title:'Выход ажура',at:shoulder(-.725,0,Math.sqrt(8.5*8.5-.725*.725)),dir:[-.77,-.53,-.74],span:8.3},
      shank:{title:'Низ шинки',at:[0,-1.015,-9.4],dir:[.44,-1,.29],span:13},
      relief:{title:'Выборка',at:[-8.42,0,-3.40],dir:[.97,-.57,.36],span:8}
    }
  },
  stud:{
    title:'Пусета',center:[0,0,-2.80],dir:[.8,-1,.37],span:18.2,overview:['basket','post'],still:'stud',
    points:{
      basket:{title:'Корзинка',at:[1.396,-1.396,2.364],dir:[.75,-1,.45],span:8.7},
      post:{title:'Штифт до обработки',at:[0,-.50,-5.7],dir:[.65,-1,.13],span:12}
    }
  },
  nut:{title:'Гайка до обработки',center:[0,0,1.3],dir:[.52,-1,.82],span:7.8,still:'stud',
    points:{pilot:{title:'Канал под обработку',at:[0,0,2.67],dir:[.2,-.56,1],span:5.2}}},
  thread:{title:'Резьбовая пара',center:[1.73,0,-7.6],dir:[.43,-1,.52],span:9,still:'stud',
    points:{
      screw:{title:'Наружная резьба',at:[0,-.45,-8.1],dir:[.26,-1,.16],span:4.8},
      bore:{title:'Резьба в гайке',at:[3.9,0,-6.03],dir:[.28,-.4,1],span:5.5}
    }},
  ...mechanismViews
};
const posters={pause:'../pause/cover.jpg',duet:'../duet/assets/duet-r3.webp'};
const keyToModel = new Map();
for (const [name, model] of Object.entries(defaultViews)) {
  keyToModel.set(name, name);
  for (const p of Object.keys(model.points || {})) keyToModel.set(p,name);
}
const styles = `
.rr-atlas-stage{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:radial-gradient(ellipse at 38% 28%,#3e4646,#282f31 53%,#192124 100%);border-radius:inherit}
.rr-atlas-stage:focus-visible{outline:2px solid #f9d49b;outline-offset:-3px}
.rr-atlas-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.rr-atlas-stage canvas:active{cursor:grabbing}
.rr-atlas-labels{position:absolute;inset:0;pointer-events:none}
.rr-atlas-pin{box-sizing:border-box;position:absolute;left:0;top:0;padding:0;margin:0;width:14px;height:14px;border-radius:100%;border:1px solid #fff4d9;outline:1px solid #3e3529;background:rgba(55,42,28,.92);pointer-events:auto;cursor:pointer;box-shadow:0 0 0 3px #ffffff25;z-index:1}
.rr-atlas-pin:before{content:'';position:absolute;inset:-12px;border-radius:50%}
.rr-atlas-pin span{position:absolute;box-sizing:border-box;display:block;left:18px;top:50%;transform:translateY(-50%);background:#242d30e8;color:#fff5de;border:1px solid #adb0a570;border-radius:4px;padding:5px 7px;font:500 12px/1.16 Arial,sans-serif;white-space:nowrap;letter-spacing:.015em;pointer-events:auto}
.rr-atlas-pin.rr-pin-left span{left:auto;right:18px}
.rr-atlas-pin.rr-selected,.rr-atlas-pin:hover,.rr-atlas-pin:focus-visible{background:#f3c784;border-color:#fff7df;z-index:3}
.rr-atlas-status{position:absolute;z-index:4;left:50%;top:50%;transform:translate(-50%,-50%);max-width:80%;font:500 15px/1.4 Arial,sans-serif;color:#fff8e8;background:#253237de;border-radius:4px;padding:8px 12px;text-align:center}
.rr-atlas-stage .rr-atlas-still{position:absolute;inset:0;z-index:3;width:100%;height:100%;display:block;object-fit:contain;background:#2c3233}
.rr-atlas-stage .rr-atlas-still+.rr-atlas-status{top:auto;bottom:12px;transform:translateX(-50%);width:max-content}
`;
function installStyle(){
  if (document.getElementById('rr-atlas-3d-style')) return;
  const tag=document.createElement('style'); tag.id='rr-atlas-3d-style'; tag.textContent=styles; document.head.append(tag);
}
function studio() {
  const w=512,h=256, data=new Float32Array(w*h*4);
  const panels=[
    [.14,.36,.025,.23,7.5], [.205,.40,.018,.19,2.3], [.58,.22,.10,.046,5.9],
    [.78,.45,.055,.21,4.7], [.98,.27,.04,.17,3.7], [.39,.70,.12,.035,1.8]
  ];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const u=x/w, v=y/h;
    let light=.12+.11*Math.cos(v*Math.PI)**2;
    for(const [cx,cy,a,b,power] of panels){
      const dx=Math.min(Math.abs(u-cx),1-Math.abs(u-cx))/a;
      const dy=Math.abs(v-cy)/b;
      light+=power*Math.exp(-((dx**6)+(dy**6)));
    }
    let i=(y*w+x)*4;
    data[i]=light*(.97+.06*v); data[i+1]=light; data[i+2]=light*(1.04-.09*v); data[i+3]=1;
  }
  const tex=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);
  tex.mapping=T.EquirectangularReflectionMapping; tex.minFilter=T.LinearFilter;tex.magFilter=T.LinearFilter;
  tex.wrapS=T.RepeatWrapping; tex.needsUpdate=true;return tex;
}
function gemstone(color){
  // Faceted, camera-dependent studio reflections for an educational viewing mesh.
  return new T.ShaderMaterial({
    uniforms:{tint:{value:new T.Color(color)}},
    vertexShader:`varying vec3 world, normalW;void main(){ world=(modelMatrix*vec4(position,1.)).xyz; normalW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(world,1.); }`,
    fragmentShader:`varying vec3 world,normalW;uniform vec3 tint;
    float lightbox(vec3 d){
      d=normalize(d);
      float a=.12+.27*max(d.z,0.);
      a+=1.34*smoothstep(.88,.986,dot(d,normalize(vec3(-.45,-.59,.73))));
      a+=1.9*(1.-smoothstep(.0,.08,abs(d.x*.90+d.y*.38-.31)))*smoothstep(-.40,.20,d.z);
      a+=1.23*smoothstep(.75,.985,dot(d,normalize(vec3(.58,.64,.32))));
      a+=.76*(1.-smoothstep(.018,.14,abs(d.y-.41)))*smoothstep(-.3,.2,d.x);
      return a;
    }
    void main(){
      vec3 n=normalize(normalW), eye=normalize(world-cameraPosition),r=reflect(eye,n);
      float fac=pow(1.-abs(dot(n,eye)),3.);
      vec3 q=refract(eye,n,.4136);
      vec3 inner=normalize(reflect(q,normalize(vec3(-n.x,-n.y,n.z-.72))));
      vec3 fire=vec3(lightbox(inner+vec3(.025,0.,0.)),lightbox(inner),lightbox(inner-vec3(.028,.008,0.)));
      vec3 c=tint*(.13+fire*.76)+mix(.27,.86,fac)*lightbox(r);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
}
function materials() {
  return [
    new T.MeshStandardMaterial({color:0xe9bd7d, metalness:.96, roughness:.24}),
    gemstone(0xd6eaf6),
    new T.MeshStandardMaterial({color:0xd6e2e6,metalness:.96,roughness:.25}),
    gemstone(0x33a9ad),
    new T.MeshPhysicalMaterial({color:0xecdfc9,metalness:.10,roughness:.24,clearcoat:.45,iridescence:.3}),
    new T.MeshPhysicalMaterial({color:0xdce5e3,roughness:.6,opacity:.66,transparent:true,depthWrite:false})
  ];
}
function unpack(buf, mats, file) {
  const view=new DataView(buf), group=new T.Group();
  const packed=String.fromCharCode(...new Uint8Array(buf,0,4))==='RRV1';
  let pos=packed?4:0;
  function u32(){const n=view.getUint32(pos,true);pos+=4;return n}
  const n=u32();
  for(let i=0;i<n;i++){
    const type=u32(),verts=u32(),g=new T.BufferGeometry();
    if (packed){
      const corners=u32(), pairs=new Int16Array(buf,pos,verts*6); pos+=verts*12;
      const xyz=new Float32Array(verts*3), norms=new Float32Array(verts*3);
      for(let j=0;j<verts;j++) for(let k=0;k<3;k++){
        xyz[3*j+k]=pairs[6*j+k]/1000;
        norms[3*j+k]=pairs[6*j+k+3]/32767;
      }
      g.setAttribute('position',new T.BufferAttribute(xyz,3));
      g.setAttribute('normal',new T.BufferAttribute(norms,3));
      g.setIndex(new T.BufferAttribute(new Uint32Array(buf,pos,corners),1)); pos+=corners*4;
    }else{
      const xyz=new Float32Array(buf,pos,verts*9);pos+=verts*36;
      g.setAttribute('position',new T.BufferAttribute(xyz,3)); g.computeVertexNormals();
    }
    const silicone=file==='pause'&&i===2;
    const m=new T.Mesh(g,mats[silicone?5:type]);m.userData.stone=!silicone&&[1,3,4].includes(type);
    if(file==='thread'&&i===2)m.position.set(3.9,0,-8.7);
    if(file==='ring' && type===1 && g.index){
      // The 5 mm centre stone ends at |X|=2.50; the first pavé starts at |X|=3.21.
      // Keep the original vertices and normals; only separate their triangle indices.
      const centre=[], pave=[], ids=g.index.array, x=g.getAttribute('position');
      for(let k=0;k<ids.length;k+=3){
        const dest=Math.abs(x.getX(ids[k]))<2.8?centre:pave;
        dest.push(ids[k],ids[k+1],ids[k+2]);
      }
      const cg=new T.BufferGeometry();
      cg.setAttribute('position',x);cg.setAttribute('normal',g.getAttribute('normal'));cg.setIndex(centre);
      const central=new T.Mesh(cg,m.material);central.userData.stone=true;central.userData.central=true;
      g.setIndex(pave);group.add(central);
    }
    group.add(m);
  }
  return group;
}
export function mountViewer(container,{onSelect=()=>{}}={}){
  installStyle();
  let key='ring',modelName='ring',loadedName=null, showStones=true, epoch=0, group=null, frame=0, motion=null;
  let renderer, scene, camera, controls, studioMap, mat, fatal=false;
  let demonstration={id:'',phase:0,value:0};
  const cache=new Map();
  const root=document.createElement('div');root.className='rr-atlas-stage';root.tabIndex=0;
  root.setAttribute('role','group');root.setAttribute('aria-label','Интерактивная модель. Стрелки вращают, плюс и минус меняют масштаб.');
  container.append(root);
  const overlay=document.createElement('div');overlay.className='rr-atlas-labels';root.append(overlay);
  const notice=document.createElement('div');notice.className='rr-atlas-status';notice.setAttribute('role','status');root.append(notice);
  let width=1,height=1, pins=[];
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  function message(text){notice.textContent=text;notice.hidden=!text;notice.style.display=text?'block':'none'}
  function fallback(text){
    let img=root.querySelector('.rr-atlas-still');
    if(!img){img=document.createElement('img');img.className='rr-atlas-still';root.insertBefore(img,notice)}
    img.src=posters[modelName]||stillUrl(defaultViews[modelName].still||'whole');
    img.alt='Иллюстрация к теме «'+defaultViews[modelName].title+'»';
    overlay.replaceChildren();pins=[];message(text);
  }
  function sizes(){
    width=Math.max(1,root.clientWidth);height=Math.max(1,root.clientHeight);
    if(!renderer)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();invalidate();
  }
  function getView(){
    const m=defaultViews[modelName], p=m.points?.[key];
    if(demonstration.id==='pivot' && key==='pivot')return {at:m.center,dir:m.dir,span:47};
    if(demonstration.id==='joint' && key==='joint')return {at:m.center,dir:m.dir,span:31};
    if(demonstration.id==='insertion' && key==='center')return {at:[0,0,14],dir:[.28,-1,.20],span:14};
    if(demonstration.id==='thread' && key==='thread')return {at:[0,0,-6.2],dir:[.4,-1,.18],span:12};
    return {at:p?.at||m.center,dir:p?.dir||m.dir,span:p?.span||m.span};
  }
  function applyDemonstration(){
    if(!group)return;
    const {id,phase,value}=demonstration, objects=group.children;
    if(modelName==='thread'){
      const nut=objects[2];
      if(id==='thread'){nut.position.set(0,0,-9.45+.35*value);nut.rotation.z=2*Math.PI*value;}
      else{nut.position.set(3.9,0,-8.7);nut.rotation.z=0;}
    }
    if(modelName==='pause'){
      const angle=id==='pivot'?(-value-12)*Math.PI/180:0;
      for(const i of [0,6,7,9])objects[i].rotation.y=angle;
    }
    if(modelName==='duet'){
      const distance=id==='joint'?5-value:0;
      for(const i of [1,7])objects[i].position.y=distance;
    }
    if(modelName==='ring'){
      const centre=objects.find(x=>x.userData.central);
      if(centre)centre.position.z=id==='insertion'?(phase===2?-.02:5*(1-value/100)):0;
    }
    invalidate();
  }
  function setDemonstration(id,phase,value){
    demonstration={id,phase,value};
    applyDemonstration();
  }
  function fit(animated){
    if(!controls)return;
    const view=getView(), aim=vec(view.at), direction=vec(view.dir).normalize();
    const factor=Math.max(1,1/Math.max(.4,camera.aspect));
    const dist=view.span*factor/(2*Math.tan(camera.fov*Math.PI/360));
    const dest=aim.clone().addScaledVector(direction,dist);
    motion=null;
    if(animated&&!reduce.matches&&loadedName!==null){
      motion={start:performance.now(),from:camera.position.clone(),target:controls.target.clone(),dest,aim};
    }else{camera.position.copy(dest);controls.target.copy(aim);controls.update()}
    invalidate();
  }
  function addPins(){
    overlay.replaceChildren();pins=[];
    const m=defaultViews[modelName];
    const others=Object.keys(m.points||{});
    const ids=key===modelName?(m.overview||others.slice(0,3)):
      (['pause','duet','thread','nut'].includes(modelName)?[key,...others.filter(id=>id!==key)]:[key]);
    for(const id of ids){
      const p=m.points?.[id];
      if(!p)continue;
      const b=document.createElement('button');b.className='rr-atlas-pin';b.type='button';
      if(id===key)b.classList.add('rr-selected');
      b.setAttribute('aria-label','Показать: '+p.title);
      const tag=document.createElement('span');tag.textContent=p.title;b.append(tag);overlay.append(b);
      b.addEventListener('click',()=>{api.show(id);onSelect(id)});
      pins.push({el:b,tag,at:vec(p.at),pref:vec(p.dir||m.dir).normalize(),id});
    }
  }
  const projected=new T.Vector3(),toCamera=new T.Vector3(),pinWorld=new T.Vector3(),axisY=new T.Vector3(0,1,0);
  function projectPins(){
    const occupied=[];
    for(const pin of pins){
      pinWorld.copy(pin.at);
      const {id,value,phase}=demonstration;
      if(id==='pivot' && ['lever','pearl','aquamarine'].includes(pin.id))pinWorld.applyAxisAngle(axisY,(-value-12)*Math.PI/180);
      if(id==='joint' && ['socket','teal'].includes(pin.id))pinWorld.y+=5-value;
      if(id==='thread' && pin.id==='bore')pinWorld.set(0,0,-9.45+.35*value+2.67);
      if(id==='insertion' && pin.id==='center')pinWorld.z+=phase===2?-.02:5*(1-value/100);
      projected.copy(pinWorld).project(camera);toCamera.copy(camera.position).sub(pinWorld).normalize();
      const x=(projected.x*.5+.5)*width, y=(-projected.y*.5+.5)*height;
      const hide=projected.z>1||projected.z< -1||x<10||y<10||x>width-10||y>height-10||pin.pref.dot(toCamera)<-.13||
        (!showStones&&['center','pave','white','teal','pearl','aquamarine'].includes(pin.id));
      pin.el.hidden=hide;if(hide)continue;
      pin.el.style.transform='translate('+Math.round(x-7)+'px,'+Math.round(y-7)+'px)';
      pin.tag.style.visibility='visible';
      const labelW=pin.tag.offsetWidth||80;
      let left=x+labelW+25>width || x>width*.56;
      if(left&&x-labelW-21<0)left=false;
      pin.el.classList.toggle('rr-pin-left',left);
      const x0=left?x-labelW-14:x+14, x1=x0+labelW;
      if(occupied.some(r=>Math.abs(y-r[2])<25&&x1>r[0]&&x0<r[1]))pin.tag.style.visibility='hidden';
      else occupied.push([x0,x1,y]);
    }
  }
  function render(now){
    frame=0;if(!renderer||fatal)return;
    if(motion){
      const t=Math.min(1,(now-motion.start)/500),u=t*t*(3-2*t);
      camera.position.lerpVectors(motion.from,motion.dest,u);controls.target.lerpVectors(motion.target,motion.aim,u);
      controls.update();if(t>=1)motion=null;else invalidate();
    }
    renderer.render(scene,camera);projectPins();
  }
  function invalidate(){if(!frame&&!fatal)frame=requestAnimationFrame(render)}
  function stoneVisibility(){
    group?.children.forEach(m=>{if(m.userData.stone)m.visible=showStones});invalidate();
  }
  async function show(next){
    if(!keyToModel.has(next))return false;
    const token=++epoch;
    key=next;modelName=keyToModel.get(next);
    if(fatal){fallback('В этом браузере доступна иллюстрация и материалы главы.');return false}
    if(loadedName===modelName){
      addPins();fit(true);return true;
    }
    const file=modelName;
    if(loadedName!==null){scene.remove(group);loadedName=null;group=null}
    overlay.replaceChildren();pins=[];message('Загружаем модель…');
    let pending=cache.get(file);
    if(!pending){
      pending=fetch(meshUrl(file)).then(r=>{if(!r.ok)throw Error(String(r.status));return r.arrayBuffer()}).then(data=>unpack(data,mat,file));
      cache.set(file,pending);
    }
    try{
      const asset=await pending;
      if(token!==epoch)return false;
      root.querySelector('.rr-atlas-still')?.remove();group=asset;scene.add(group);stoneVisibility();
      applyDemonstration();sizes();addPins();fit(false);loadedName=file;message('');invalidate();
      return true;
    }catch(e){
      if(cache.get(file)===pending)cache.delete(file);
      if(token===epoch)fallback('Модель не загрузилась. Можно повторно выбрать главу или открыть сечение.');
      return false;
    }
  }
  function zoom(factor){
    if(!controls||!Number.isFinite(factor)||factor<=0)return;
    motion=null;const d=camera.position.clone().sub(controls.target);
    const length=Math.min(210,Math.max(.8,d.length()/factor));
    camera.position.copy(controls.target).add(d.setLength(length));controls.update();invalidate();
  }
  const api={show,setDemonstration,reset(){fit(false)},zoom,toggleStones(){showStones=!showStones;stoneVisibility();return showStones},
    get stoneVisible(){return showStones},
    get active(){return key}};
  try{
    renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.24;
    root.prepend(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fatal=true;fallback('Просмотр 3D прерван. Обновите страницу, чтобы восстановить его.')});
    scene=new T.Scene();camera=new T.PerspectiveCamera(35,1,.08,360);camera.up.set(0,0,1);
    const source=studio(), baker=new T.PMREMGenerator(renderer);studioMap=baker.fromEquirectangular(source);scene.environment=studioMap.texture;
    source.dispose();baker.dispose();
    mat=materials();
    scene.add(new T.HemisphereLight(0xfff8e6,0x64717c,.95));
    const sun=new T.DirectionalLight(0xffffff,2.0);sun.position.set(-10,-13,23);scene.add(sun);
    controls=new T.OrbitControls(camera,renderer.domElement); controls.enablePan=false;controls.minDistance=.8;controls.maxDistance=210;
    controls.rotateSpeed=.73;controls.zoomSpeed=.85;
    controls.addEventListener('start',()=>{motion=null});controls.addEventListener('change',invalidate);
    root.addEventListener('keydown',e=>{
      if(e.target!==root&&e.target!==renderer.domElement)return;
      const delta={ArrowLeft:[.14,0],ArrowRight:[-.14,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]}[e.key];
      if(delta){
        e.preventDefault();motion=null;
        const d=camera.position.clone().sub(controls.target),r=d.length();
        const a=Math.atan2(d.y,d.x)+delta[0],i=Math.max(.04,Math.min(Math.PI-.04,Math.acos(d.z/r)+delta[1]));
        d.set(r*Math.sin(i)*Math.cos(a),r*Math.sin(i)*Math.sin(a),r*Math.cos(i));
        camera.position.copy(controls.target).add(d);controls.update();invalidate();
      }else if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?.84:1.2)}
    });
    new ResizeObserver(()=>{sizes();if(loadedName&&!motion)fit(false)}).observe(root);
    sizes();show('ring');
  }catch(e){fatal=true;fallback('Для вращения модели нужен браузер с WebGL 2. Сейчас показана иллюстрация.')}
  return api;
}
