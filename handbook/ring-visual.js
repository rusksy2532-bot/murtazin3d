import {txt, line, arrow, stone, num} from './visual-ink.js';

// The drawings isolate individual construction principles. Dimension labels refer
// to the Ring17 release; arrows marked as comparisons illustrate modified designs.
const gold = '#cba563', edge = '#745a37', teal = '#164e42', ice = '#b6d9de';
const graphite = '#354b44', rust = '#9b493d';
const inscription = (x,y,s,anchor='middle',size=17,color=graphite) =>
  txt(x,y,s,{anchor,size,color,weight:550});
const shape = (d,fill=gold,stroke=edge,width=1.8) =>
  '<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';
const circle = (x,y,r,fill,stroke,width=1.8) =>
  '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
function leader(x,y,elbowX,endX,endY,label,anchor='start') {
  return shape('M'+x+' '+y+' L'+elbowX+' '+endY+' H'+endX,'none',teal,1.5)
    + circle(x,y,3,teal,'none')
    + inscription(endX+(anchor==='start'?5:-5),endY+5,label,anchor,17,teal);
}
function measureX(x1,x2,y,fromY,label) {
  const inset=Math.min(7,(x2-x1)*.24),offset=y<fromY?-4:4;
  return line(x1,fromY,x1,y+offset,teal)+line(x2,fromY,x2,y+offset,teal)
    + line(x1,y,x2,y,teal)
    + shape('M'+x1+' '+y+' l'+inset+' -3 v6Z M'+x2+' '+y+' l-'+inset+' -3 v6Z',teal,'none')
    + inscription((x1+x2)/2,y+(y<fromY?-8:21),label,'middle',18,teal);
}
function measureY(y1,y2,x,fromX,label) {
  const side=x<fromX?-1:1;
  return line(fromX,y1,x+4*side,y1,teal)+line(fromX,y2,x+4*side,y2,teal)
    +line(x,y1,x,y2,teal)
    +shape('M'+x+' '+y1+' l-3 7 h6Z M'+x+' '+y2+' l-3 -7 h6Z',teal,'none')
    +inscription(x+8*side,(y1+y2)/2+5,label,side===1?'start':'end',17,teal);
}
function roundView(cx,cy,r){
  const points=(f,phase)=>Array.from({length:8},(_,i)=>{
    const a=Math.PI*i/4+phase;
    return [cx+r*f*Math.cos(a),cy+r*f*Math.sin(a)];
  });
  const outer=points(.98,Math.PI/8), table=points(.52,0);
  let drawing=circle(cx,cy,r,ice,'#47727a');
  for(let i=0;i<8;i++){
    const a=outer[i], b=table[i], c=table[(i+1)%8];
    drawing+=shape('M'+a+' L'+b+' '+c+'Z',i%2?'#e9f6f5':'#9fc6cf','#69939b',.8);
  }
  return drawing+shape('M'+table.join(' L')+'Z','#f4fbfa','#5b8790',1);
}
function frontRing(stage) {
  const cx=224,cy=155;
  let drawing=circle(cx,cy,80,'none',stage===0?teal:edge,16)
    +circle(cx,cy,80,'none',stage===0?'#80ae9e':gold,12);
  for(const side of [-1,1]){
    drawing+=shape(side<0?'M147 132 Q164 83 205 75':'M243 75 Q285 87 302 132','none',stage===1?teal:edge,21);
    drawing+=shape(side<0?'M147 132 Q164 83 205 75':'M243 75 Q285 87 302 132','none',stage===1?'#83afa2':gold,17);
    for (let i=0;i<6;i++){
      const a=(18+i*8.5)*Math.PI/180;
      const x=cx+side*84*Math.sin(a),y=cy-84*Math.cos(a);
      drawing+=circle(x,y,4.1,ice,'#617e84',.85);
    }
  }
  drawing+=stone(cx,29,76,45)
    +shape('M181 43 Q183 39 187 44 L205 75 Q224 86 243 75 L261 44 Q265 39 267 43 L250 81 Q225 96 198 81Z',stage===2?'#79a99a':gold,stage===2?teal:edge)
    +shape('M190 56 Q224 70 258 56','none',stage===2?teal:edge,4);
  if(stage===0) return drawing+leader(221,237,278,344,218,'Шинка');
  if(stage===1) return drawing+leader(294,117,326,356,103,'Плечо')+leader(155,117,125,81,103,'Плечо','end');
  return drawing+leader(249,73,299,323,60,'Каст')+leader(227,32,263,312,22,'Вставка');
}
function shankDiagram(section){
  if(!section) return circle(242,139,97,'none',edge,19)+circle(242,139,97,'none',gold,15)
    +measureX(154.5,329.5,140,133,'')
    +inscription(242,127,'Ø 17,0 мм','middle',21,teal)
    +shape('M215 240 H268 M218 233 v14 M265 233 v14','none',teal,2)
    +leader(267,240,310,327,233,'Низ шинки');
  return shape('M175 76 Q160 76 156 89 V170 Q159 182 175 185 H298 Q312 184 315 170 V88 Q312 76 298 76Z')
    +shape('M178 82 H293 M170 176 H302','none','#f4ddac',2)
    +measureX(156,315,219,179,'2,05 мм')
    +measureY(76,185,356,294,'1,44 мм')
    +inscription(235,55,'К пальцу','middle',16);
}
function gemSide(stage) {
  const cx=215,top=65,width=184,height=112;
  // Outline heights follow the actual crown/girdle/pavilion proportions.
  const left=cx-width/2,right=cx+width/2,girdle=97;
  let s=shape('M123 97 L159 65 H271 L307 97 V101 L215 177 123 101Z',ice,'#426a74');
  s+=shape('M123 97 159 65 173 97Z M173 97 215 65 257 97Z M257 97 271 65 307 97Z','#ddecf0','#678f99',1);
  s+=shape('M123 101 215 177 173 101Z M257 101 215 177 307 101Z','#93bcc6','#648b95',1.2)
    +line(left,girdle,right,girdle,'#65868c')+line(left,101,right,101,'#65868c');
  if(stage===0) return s+shape('M159 65 H271','none',teal,4)
    +leader(251,65,298,338,42,'Площадка')+leader(273,86,316,338,104,'Корона');
  if(stage===1) return s+shape('M123 99 H307','none',teal,4)+measureX(left,right,208,102,'Ø 5,00 мм')
    +leader(306,99,337,359,83,'Рундист');
  return s+leader(262,139,306,347,138,'Павильон')+leader(215,177,274,347,211,'Шип')
    +measureY(top,top+height,103,153,'3,05 мм');
}
function prongsDiagram(stage) {
  const left=stage===2?'M138 223 L148 157 Q152 139 165 130 L179 123':'M138 223 L148 141 L145 114';
  const right=stage===2?'M382 223 L372 157 Q368 139 355 130 L341 123':'M382 223 L372 141 L375 114';
  let s=shape('M127 218 Q260 238 393 218 L391 238 Q260 259 130 239Z')
    +shape('M142 171 Q160 165 171 156 H184 L179 166 Q163 172 149 187Z')
    +shape('M378 171 Q360 165 349 156 H336 L341 166 Q357 172 371 187Z');
  const lift=stage===0?72:0;
  s+=stone(260,107-lift,197,109)+shape(left,'none',edge,15)+shape(right,'none',edge,15)
    +shape(left,'none',gold,11)+shape(right,'none',gold,11);
  if(stage===0) return s+arrow(259,151,259,184,teal)+inscription(72,65,'Ввод сверху','middle',16,teal);
  if(stage===1) return s+leader(143,115,108,88,91,'Лапка','end')+leader(176,158,121,91,190,'Опора','end');
  return s+leader(179,123,135,86,72,'Обжим','end')+leader(342,123,390,415,78,'Обжим');
}
function paveDiagram(stage,diameter=1.25){
  const d=Number(diameter), step=1.45, scale=82, r=d*scale/2, cx0=140;
  const centers=[cx0,cx0+step*scale,cx0+2*step*scale];
  let s=shape('M46 93 Q48 81 68 81 H451 Q474 81 474 102 V191 Q474 206 451 206 H67 Q46 206 46 189Z');
  centers.forEach(cx=>{s+=roundView(cx,143,r);});
  if(stage===0) return s+measureX(cx0-r,cx0+r,59,140,'Ø '+num(d,2)+' мм');
  if(stage===1) {
    centers.slice(0,2).forEach(cx=>{s+=line(cx,143,cx,55,teal,'4 4')+circle(cx,143,3,teal,'none');});
    return s+measureX(cx0,centers[1],53,65,'Шаг 1,45 мм');
  }
  const x1=cx0+r,x2=centers[1]-r;
  return s+shape('M'+x1+' 138 H'+x2+' V149 H'+x1+'Z','#6ea992','none')
    +line(x1,145,x1,224,teal)+line(x2,145,x2,224,teal)
    +line(x1,219,x2,219,teal)+leader((x1+x2)/2,219,233,251,246,'Зазор '+num(step-d,2)+' мм');
}
function beadsDiagram(stage) {
  // Side elevation and surface view are intentionally separate to expose the grain.
  if(stage===0) {
    let s=shape('M60 69 H448 V215 H60Z');
    [130,255,380].forEach(cx=>{s+=roundView(cx,142,54);});
    const beads=[[192,94],[192,190],[318,94],[318,190]];
    for(const [x,y] of beads) s+=circle(x,y,18,'#f0cb86',edge)+circle(x-5,y-5,4,'#fff0c1','none');
    return s+leader(192,94,204,218,42,'Корнер Ø 0,52 мм');
  }
  if(stage===1) {
    const centers=[132,259,386];
    let s=shape('M60 210 V139 H96 L132 173 168 139 H176 L195 163 215 139 H223 L259 173 295 139 H303 L322 163 342 139 H350 L386 173 422 139 H458 V210Z')
      +shape('M70 203 H448','none','#f2dba8',2);
    for(const cx of centers) s+=stone(cx,107,94,61);
    return s+leader(322,163,352,372,238,'V-подрез')
      +leader(214,139,224,245,64,'Кромка плеча');
  }
  let s=shape('M79 100 H278 L261 191 H79 V171 L172 146 79 121Z')
    +shape('M362 100 H438 V191 H378Z');
  s+=stone(320,71,110,64)
    +leader(306,159,317,337,226,'Ажур')
    +leader(154,144,118,96,60,'Подрез','end')
    +measureX(172,270,146,143,'');
  return s+inscription(219,132,'Перемычка','middle',15,teal);
}
function windowDiagram(taper) {
  const scale=97, pitch=1.45*scale, radius=scale/2, exit=taper ? .756 : 1.0;
  const left=189,right=left+pitch, out=exit*scale/2;
  let path='M67 113 H453 V202 H67Z';
  for(const x of [left,right]) path+='M'+(x-radius)+' 113 L'+(x-out)+' 202 H'+(x+out)+' L'+(x+radius)+' 113Z';
  const section='<path d="'+path+'" fill="'+gold+'" fill-rule="evenodd" stroke="'+edge+'" stroke-width="1.8"/>';
  const s=section+stone(left,76,1.25*scale,69)+stone(right,76,1.25*scale,69);
  const upperLeft=left+radius,upperRight=right-radius;
  return s+measureX(upperLeft,upperRight,50,111,'0,45 мм')
    +measureX(left+out,right-out,237,205,taper?'≈ 0,70 мм':'0,45 мм')
    +inscription(76,262,taper?'Выход Ø 0,756':'Выход Ø 1,00','start',16);
}
function pocketDiagram(stage) {
  const solid='M126 108 Q126 98 137 98 H352 Q365 98 365 110 V195 Q365 205 353 205 H138 Q126 205 126 193Z';
  const pocket='M126 108 Q126 98 137 98 H352 Q365 98 365 110 V195 Q365 205 353 205 H320 V162 Q320 149 303 149 H192 Q176 149 176 162 V205 H138 Q126 205 126 193Z';
  let s=shape(stage===0?solid:pocket);
  if(stage===0) return s+shape('M176 205 V162 Q176 149 192 149 H303 Q320 149 320 162 V205','none',rust,2)
    +leader(248,149,271,316,59,'Контур выборки');
  if(stage===1) return s+arrow(246,244,246,165,teal)+inscription(246,265,'Вход с внутренней стороны','middle',17,teal);
  return s+measureY(98,149,397,300,'0,86 мм')+measureX(126,176,237,204,'0,79 мм')
    +inscription(245,66,'Наружная поверхность','middle',17);
}
const step = (label,caption,draw)=>({label,caption,draw});
export const ringVisuals = {
  anatomy:{title:'От пальца до центрального камня',steps:[
    step('Шинка','Зелёным выделен обод, который охватывает палец.',()=>frontRing(0)),
    step('Плечи','Обе стороны обода подходят к центральной оправе. Здесь проходят дорожки паве.',()=>frontRing(1)),
    step('Каст','Стойки и поперечные пояса образуют открытую оправу центральной вставки.',()=>frontRing(2))]},
  shank:{title:'Три разных размера шинки',steps:[
    step('Внутренний Ø','Размер 17 снимают между противоположными точками внутренней поверхности.',()=>shankDiagram(false)),
    step('Срез внизу','Поверни мысленный срез поперёк обода. Ширина идёт вдоль пальца, толщина — от пальца наружу.',()=>shankDiagram(true))]},
  stone:{title:'Огранка в профиль',steps:[
    step('Сверху','Площадка — верхняя плоская грань. От неё наклонные грани короны спускаются к поясу.',()=>gemSide(0)),
    step('По поясу','Рундист обходит самую широкую часть вставки. Здесь у центрального камня Ø 5,00 мм.',()=>gemSide(1)),
    step('Снизу','Павильон опускается к шипу. Один диаметр ещё не задаёт глубину посадки.',()=>gemSide(2))]},
  prongs:{title:'Как устанавливают и закрепляют камень',steps:[
    step('Опустить','Открытые концы оставляют место для входа сверху. Показан профиль двух из четырёх лапок.',()=>prongsDiagram(0)),
    step('Посадить','Камень занимает рабочее положение. Металл лапок остаётся выше рундиста для закрепщика.',()=>prongsDiagram(1)),
    step('Обжать','Условное положение после ручной закрепки. Концы подходят к короне. Литейный файл соответствует открытой стадии.',()=>prongsDiagram(2))]},
  pave:{title:'Диаметр, шаг и просвет',control:{label:'Диаметр мелкого камня',min:1.20,max:1.35,step:.01,start:1.25,unit:'мм'},steps:[
    step('Диаметр','Меняй диаметр. Центры стоят на прежних местах, а края камней движутся.',v=>paveDiagram(0,v)),
    step('Шаг центров','Отмечены центры двух соседних камней. Шаг сохраняется при изменении диаметра.',v=>paveDiagram(1,v)),
    step('Просвет','Зазор равен шагу минус диаметр. При Ø 1,30 мм остаётся 0,15 мм. Расчёт для плоского плеча с параллельными осями.',v=>paveDiagram(2,v))]},
  beads:{title:'Что удерживает мелкую вставку',steps:[
    step('Сверху','Между круглыми вставками видны выступы металла. После закрепки мастер формирует из них зёрна.',()=>beadsDiagram(0)),
    step('Сбоку','Треугольные подрезы показаны в профиль. Сверху остаётся металл для закрепки.',()=>beadsDiagram(1)),
    step('У основания','Рядом с подрезом сохраняют перемычку. В контрольном сечении Ring17 от ажура до подреза измерено от 0,482 мм.',()=>beadsDiagram(2))]},
  windows:{title:'Два отверстия в продольном разрезе',steps:[
    step('Прямой канал','Сравнение. При двух цилиндрах Ø 1,00 мм и шаге 1,45 мм перемычка сохраняет ширину 0,45 мм до самого выхода.',()=>windowDiagram(false)),
    step('Конус Ring17','Вход остался прежним, выход сузился. По сечению модели на изнанке измерено от 0,698 мм между окнами.',()=>windowDiagram(true))]},
  relief:{title:'Что остаётся после выборки',steps:[
    step('До выборки','На полнотелом сечении показан будущий внутренний контур.',()=>pocketDiagram(0)),
    step('Вынуть металл','Углубление открыто со стороны пальца. Вдоль наружного контура сохраняется дно.',()=>pocketDiagram(1)),
    step('Измерить остаток','Проверяют дно и боковую стенку в разных направлениях. Значения для Ring17 округлены.',()=>pocketDiagram(2))]}
};
