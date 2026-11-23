import {txt, line, arrow, stone, num} from './visual-ink.js';

const gold = '#cba563', brown = '#755935', white = '#d4dedb', steel = '#69807a';
const ink = '#263e35', accent = '#164e42', red = '#9b493d', paper = '#faf8f0', faint = '#83978e';
const label = (x,y,s,opts={}) => txt(x,y,s,{size:15,anchor:'start',color:ink,...opts});
const sub = (x,y,s,opts={}) => label(x,y,s,{size:13,color:'#52665b',...opts});
const circle = (x,y,r,fill,stroke=ink,sw=1.5) => '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const path = (d,fill,stroke=ink,sw=1.5) => '<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-linejoin="round" stroke-linecap="round"/>';
const rect = (x,y,w,h,r,fill,stroke=ink) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.5"/>';
const leader = (points,x,y,s,opts={}) => path(points,'none',opts.color||faint,1.2)+label(x,y,s,opts);
const axis = (x1,y1,x2,y2) => line(x1,y1,x2,y2,faint,'5 4');
const step = (label,caption,draw) => ({label,caption,draw});

function heightMark(x,top,base,text,side) {
  const direction = side==='left'?-1:1;
  return line(x,top,x,base,accent)+line(x-6,top,x+6,top,accent)+line(x-6,base,x+6,base,accent)
    +label(x+direction*9,(top+base)/2+5,text,{anchor:direction===1?'start':'end',color:accent,weight:650});
}

// Profile of the basket, Z=0 at the skin. The gold back rail remains behind the stone.
function basket(stage) {
  const base=185, z=37, cap=base-3.37*z, table=base-3.53*z;
  const skin=rect(40,base,438,48,5,'#ead9c7','#d0c4b2');
  const back=path('M197 172 Q183 132 174 72 Q173 63 181 63 L195 64 Q200 116 223 157 L277 157 Q300 115 307 64 L320 63 Q329 64 325 76 Q313 136 301 172Z','#d6bb8d',brown);
  const gallery=path('M180 104 Q250 118 320 104 L317 117 Q250 133 183 117Z',gold,brown);
  const shell=path('M188 68 Q187 59 195 59 Q204 59 205 67 Q211 135 237 162 L264 162 Q289 128 294 66 Q295 59 302 59 Q311 60 309 71 Q307 130 280 171 L284 175 L284 184 L216 184 L216 175 L221 170 Q194 135 188 68Z',gold,brown);
  const stoneMarkup=stage===0?'':stone(250,table,4.50*z,2.53*z);
  // Show the internal optical path and the stone in all but the first assembly state.
  let picture=skin+rect(242,base,16,57,3,gold,brown)+axis(250,24,250,245)+back+gallery+stoneMarkup+shell;
  picture+=line(36,base,482,base,accent,'4 3')+sub(50,211,'плоскость мочки');
  if(stage===0) picture+=leader('M193 65 162 38 51 38',47,32,'Крапан')+
    leader('M294 116 345 113 470 113',351,105,'Пояс корзинки')+
    leader('M251 226 289 245 370 245',298,265,'Штифт');
  if(stage===1) picture+=leader('M192 91 151 71 35 71',37,63,'Рундист')+
    leader('M298 111 344 134 477 134',348,128,'Кольцевая опора')+
    sub(260,263,'Профиль через корзинку',{anchor:'middle'});
  if(stage===2) picture+=heightMark(116,cap,base,'3,37','left')+heightMark(380,table,base,'3,53','right')+
    sub(63,45,'Край металла')+sub(362,41,'Площадка')+
    sub(260,261,'Размеры от плоскости мочки, мм',{anchor:'middle'});
  return picture;
}

function threadMarks(x1,x2,y,half,pitch) {
  let marks='';
  for(let x=x1;x+pitch*.52<x2;x+=pitch) marks+=line(x,y+half-1,x+pitch*.52,y-half+1,brown);
  return marks;
}
function stem(stage) {
  const y=142,half=stage===0?14:12.6;
  let scene=path('M32 76 Q44 63 51 73 L81 123 L103 126 L103 158 L81 161 L51 209 Q44 218 32 205 L62 143Z',gold,brown);
  scene+=path('M101 '+(y-half)+' H426 L437 '+(y-half+4)+' V'+(y+half-4)+' L426 '+(y+half)+' H101Z',gold,brown);
  scene+=axis(80,y,458,y)+line(104,91,104,220,faint,'5 4');
  if(stage===0) {
    scene+=line(104,215,437,215,accent)+line(104,210,104,220,accent)+line(437,209,437,221,accent)
       +label(270,238,'Длина 9,80 мм',{anchor:'middle',color:accent})
       +leader('M227 129 246 90 381 90',252,81,'Ø 1,00 мм');
  } else if(stage===1) {
    // Magnified transverse slice makes the 0.05 mm radial allowance visible on a phone.
    scene+=circle(359,67,42,'#e9c69c',brown)+circle(359,67,37.8,gold,accent)
      +leader('M322 52 286 31 132 31',132,23,'Припуск на сторону')+
      label(137,57,'0,05 мм',{color:accent,weight:650})+sub(409,74,'торец')
      +leader('M215 154 232 193 382 193',244,216,'Готовый Ø 0,90 мм');
  } else {
    scene+=threadMarks(297,429,y,half,12)+leader('M426 139 453 93 466 93',478,83,'Заходная фаска',{anchor:'end'})
       +line(298,201,437,201,accent)+line(298,196,298,206,accent)+line(437,196,437,206,accent)
       +label(365,225,'Около 4 мм',{anchor:'middle',color:accent})+sub(83,260,'Резьбовой участок расположен у свободного конца.');
  }
  return scene;
}

function nutSide(cx,y,phase) {
  // The shaft is visible through a schematic longitudinal cut through the fixing nut.
  const left=cx-41,right=cx+41;
  const upper = path('M'+left+' '+(y-12)+' v-25 q0-7 8-8 l13-2 q8-2 10 5 l3 9 h13 l5-14 q2-5 7-5 l14 2 q9 1 9 9 v29Z',white,steel);
  const lower = path('M'+left+' '+(y+12)+' v25 q0 7 8 8 l13 2 q8 2 10-5 l3-9 h13 l5 14 q2 5 7 5 l14-2 q9-1 9-9 v-29Z',white,steel);
  // A moving witness mark on the cylindrical surface encodes angular position.
  const mark=cx+Math.sin(phase)*26;
  return upper+lower+line(left,y-13,right,y-13,steel)+line(left,y+13,right,y+13,steel)
     +circle(mark,y-27,3.5,accent,accent);
}
function nutFace(turns) {
  return '<g transform="translate(427 61) rotate('+(-turns*360)+')">'+
    path('M-17-21 Q-29-40-36-24 Q-41-12-22-1 C-23 14-18 21-9 24 Q4 27 12 19 Q28 40 36 26 Q42 13 22 1 C24-17 14-24 0-24Z',white,steel)+
    circle(0,0,10,paper,steel)+circle(24,22,3,accent,accent)+'</g>';
}
function threadDiagram(turns,stage) {
  const travel=Number(turns)*.35,cx=396-Number(turns)*11.9,y=154;
  let drawing=path('M35 113 48 114 74 143 H93 V165 H74 L49 193 36 193 55 154Z',gold,brown)+
    path('M90 142 H420 L429 148 V160 L420 166 H90Z',gold,brown)+
    threadMarks(251,426,y,12,11.9)+axis(70,y,462,y)+nutSide(cx,y,turns*Math.PI*2)+nutFace(turns);
  if(stage===0) drawing+=sub(34,46,'На торце гайки')+label(34,72,'Один оборот = 0,35 мм',{color:accent,weight:650});
  else if(stage===1) drawing+=circle(61,53,30,white,steel)+circle(61,53,12,paper,steel)+axis(28,53,94,53)+
    sub(110,43,'Канал литой гайки')+label(110,70,'Пилот Ø 0,60 мм',{color:accent,weight:650});
  else drawing+=path('M23 66 41 37 57 37 74 66 87 66 104 37 119 37 137 66Z',gold,brown)+
    path('M23 21H137V47L125 28H101L85 56H76L60 28H38L23 51Z',white,steel)+
    sub(149,45,'По средним диаметрам')+label(149,73,'На сторону 0,020 мм',{color:accent,weight:650});
  drawing+=line(396,214,396,242,faint,'3 3')+line(cx,210,cx,234,accent);
  if(turns>0) drawing+=arrow(396,227,cx,227,accent);
  drawing+=label(260,265,'Осевой ход '+num(travel,2)+' мм',{anchor:'middle',weight:650,color:accent});
  return drawing;
}

function pendulum(angle,stage) {
  const cx=148,cy=132;
  const outer=path('M144 28 Q159 10 165 26 L179 118 Q182 134 178 151 L159 247 Q150 264 143 247 L124 149 Q120 132 125 109Z',white,steel);
  const inlay=path('M149 38 Q154 27 156 38 L161 123 155 230 Q153 237 150 229 L143 138Z',gold,brown);
  let fig=outer+inlay+axis(cx,19,cx,257);
  fig+='<g transform="rotate('+(-Number(angle))+' '+cx+' '+cy+')">'+
     path('M144 44 Q150 35 154 45 L153 126 159 212 Q154 228 144 218 L142 139Z','#9aada5',steel)+
     circle(149,43,10,'#fbf6df','#9c977b')+stone(150,203,25,22)+'</g>';
  fig+=circle(cx,cy,8,white,steel)+circle(cx,cy,4,gold,brown)+sub(34,272,'Вид спереди');
  if(stage===0) {
    fig+=path('M116 238 Q148 251 181 238','none',accent)+line(114,233,117,244,accent)+line(183,233,180,244,accent)
      +sub(270,75,'Угол относительно вертикали')+
      label(270,112,(angle>0?'+':'')+num(angle,0)+'°',{size:27,color:accent,weight:650})+
      label(270,166,'Рабочий ход ±16°')+sub(270,200,'Жемчуг и аквамарин')+sub(270,220,'вращаются вокруг общей оси.');
  } else if(stage===1) {
    const mx=357,my=123;
    fig+=line(159,cy,267,my,faint,'4 4')+circle(mx,my,63,white,steel)+circle(mx,my,48,paper,steel)+circle(mx,my,42,gold,brown)
     +axis(mx-64,my,mx+64,my)+axis(mx,my-67,mx,my+66)+sub(278,34,'Сечение поперёк оси')
     +sub(255,222,'Ось Ø 0,70   ·   втулка Ø 0,80 мм')+label(255,247,'На сторону 0,05 мм',{color:accent,weight:650});
  } else {
    fig+=sub(264,36,'Сечение вдоль оси')+
      rect(263,73,26,114,3,white,steel)+rect(425,73,26,114,3,white,steel)+
      rect(314,81,86,98,6,'#92a9a1',steel)+rect(260,119,194,22,4,gold,brown)+
      axis(252,130,464,130)+line(289,208,314,208,accent)+line(289,202,289,214,accent)+line(314,202,314,214,accent)+
      leader('M302 208 330 226 449 226',317,247,'Осевой зазор')+
      sub(259,269,'Просвет рычаг–рама ≈ 0,16 мм');
  }
  return fig;
}

function assembly(gap,stage) {
  // Paired section normal to the mating planes. The diagram expands axial displacement for clarity.
  const upperY=stage===1?136:117,lowerY=upperY+gap*14,barLeft=66,barRight=354;
  let s=axis(125,45,125,244)+axis(296,45,296,244);
  const matingBody='<g transform="translate(0 '+(lowerY-187)+')">'+path('M66 187 H112 V213 Q112 216 116 216 H134 Q138 216 138 213 V187 H281 V213 Q281 216 285 216 H307 Q311 216 311 213 V187 H354 L350 211 Q348 230 329 234 H91 Q72 232 68 213Z',gold,brown)+'</g>';
  const pinnedBody=path('M66 '+upperY+' Q66 '+(upperY-28)+' 88 '+(upperY-34)+' Q209 '+(upperY-52)+' 336 '+(upperY-33)+' Q354 '+(upperY-30)+' 354 '+upperY+' H307 V'+(upperY+24)+' L304 '+(upperY+26)+' H288 L285 '+(upperY+24)+' V'+upperY+' H136 V'+(upperY+24)+' L133 '+(upperY+26)+' H117 L114 '+(upperY+24)+' V'+upperY+'Z',white,steel);
  s+=matingBody+pinnedBody;
  if(gap>0) s+=line(barRight+16,upperY,barRight+16,lowerY,accent)+line(barRight+10,upperY,barRight+22,upperY,accent)+line(barRight+10,lowerY,barRight+22,lowerY,accent);
  s+=label(384,(upperY+lowerY)/2,num(gap,1)+' мм',{color:accent,weight:650,size:17});
  if(stage===0) s+=sub(barLeft,40,'Белый сплав · штифты')+sub(barLeft,265,'Сплав шампань · гнёзда');
  else if(stage===1) {
    s+=sub(58,31,'Вид гнёзд со стороны стыка')+circle(125,62,14.35,gold,brown)+circle(125,62,12.25,white,steel)+
       rect(279.2,47.65,33.6,28.7,14.3,gold,brown)+circle(296,62,12.25,white,steel)+
       sub(54,265,'Круглое Ø 0,82')+sub(254,265,'Овальное 0,96 × 0,82 мм');
  } else s+=sub(56,37,'Упор по плоским площадкам')+line(75,lowerY,104,lowerY,accent)+line(157,lowerY,271,lowerY,accent)+
       sub(58,264,'Запас до дна гнезда при стыковке 0,12 мм');
  return s;
}

export const mechanismVisuals={
  stud:{title:'От мочки до площадки камня',steps:[
    step('Металл','Посмотри на корзинку сбоку. Крапан поднимается от основания, а штифт выходит с обратной стороны.',()=>basket(0)),
    step('Посадка','Павильон входит внутрь корзинки. Зелёный пунктир задаёт уровень прилегания серьги к мочке.',()=>basket(1)),
    step('Две высоты','От одной плоскости получаются две высоты. Выбери нужную поверхность для замера.',()=>basket(2))
  ]},
  post:{title:'Как гладкий штифт становится винтом',steps:[
    step('После литья','На общей оси с корзинкой отливают гладкую заготовку.',()=>stem(0)),
    step('Припуск','Сравни два контура на увеличенном торце. С каждой стороны снимают номинально 0,05 мм.',()=>stem(1)),
    step('После обработки','У свободного конца формируют заход и рабочую резьбу. Длина штифта отсчитывается от мочки.',()=>stem(2))
  ]},
  thread:{title:'Поверни гайку и проследи за ходом',control:{label:'Обороты гайки',min:0,max:10,step:.25,start:0,unit:'об.'},steps:[
    step('Ход','Двигай ползунок. Точка на торце показывает поворот, а внизу отмечено смещение от исходной позиции.',v=>threadDiagram(v,0)),
    step('Заготовка','Гладкий канал центрирует инструмент. На движущейся схеме показана пара после нарезки.',v=>threadDiagram(v,1)),
    step('Посадка','Расчёт ведут по средним диаметрам профиля. Подбор пары и плавность хода проверяют на готовых деталях.',v=>threadDiagram(v,2))
  ]},
  pivot:{title:'Куда движется рычаг и где остаётся воздух',control:{label:'Отклонение рычага',min:-16,max:16,step:1,start:0,unit:'°'},steps:[
    step('Качание','Сдвинь рычаг влево и вправо. Нижняя вставка и верхняя жемчужина идут в противоположных направлениях.',v=>pendulum(v,0)),
    step('Ось и втулка','Кольцо воздуха между осью и отверстием видно на увеличенном сечении. Разность диаметров делят пополам.',v=>pendulum(v,1)),
    step('Торцы и рама','Осевой люфт проверяют вдоль штифта. Просвет между рычагом и рамой измеряют отдельно по ходу маятника.',v=>pendulum(v,2))
  ]},
  joint:{title:'Сведи две детали до контакта площадок',control:{label:'Раздвижка деталей',min:0,max:5,step:.1,start:3,unit:'мм'},steps:[
    step('Сборка','Сведи раздвижку к нулю. Штифты входят в гнёзда, затем площадки двух сплавов смыкаются.',v=>assembly(v,0)),
    step('Два гнезда','Круглое гнездо центрирует первый штифт. Продолговатое допускает небольшое отклонение вдоль своей длины.',v=>assembly(v,1)),
    step('Глубина','При сомкнутых площадках между торцом штифта и дном гнезда остаётся технологический запас.',v=>assembly(v,2))
  ]}
};
