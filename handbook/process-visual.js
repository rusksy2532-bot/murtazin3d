import {txt,line,dim,arrow,num} from './visual-ink.js';

const ink='#253e37', green='#256955', gold='#cba563', darkGold='#805f34',
  blue='#a9d4d8', slate='#526865', pale='#e2e8df', risk='#9b493d', paper='#f6f4ec';
const path=(d,fill='none',stroke=ink,width=2,extra='')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const circle=(x,y,r,fill,stroke=ink,width=2)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const rect=(x,y,w,h,fill,stroke='none',r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" rx="${r}"/>`;
const label=(x,y,s,color=ink,size=17)=>txt(x,y,s,{anchor:'middle',size,color,weight:550});
const rule=(x1,y1,x2,y2)=>line(x1,y1,x2,y2,'#9caaa1','4 4');
const mm=(n,d)=>num(Number(n),d);

function diamond(x,y,w,h) {
  const a=w/2,b=.52*a, top=y-.28*h,tip=y+.72*h;
  return path(`M${x-a},${y} L${x-b},${top} H${x+b} L${x+a},${y} ${x},${tip} Z`,blue,'#476869',1.8)
    +path(`M${x-a},${y} H${x+a} M${x-b},${top} L${x-.44*a},${y} ${x},${tip} ${x+.44*a},${y} ${x+b},${top} M${x-.44*a},${y} ${x},${top} ${x+.44*a},${y}`,'none','#699398',1.05);
}
function stoneFace(cx,cy,r,fill=blue){
  let facets='';
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4,b=a+Math.PI/8;
    facets+=`M${cx+r*Math.cos(a)},${cy+r*Math.sin(a)} L${cx+r*.57*Math.cos(b)},${cy+r*.57*Math.sin(b)} `;
    const b2=b+Math.PI/4;
    facets+=`L${cx+r*.57*Math.cos(b2)},${cy+r*.57*Math.sin(b2)} `;
  }
  return circle(cx,cy,r,fill,slate,1.6)+path(facets,'none',slate,1);
}
function halo(cx,cy,r){
  return circle(cx,cy,r+6,'none','#689382',1.4)
    +circle(cx,cy,r+10,'none','#bbcbbf',1);
}
function band(cx,cy,r,metal=gold) {
  return circle(cx,cy,r+5.5,'none',darkGold,12)+circle(cx,cy,r+5.5,'none',metal,9)
    +path(`M${cx-r*.46},${cy-r*.99} L${cx-22},${cy-r-20} H${cx+22} L${cx+r*.46},${cy-r*.99}`,metal,darkGold,1.5);
}
const sizeModes=['Шинка','Вставки','Общий масштаб'];
function sizingScene(mode,diameter){
  const size=Number(diameter),r=size*4.0,cx=130,cy=143;
  const factor=mode===2?size/17:1, changed=mode===2&&size!==17;
  const col=changed?risk:green;
  return rule(260,35,260,244)+band(cx,cy,r)+diamond(cx,cy-r-27,48,28)
    +dim(cx-r,cy+6,cx+r,cy+6,'Ø '+mm(size,0)+' мм')
    +label(cx,252,'Диаметр шинки')+label(385,35,'Вид на вставки')
    +stoneFace(365,112,38*factor)+stoneFace(433,115,9.5*factor)
    +dim(365-38*factor,170,365+38*factor,170,'Ø '+mm(5*factor,2))
    +label(432,200,'Ø '+mm(1.25*factor,2),col,15)
    +rule(433,128,433,178)
    +(mode===0?label(386,251,'Комплект камней',slate):mode===1?label(386,251,'Размеры сохранены',green):label(386,251,changed?'Посадки изменились':'Исходный размер',col))
    +(mode===1?halo(365,112,38*factor):'');
}
function massFrame(index){
  const vols=[10.36,13.15,15.55],density=vols[index],names=['Ag 925','Au 585','Au 750'];
  const weight=189.10*density/1000;
  const metal=['#c4cecb','#cba563','#d8ac51'][index];
  let bars='';
  vols.forEach((v,i)=>{
    const x=264+i*70, height=189.1*v/1000*42;
    bars+=rect(x,215-height,43,height,i===index?metal:pale,i===index?ink:'#9aa89f',3)
      +label(x+21,200-height,mm(189.10*v/1000,3),i===index?ink:slate,15)
      +label(x+21,243,names[i],i===index?ink:slate,14);
  });
  return label(124,29,'Один и тот же Ring17')+label(356,29,'Масса металла, г')
    +band(122,143,60,metal)
    +label(122,151,'189,10 мм³',ink,16)
    +label(122,250,'ρ = '+mm(density,2)+' г/см³',ink,16)
    +rule(225,45,225,251)+line(248,215,463,215,slate)
    +bars+label(363,271,names[index]+' · '+mm(weight,3)+' г',green,16);
}
function auditFrame(mode){
  if(mode===0) {
    const grid=(x,gap)=>{
      const v=[[0,35],[59,2],[123,35],[117,105],[54,137],[-5,99],[57,70]];
      const faces=[[0,1,6],[1,2,6],[2,3,6],[3,4,6],[4,5,6],[5,0,6]];
      return faces.map((f,i)=>gap&&i===2?'':path(f.map((k,j)=>(j?'L':'M')+(x+v[k][0])+','+(52+v[k][1])).join(' ')+' Z',i%2?'#ddc292':'#eddfbf',darkGold,1.5)).join('')
        +(gap?path(`M${x+123},87 L${x+57},122 ${x+117},157`,'none',risk,4):'');
    };
    return grid(60,true)+grid(337,false)+arrow(218,120,296,120,green)
      +label(120,226,'Открытый край',risk)+label(392,226,'Участок закрыт',green)
      +label(260,266,'Учебный фрагмент треугольной сетки',slate,15);
  }
  const profile=path('M55 104 L80 81 H465 V192 H55 Z',gold,darkGold,2)
    +path('M225 81 H298 L278 126 H245 Z',paper,darkGold,2);
  return profile
    +(mode===1?arrow(80,67,64,95.72,risk)+circle(64,95.72,4,risk,risk)
       +path('M64 95.72 L55 112','none',risk,4)+rule(55,112,42,191)
       +label(144,229,'Короткая хорда у фаски',risk)
       +label(323,39,'Сечение условное',slate,14)
      :dim(257,129,257,191,'')+path('M259 158 H327','none',green,1.5)
       +txt(334,163,'Дно выборки',{size:15,color:ink})
       +arrow(120,49,120,79,green)+arrow(120,222,120,193,green)
       +label(260,249,'Сравни реальные стенки в сечении',green));
}
function insertionScene(mode,value) {
  // The pavilion ends in the opening below the seat; contact occurs on its flanks.
  const seated=143, end=mode===2, girdle=end?seated+5:seated-85*(1-Number(value)/100);
  const fy=seated+19.4, left=203,right=317;
  return rule(260,18,260,240)
    +path(`M149 93 H163 L177 ${fy} H${left} L216 180 H184 L191 215 H163Z`,gold,darkGold)
    +path(`M371 93 H357 L343 ${fy} H${right} L304 180 H336 L329 215 H357Z`,gold,darkGold)
    +path('M184 203 Q260 247 336 203','none',darkGold,7)
    +diamond(260,girdle,150,112)
    +(mode===0?arrow(109,75,109,154,green)+label(85,188,'Ось ввода',green,14):
      mode===1?rule(172,fy,350,fy)+path('M322 165 L379 146 H446','none',green,1.8)+label(418,134,'Опора',green):
      circle(left,fy,6,risk,risk)+circle(right,fy,6,risk,risk)+path('M322 160 L373 132 H456','none',risk,1.6)+label(412,118,'Пересечение',risk,14))
    +label(260,267,end?'Ход за посадку +0,020 мм · показан увеличенно':Number(value)===100?'Контрольное положение на посадке':'До посадки '+mm(5*(1-Number(value)/100),2)+' мм',end?risk:ink,16);
}
function studOutline(cx,cy,material,edge){
  return `<g transform="translate(${cx} ${cy})">`+
    path('M-49 -35 L-41 -38 -18 2 H18 L41 -38 49 -35 28 14 11 20 5 23 V79 Q0 85 -5 79 V23 L-11 20 -28 14Z',material,edge)
    +path('M-35 -19 Q0 3 35 -19','none',edge,4)+'</g>';
}
function castingScene(mode){
  const wax='#7089a1', silver='#c4cecb';
  if(mode===0) {
    return studOutline(180,118,wax,'#3e596c')
      +path('M155 131 L94 193 79 204','none','#3e596c',14)+path('M155 131 L94 193 79 204','none',wax,10)
      +path('M99 187 L77 110 H42','none',slate,1.3)+txt(36,96,'Литниковая ветвь',{size:15,color:ink})
      +path('M214 100 L278 76 H361','none',slate,1.3)+txt(286,62,'Модель пусеты',{size:16,color:ink})
      +label(260,248,'Печатная модель с литниковой ветвью');
  }
  if(mode===1||mode===2){
    const hole=mode===1?'#3a504b':'#e6a657';
    return rect(97,51,326,168,'#dbd5c4',darkGold,8)
      +path('M145 50 V111 L182 138','none',hole,15)
      +studOutline(207,127,hole,hole)
      +(mode===2?arrow(146,9,146,43,risk):'')
      +path('M237 122 L294 95 H386','none',slate,1.5)
      +txt(287,82,mode===1?'Полость':'Заполнение',{size:16,color:ink})
      +label(260,255,mode===1?'После удаления полимера в форме остаётся полость':'Сплав поступает в полость по каналу',ink,16);
  }
  return studOutline(161,127,silver,slate)
    +line(76,180,100,157,risk)+line(76,157,100,180,risk)
    +path('M140 140 L98 171','none',slate,7)
    +path('M207 105 L285 84 H462','none',green,1.4)+txt(277,70,'Осмотреть крапаны',{size:15,color:ink})
    +path('M166 180 L277 188 H461','none',green,1.4)+txt(275,174,'Обмерить штифт',{size:15,color:ink})
    +label(260,255,'Отделение, обмер и механическая обработка',ink,16);
}
function demoSection(mode) {
  if(mode===0){
    let top=rect(36,91,448,98,gold,darkGold,14);
    for(let i=0;i<5;i++){const x=82+88*i;top+=stoneFace(x,139,35);}
    return top+line(258,50,258,225,green,'6 4')+arrow(241,64,257,64,green)+arrow(241,212,257,212,green)
      +label(260,255,'Проведи секущую плоскость через гнездо');
  }
  const d=mode===2?0.756:1,px=112, mouths=[172,334],delta=d*px/2;
  const body=path('M40 96 H480 V183 H40Z',gold,darkGold);
  return body+mouths.map(cx=>path(`M${cx-56} 95 H${cx+56} L${cx+delta} 184 H${cx-delta}Z`,paper,darkGold,1.4)).join('')
    +dim(mouths[0]-56,67,mouths[0]+56,67,'Ø 1,00')
    +dim(mouths[0]-delta,211,mouths[0]+delta,211,'Ø '+mm(d,3))
    +path(`M${mouths[0]+delta} 170 H${mouths[1]-delta}`,'none',green,5)
    +label(264,255,mode===2?'Суженный выход сохраняет больше металла снизу':'Прямой канал одинаков на обеих сторонах',ink,16);
}
const frame=(label,caption,draw)=>({label,caption,draw});
export const processVisuals = {
  sizing:{title:'Что меняется вместе с размером',control:{label:'Диаметр шинки',min:16,max:18,step:1,start:17,unit:'мм'},steps:[
    frame(sizeModes[0],'Сдвинь ползунок. Отверстие шинки изменится, диаметр заказанных камней останется прежним.',v=>sizingScene(0,v)),
    frame(sizeModes[1],'Один и тот же центральный камень Ø 5,00 мм и камни паве Ø 1,25 мм подходят к трём размерам.',v=>sizingScene(1,v)),
    frame(sizeModes[2],'При общем масштабировании коэффициент размера затрагивает каждую вставку. Выбери размер 18 и сравни подписи.',v=>sizingScene(2,v))]},
  mass:{title:'Один объём в трёх сплавах',steps:['Ag 925','Au 585','Au 750'].map((name,i)=>frame(name,'Выбери сплав. Высота столбца соответствует расчётной массе металла при неизменном объёме Ring17.',()=>massFrame(i)))},
  audit:{title:'От треугольника к контрольному сечению',steps:[
    frame('Сетка','На учебном фрагменте справа достроена грань. Для проверки замкнутости считают открытые рёбра по всему телу.',()=>auditFrame(0)),
    frame('Луч у края','На условном сечении короткий луч пересекает скошенную кромку. Сначала выясни, между какими поверхностями прошёл замер.',()=>auditFrame(1)),
    frame('Контроль стенки','Выбери сечение по работе детали и измерь остаток металла. Фактические координаты и карту Ring17 открой в STL-инспекторе ниже.',()=>auditFrame(2))]},
  insertion:{title:'Опусти камень в оправу',control:{label:'Ход к посадке',min:0,max:100,step:1,start:0,unit:'%'},steps:[
    frame('Ввод','Двигай камень вдоль оси. Открытые крапаны дают рундисту пройти в каст.',v=>insertionScene(0,v)),
    frame('Посадка','Доведи ход до 100%. Наклонные грани павильона встречаются с уступами, шип остаётся в просвете.',v=>insertionScene(1,v)),
    frame('Контрольный ход','В цифровой проверке камень продвинули за посадку на 0,020 мм и получили пересечение. Красным отмечена опора; смещение увеличено для показа.',v=>insertionScene(2,v))]},
  casting:{title:'Как модель становится отливкой',steps:[
    frame('Модель','Пусету печатают и соединяют с литниковой системой. Здесь показано условное расположение канала; литниковку выбирает цех.',()=>castingScene(0)),
    frame('Форма','После формовки и удаления полимера остаётся канал, соединённый с полостью изделия.',()=>castingScene(1)),
    frame('Заливка','Расплав заполняет подготовленную форму. На схеме виден путь от литникового канала к пусете.',()=>castingScene(2)),
    frame('Отливка','После охлаждения мастер снимает форму, отделяет литник, осматривает крапаны и проверяет припуск штифта.',()=>castingScene(3))]},
  practice:{title:'Покажи решение на одном гнезде',steps:[
    frame('Найти место','На виде сверху выбери дорожку. Через центр одной вставки проведена линия следующего разреза.',()=>demoSection(0)),
    frame('Сравнить','Для сравнения показана условная пара прямых отверстий. При постоянном диаметре выход забирает столько же ширины, сколько вход.',()=>demoSection(1)),
    frame('Объяснить','У Ring17 вход ажура Ø 1,000 мм, выход около Ø 0,756 мм. На схеме видно, откуда берётся дополнительный металл между соседними отверстиями.',()=>demoSection(2))]}
};
