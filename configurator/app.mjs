import {buildRing,binarySTL} from './geometry.mjs?v=contours1';
import {buildSolitaire} from './solitaire.mjs?v=contours1';
import {createViewer} from './viewer.mjs';
import {inspectSTL} from './inspect.mjs';

const by=id=>document.getElementById(id);
const form=by('settings');
const viewer=createViewer(by('view'));
const templates=Object.fromEntries(Array.from(by('template').options, option=>[option.value,option.text]));
const hasStone=t=>t==='solitaire'||t==='oval';
const alloys={au585:['Au 585',13.15],au750:['Au 750',15.55],au750w:['Au 750 белое',15.9],ag925:['Ag 925',10.36],pt950:['Pt 950',20.6]};
const numeric=['diameter','width','thickness','shrink','stone','character','lobes','seed'];
const keys=['template',...numeric,'finish','alloy'];
const fmt=(n,d=2)=>n.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
let current=null, run=0, controller;

function switches(){
  const t=by('template').value, stone=hasStone(t), wave=t==='wave';
  by('seed-row').hidden=by('seed').disabled=t!=='freeform';
  by('stone').disabled=by('stone').hidden=!stone;
  by('lobes').disabled=by('lobes').hidden=!wave;
  by('variation-label').hidden=!stone&&!wave;
  by('variation-title').textContent=t==='oval'?'Ширина овала, мм':stone?'Диаметр камня, мм':'Количество волн';
  by('variation-label').htmlFor=stone?'stone':'lobes';
  by('character-row').hidden=stone;
  by('char-value').textContent=by('character').value+' / 5';
}
function params(){
  return {template:by('template').value,...Object.fromEntries(numeric.map(k=>[k,by(k).valueAsNumber])),
    finish:form.elements.finish.value,alloy:by('alloy').value};
}
function write(p){
  for(const k of keys){
    if(p[k]===undefined)continue;
    if(k==='finish')form.elements.finish.value=p.finish;
    else by(k).value=p[k];
  }
  switches();
}
function urlFor(p){
  const url=new URL(location.pathname,location.origin);
  for(const k of keys)if(k!=='seed'||p.template==='freeform')url.searchParams.set(k,String(p[k]));
  return url;
}
function restore(){
  const q=new URLSearchParams(location.search),p=params();
  for(const k of numeric){
    if(!q.has(k))continue;
    const field=by(k),value=Number(q.get(k));
    if(Number.isFinite(value)&&value>=Number(field.min)&&value<=Number(field.max)&&
      (field.step!=='1'||Number.isInteger(value)))p[k]=value;
  }
  if(Object.hasOwn(templates,q.get('template')))p.template=q.get('template');
  if(Object.hasOwn(alloys,q.get('alloy')))p.alloy=q.get('alloy');
  if(['champagne','white','rose'].includes(q.get('finish')))p.finish=q.get('finish');
  write(p);
}
function controls(ready=false,pass=false){
  by('inspect').disabled=by('passport').disabled=!ready;
  by('stl').disabled=!pass;by('share').disabled=!ready;
}
function clearAudit(){
  current=null; controls();by('measures').replaceChildren();
  by('quality').textContent='Ожидание проверки новой геометрии.';
  by('feedback').textContent='';
}
function invalidate(){
  ++run;controller?.abort();switches();clearAudit();
  by('status').textContent='Параметры изменились. Нажмите «Построить кольцо».';
}
function randomBetween(min,max,step){
  return +(min+Math.floor(Math.random()*(Math.round((max-min)/step)+1))*step).toFixed(2);
}
function nextSeed(previous){
  const seed=crypto.getRandomValues(new Uint32Array(1))[0] || 1;
  return seed===previous ? (seed%0xffffffff)+1 : seed;
}
function randomize(){
  const p=params(),choices=Object.keys(templates).filter(t=>t!==p.template);
  p.template=choices[Math.floor(Math.random()*choices.length)];
  if(p.template==='freeform')p.seed=nextSeed(p.seed);
  p.width=randomBetween(2.4,6.4,.1);p.thickness=randomBetween(1.5,2.45,.05);
  p.stone=randomBetween(3.75,5.75,.25);p.character=randomBetween(1,5,1);p.lobes=randomBetween(1,4,1);
  p.finish=['white','rose','champagne'][randomBetween(0,2,1)];write(p);
}
function qaRows(state){
  const q=state.qa;
  return [['Сплав и порог толщины',alloys[state.p.alloy][0]+' · '+fmt(q.threshold)+' мм'],
    ['Красные / предупреждения',q.red+' / '+q.warning],['Грани с замером / всего',q.measured+' / '+q.faces],
    ['Без встречного замера',q.missing],['Минимальная измеренная хорда',q.min>0?fmt(q.min,3)+' мм':'—'],
    ['Открытые / неманифолдные / несогласованные рёбра',[q.open,q.nonmanifold,q.inconsistent].join(' / ')],
    ...(state.nominal?[['Минимальная хорда до компенсации',state.nominal.min>0?fmt(state.nominal.min,3)+' мм':'—'],
      ['Номинал до компенсации',state.nominal.pass?'Прошёл проверку':state.nominal.detail]]:[])];
}
function renderAudit(state){
  const {qa}=state;
  by('quality').textContent=qa.pass?'STL прошёл цифровую проверку сетки и измеренных толщин.':'Вариант требует доработки. '+qa.detail;
  const table=document.createElement('table');
  for(const [k,v] of qaRows(state)){
    const row=table.insertRow(),th=document.createElement('th');th.scope='row';th.textContent=k;row.append(th);row.insertCell().textContent=String(v);
  }
  by('measures').replaceChildren(table);controls(true,qa.pass);
}
async function build(mode='manual'){
  const isRandom=mode==='random', newContour=mode==='contour';
  if(newContour){by('template').value='freeform';by('seed').value=nextSeed(by('seed').valueAsNumber);switches();}
  if(!form.reportValidity())return;
  const id=++run;controller?.abort();controller=new AbortController();
  try{
    clearAudit();
    const attempts=isRandom||newContour?6:1;
    for(let attempt=1;attempt<=attempts;attempt++){
      if(isRandom)randomize();
      if(newContour && attempt>1)by('seed').value=nextSeed(by('seed').valueAsNumber);
      const p=params(),metal=alloys[p.alloy];
      const mesh=hasStone(p.template)?buildSolitaire(p):buildRing(p);
      viewer.update(mesh,p.finish);
      by('model-name').textContent=templates[p.template];
      by('out-size').textContent=fmt(p.diameter)+' мм';
      by('volume').textContent=fmt(mesh.volume,1)+' мм³';
      by('mass').textContent=fmt(mesh.volume*metal[1]/1000)+' г';
      by('status').textContent=isRandom?'Подбираем дизайн и проверяем STL · вариант '+attempt:'Кольцо построено. Измеряем толщины и проверяем сетку…';
      const buffer=binarySTL(mesh);
      const qa=await inspectSTL(buffer,p.alloy,{signal:controller.signal});
      if(id!==run)return;
      let nominal=null;
      if(p.shrink>0){
        nominal=await inspectSTL(binarySTL({...mesh,factor:1}),p.alloy,{signal:controller.signal});
        if(id!==run)return;
        if(!nominal.pass){qa.pass=false;qa.detail=[qa.detail,'До компенсации усадки: '+nominal.detail].filter(Boolean).join(' · ');}
      }
      if(!qa.pass&&attempt<attempts)continue;
      current={p,mesh,buffer,qa,nominal};renderAudit(current);
      by('status').textContent=qa.pass?'Проверка завершена. Можно скачать STL.':'Проверка выявила замечания. Измените параметры или выберите другой дизайн.';
      history.replaceState(null,'',urlFor(p));return;
    }
  }catch(error){
    if(id!==run)return;
    clearAudit();by('status').textContent='Не удалось завершить построение. '+error.message;
  }
}
function save(blob,name){
  const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
const stem=p=>'RR-'+p.template+(p.template==='freeform'?'-'+p.seed+'-C'+p.character:'')+'-D'+p.diameter+'-W'+p.width+'-T'+p.thickness+'-S'+p.shrink;
by('stl').onclick=()=>{if(current?.qa.pass)save(new Blob([current.buffer],{type:'application/octet-stream'}),stem(current.p)+'.stl');};
by('share').onclick=async()=>{
  if(!current)return;const url=urlFor(current.p).href;
  try{await navigator.clipboard.writeText(url);by('feedback').textContent='Ссылка на этот вариант скопирована.';}
  catch{const field=document.createElement('input');field.type='text';field.readOnly=true;field.value=url;field.setAttribute('aria-label','Ссылка на дизайн');by('feedback').replaceChildren(field);field.select();}
};
by('passport').onclick=()=>{
  if(!current)return;const {p,mesh,qa}=current;const [name,density]=alloys[p.alloy];
  const lines=['R&R Design · '+templates[p.template],urlFor(p).href,'Номинальный диаметр '+p.diameter+' мм. Ширина шинки '+p.width+' мм. Толщина '+p.thickness+' мм.',
    hasStone(p.template)?(p.template==='oval'?'Овал '+fmt(p.stone)+' × '+fmt(p.stone*1.4):'Номинальный камень Ø '+p.stone)+' мм. В STL входит металл.':'Выраженность профиля '+p.character+(p.template==='wave'?', волн '+p.lobes:p.template==='freeform'?', номер формы '+p.seed:''),
    'Линейная усадка '+p.shrink+' %. Коэффициент STL '+fmt(mesh.factor,6)+'. Диаметр в печатной модели '+fmt(p.diameter*mesh.factor,3)+' мм.',
    'Номинальный объём '+fmt(mesh.volume,3)+' мм³. Расчётная масса металла '+fmt(mesh.volume*density/1000,3)+' г при '+name+' и плотности '+density+' г/см³.',
    'Объём увеличенной печатной модели '+fmt(mesh.volume*mesh.factor**3,3)+' мм³.',
    qa.pass?'STL прошёл цифровую проверку.':'Вариант требует доработки. '+qa.detail,...qaRows(current).map(([k,v])=>k+' — '+v),
    'Толщины измерены на экспортируемой сетке. Согласуйте с литейкой сплав, компенсацию и припуски на обработку.'];
  save(new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/plain;charset=utf-8'}),stem(p)+'-passport.txt');
};
by('inspect').onclick=async()=>{
  if(!current)return;
  const {p,buffer}=current;
  try{
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(new Blob([buffer]));});
    sessionStorage.setItem('rr-config-preview',JSON.stringify({data,name:stem(p)+'.stl'}));
    location.assign('../check/?source=configurator&profile=strict&alloy='+p.alloy);
  }catch{by('feedback').textContent='Хранилище браузера недоступно. Для прошедшей проверку модели скачайте STL и откройте его в разделе «Проверить STL».';}
};
form.addEventListener('input',invalidate);
form.addEventListener('submit',e=>{e.preventDefault();build();});
by('random').onclick=()=>build('random');by('new-contour').onclick=()=>build('contour');by('reset').onclick=()=>viewer.reset();
restore();build();
