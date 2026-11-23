import {ringVisuals} from './ring-visual.js';
import {mechanismVisuals} from './mechanism-visual.js';
import {processVisuals} from './process-visual.js';
export const plates = {...ringVisuals,...mechanismVisuals,...processVisuals};
const el=id=>document.getElementById(id);
// Each question points at two deliberately different drawings of the same feature.
const questions={
  anatomy:['Где выделены оба плеча кольца?',1,0],shank:['Где видно поперечное сечение обода?',1,0],
  stone:['Где выделен павильон?',2,0],prongs:['На каком рисунке камень уже обжат?',2,0],
  pave:['Где измеряют шаг между центрами?',1,2],beads:['Где показан вид дорожки сверху?',0,1],
  windows:['У какого ажура больше металла между отверстиями с изнанки?',1,0],relief:['Где показана проверка дна и боковой стенки?',2,0],
  stud:['Где сравниваются высоты металла и камня?',2,0],post:['Какой рисунок показывает припуск на обработку?',1,0],
  thread:['Где показано отверстие гайки до нарезки?',1,0],pivot:['Где радиальный зазор виден в торец?',1,0],
  joint:['Где можно сравнить форму двух гнёзд?',1,2],sizing:['Где целиком масштабировали кольцо вместе с камнем?',2,1],
  mass:['Где показана бо́льшая масса при одинаковом объёме?',2,0],audit:['Где измерительный луч задевает скос кромки?',1,2],
  insertion:['Где отмечено пересечение после прохода за посадку?',2,0],casting:['Где в форме видна пустая полость?',1,2],
  practice:['Какая пара отверстий оставляет больше металла у выхода?',2,1]
};
function quiz(id,plate){
  const [prompt,correct,alternative]=questions[id],out=el('test-result');
  el('test-prompt').textContent=prompt;out.textContent='';
  const options=[correct,alternative];if(Object.keys(questions).indexOf(id)%2===0)options.reverse();
  el('test-options').replaceChildren(...options.map((index,position)=>{
    const f=plate.steps[index],v=id==='sizing'?18:plate.control?.start??0;
    const b=document.createElement('button');b.type='button';
    const letter=position?'Б':'А';b.setAttribute('aria-label','Выбрать рисунок '+letter+' · '+f.label);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 520 285');svg.setAttribute('aria-hidden','true');svg.innerHTML=f.draw(v);
    const label=document.createElement('span');label.textContent='Рисунок '+letter;b.append(svg,label);
    b.addEventListener('click',()=>{
      el('test-options').querySelectorAll('button').forEach(other=>delete other.dataset.result);
      b.dataset.result=index===correct?'yes':'retry';
      out.textContent=index===correct?'Верно. '+(typeof f.caption==='function'?f.caption(v):f.caption):'Это «'+f.label+'». Сравни со вторым рисунком.';
    });
    return b;
  }));
}
export function visualPanel(onChange) {
  let plate, phase=0, value=0, lesson='', animation=0;
  const art=el('lesson-drawing'), rail=el('phase-list'), slider=el('visual-range');
  const modelSlider=el('model-range');
  const dialog=el('large-diagram'), panel=art.closest('.visual-plate'), home=panel.parentNode;
  function paint() {
    const frame=plate.steps[phase];
    art.innerHTML=frame.draw(value);
    el('visual-caption').textContent=typeof frame.caption==='function'?frame.caption(value):frame.caption;
    for(const [i,button] of Array.from(rail.children).entries()) button.setAttribute('aria-pressed',String(i===phase));
    const fixed=(lesson==='insertion' && phase===2) || frame.control===false;
    const coupled=['thread','pivot','joint','insertion'].includes(lesson);
    el('range-wrap').hidden=!plate.control||fixed;
    el('model-motion').hidden=!coupled||fixed;
    if(plate.control) {
      const str=value.toLocaleString('ru-RU')+' '+plate.control.unit;
      el('range-output').value=str;el('model-value').value=str;
      slider.value=value;modelSlider.value=value;
    }
    onChange(lesson,phase,value);
  }
  const play=el('play-visual');
  function stop(){
    cancelAnimationFrame(animation);animation=0;play.textContent='Запустить показ';play.setAttribute('aria-pressed','false');
  }
  play.addEventListener('click',()=>{
    if(animation){stop();return;}
    play.textContent='Остановить';play.setAttribute('aria-pressed','true');
    const c=plate.control, start=performance.now(),duration=c?5000:plate.steps.length*1400;
    if(c && lesson==='insertion' && phase===2)phase=0;
    const advance=now=>{
      const t=Math.min(1,(now-start)/duration);
      if(c){
        const f=lesson==='pivot'?(1+Math.sin(t*2*Math.PI))/2:lesson==='joint'?1-t:t;
        const raw=c.min+Math.round(f*(c.max-c.min)/c.step)*c.step;
        const next=Number(Math.min(c.max,Math.max(c.min,raw)).toFixed(4));
        if(next!==value || t===0){value=next;paint();}
      }else{
        const next=Math.min(plate.steps.length-1,Math.floor(t*plate.steps.length));
        if(next!==phase){phase=next;paint();}
      }
      if(t<1)animation=requestAnimationFrame(advance);else stop();
    };
    animation=requestAnimationFrame(advance);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  slider.addEventListener('input',()=>{stop();value=Number(slider.value);paint();});
  modelSlider.addEventListener('input',()=>{stop();value=Number(modelSlider.value);paint();});
  el('expand-drawing').addEventListener('click',()=>{
    el('large-title').textContent=plate.title;
    el('large-content').append(panel);dialog.showModal();
  });
  el('close-large').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{home.append(panel);el('expand-drawing').focus();});
  const show=(id,step=0)=>{
    stop();lesson=id;plate=plates[id];phase=Math.min(step,plate.steps.length-1);
    quiz(id,plate);
    el('visual-title').textContent=plate.title;
    rail.replaceChildren(...plate.steps.map((item,i)=>{
      const button=document.createElement('button');button.type='button';button.textContent=item.label;
      button.addEventListener('click',()=>{stop();phase=i;paint();});return button;
    }));
    const c=plate.control;el('range-wrap').hidden=!c;value=c?.start??0;
    if(c){for(const s of [slider,modelSlider])Object.assign(s,{min:c.min,max:c.max,step:c.step,value});el('range-label').textContent=c.label;el('model-range-label').textContent=c.label;}
    paint();
  };
  return {show,restore(){onChange(lesson,phase,value);}};
}
