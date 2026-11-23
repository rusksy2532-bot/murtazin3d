import {plates,visualPanel} from './visual.js';
const byId = id => document.getElementById(id);
const chapters = window.RRLessons || [];
const parts = {
  shank: ['section-shank.svg', 'Поперечное сечение нижней части шинки'],
  pave: ['section-pave.svg', 'Сечение через гнездо камня паве'],
  stud: ['section-stud.svg', 'Сечение корпуса пусеты и винтового узла']
};
const glossary = [
  ['Ажур', 'Окно в металле под вставкой. В Ring17 конический канал сужается к изнанке и даёт доступ к нижней стороне камня.'],
  ['Барашек', 'Ответная гайка пусеты. За ушки удобно придерживать гайку при завинчивании.'],
  ['Втулка', 'Деталь с отверстием, внутри которого проходит ось. На втулке подвижная часть серьги поворачивается относительно корпуса.'],
  ['Выборка', 'Участок, из которого убрали материал. Снижает массу, а оставшиеся стенки нужно проверить по сечениям.'],
  ['Галерея', 'Открытая боковая часть оправы под камнем. Её пояса связывают стойки и поддерживают конструкцию.'],
  ['Зазор', 'Свободное расстояние между поверхностями. Уточняют направление замера, положение деталей и стадию обработки.'],
  ['Калетта и шип', 'Нижнее окончание павильона. В строгой терминологии калеттой называют маленькую нижнюю грань, если она есть. У камня может быть острый шип.'],
  ['Каст', 'Оправа для вставки. Включает элементы опоры и закрепки камня.'],
  ['Корнер', 'Маленький участок металла, который закрепщик поднимает или обжимает над краем небольшой вставки.'],
  ['Корона и площадка', 'Корона находится над рундистом. Площадка — верхняя плоская грань камня.'],
  ['Крапан', 'Выступ оправы, верх которого закрепщик подрезает и обжимает над камнем. В заготовке оставляют запас металла.'],
  ['Литник', 'Канал для заполнения формы металлом. После отливки его отделяют от изделия. Его массу считают отдельно.'],
  ['Паве', 'Дорожка или поле близко расположенных небольших камней. В этом комплекте по шесть вставок на каждом плече кольца.'],
  ['Павильон', 'Нижняя часть огранённого камня, от рундиста до нижней грани или шипа. Именно её профиль важно учитывать при посадке.'],
  ['Посадка камня', 'Поверхности оправы, на которые камень опирается в заданном положении. Требуется также свободный путь до этого положения.'],
  ['Проба', 'Содержание драгоценного металла в тысячных долях массы сплава. Для расчёта массы изделия нужна плотность конкретной марки сплава.'],
  ['Пусета', 'Серьга со штифтом, проходящим сквозь мочку. В этом комплекте с обратной стороны навинчивается гайка.'],
  ['Рундист', 'Узкий пояс по самому широкому контуру камня, между короной и павильоном. По нему обычно задают диаметр круглой вставки.'],
  ['Сечение', 'Мысленный разрез модели плоскостью. Его положение определяет, какие стенки, перемычки и зазоры можно измерить.'],
  ['Усадка', 'Изменение размеров при изготовлении. Коэффициент для тиража определяют по процессу мастерской и контрольной отливке.'],
  ['Шаг резьбы', 'Расстояние вдоль оси между соседними витками. Для однозаходной резьбы на такую длину гайка перемещается за оборот.'],
  ['Шинка и плечи', 'Шинка — обод кольца. Плечи — её участки справа и слева от центральной оправы.'],
  ['STL', 'Поверхность изделия, записанная треугольниками. Перед передачей проверяют единицы, замкнутость, направление граней и пересечения.']
];
function element(tag, value) {
  const item = document.createElement(tag);
  if (value !== undefined) item.textContent = value;
  return item;
}
function showGlossary() {
  const query = byId('lookup').value.trim().toLocaleLowerCase('ru');
  const words = glossary.filter(pair => pair.join(' ').toLocaleLowerCase('ru').includes(query));
  byId('words').replaceChildren(...words.map(([name, meaning]) => {
    const row = element('div');
    const term=element('dt'), [id,phase=0]=termTargets.get(name);
    const lesson=plates[id], frame=lesson.steps[phase]||lesson.steps[0];
    const link=element('a');link.className='term-illustration';link.href='#'+id;
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.setAttribute('viewBox','0 0 520 285');icon.setAttribute('aria-hidden','true');
    icon.innerHTML=frame.draw(lesson.control?.start??0);
    icon.querySelectorAll('text').forEach(node=>node.remove());
    const nameplate=element('span');nameplate.append(element('strong',name),element('small','Показать на схеме'));
    link.append(icon,nameplate);
    link.addEventListener('click',e=>{
      e.preventDefault();setMobileView('diagram');
      if(location.hash==='#'+id){panel.show(id,phase);document.querySelector('.chapterbar').scrollIntoView();}
      else{pendingPhase=phase;location.hash=id;}
    });
    term.append(link);row.append(term,element('dd', meaning));
    return row;
  }));
  byId('empty').hidden = words.length > 0;
}
const termTargets=new Map([
  ['Ажур',['windows']],['Барашек',['thread']],['Втулка',['pivot',1]],['Выборка',['relief']],['Галерея',['prongs']],
  ['Зазор',['pivot',1]],['Калетта и шип',['stone',2]],['Каст',['anatomy',2]],['Корнер',['beads']],['Корона и площадка',['stone']],
  ['Крапан',['prongs']],['Литник',['casting']],['Паве',['pave']],['Павильон',['stone',2]],['Посадка камня',['insertion',1]],
  ['Проба',['mass']],['Пусета',['stud']],['Рундист',['stone',1]],['Сечение',['shank',1]],['Усадка',['casting',3]],
  ['Шаг резьбы',['thread']],['Шинка и плечи',['anatomy']],['STL',['audit']]
]);
let current = -1, viewer, pendingPhase=0;
const panel=visualPanel((id,phase,value)=>viewer?.setDemonstration(id,phase,value));
function setMobileView(view){
  document.querySelector('.lesson-grid').dataset.view=view;
  for(const v of ['model','diagram'])byId('mobile-'+v).setAttribute('aria-pressed',String(view===v));
}
const angles = {
  ring: {ring:'Всё кольцо',center:'Центральный камень',prong:'Крапан',pave:'Дорожка паве',bead:'Корнер',window:'Выход ажура',shank:'Низ шинки',relief:'Выборка'},
  stud: {stud:'Вся пусета',basket:'Корзинка',post:'Гладкий штифт'},
  nut: {thread:'Резьба после обработки',nut:'Гайка до нарезки',post:'Штифт до нарезки'},
  pause: {pause:'Вся серьга',pivot:'Ось',lever:'Рычаг',pearl:'Жемчужина',aquamarine:'Аквамарин',inlay:'Золотая вставка'},
  duet: {duet:'Кольцо в разборе',joint:'Установочный штифт',socket:'Гнездо',teal:'Камень в накладке',white:'Камень в белом сплаве'}
};
function syncSceneButtons(key) {
  byId('view-choice').value = key;
  if (viewer) byId('stones').setAttribute('aria-pressed', String(viewer.stoneVisible));
  byId('stones').hidden = ['nut','thread'].includes(key);
}
function buildContents() {
  let lastGroup;
  for (const item of chapters) {
    if (item.group !== lastGroup) byId('chapters').append(element('h3', item.group));
    lastGroup = item.group;
    const link = element('a', item.title);
    link.href = '#' + item.id;
    link.addEventListener('click', () => byId('toc').close());
    byId('chapters').append(link);
  }
}
function activate(index, bringIntoView = false) {
  const item = chapters[index];
  if (!item) return;
  current = index;
  for (const id of ['title','term','why','check','intro']) byId(id).textContent = item[id];
  byId('notes').open=false;
  panel.show(item.id,pendingPhase);pendingPhase=0;
  byId('counter').textContent = (index + 1) + ' из ' + chapters.length;
  byId('progress').style.width = (100 * (index + 1) / chapters.length) + '%';
  byId('chapter-name').textContent = item.group;
  byId('question').textContent = item.qaQuestion;
  byId('answer').textContent = item.qaAnswer;
  byId('quiz-detail').open = false;
  byId('metrics').replaceChildren(...item.metrics.map(([label, value]) => {
    const row = element('div');
    row.append(element('dt', label), element('dd', value));
    return row;
  }));
  const cut = parts[item.section];
  byId('stone-profile').hidden = item.focus !== 'center';
  byId('mass-calc').hidden = !/масс|вес/i.test(item.title);
  byId('cut').hidden = !cut;
  if (cut) {
    byId('cut-link').href = '../order-01/' + cut[0];
    byId('cut-img').src = byId('cut-link').href;
    byId('cut-img').alt = cut[1];
    byId('cut-label').textContent = cut[1] + ' · Открыть крупно';
  }
  byId('sources').replaceChildren(...item.sources.map(([text, url]) => {
    const link = element('a', text);
    link.href = url;
    return link;
  }));
  byId('previous').disabled = index === 0;
  byId('next').disabled = index === chapters.length - 1;
  for (const link of byId('chapters').querySelectorAll('a')) {
    if (link.hash === '#' + item.id) link.setAttribute('aria-current','step');
    else link.removeAttribute('aria-current');
  }
  byId('view-choice').replaceChildren(...Object.entries(angles[item.model]).map(([key,label]) => new Option(label,key)));
  viewer?.show(item.focus);
  syncSceneButtons(item.focus);
  const fallbackImage = byId('fallback').querySelector('img');
  const fallbackPhotos = {stud:'../order-01/stud.webp',nut:'../order-01/stud.webp',ring:'../order-01/whole.webp'};
  fallbackImage.hidden = !fallbackPhotos[item.model];
  if (!fallbackImage.hidden) {
    fallbackImage.src = fallbackPhotos[item.model];
    fallbackImage.alt = item.model === 'ring' ? 'Общий вид комплекта Ring17' : 'Пусета и винтовой узел';
  }
  if (bringIntoView && document.querySelector('.chapterbar').getBoundingClientRect().top < 0) document.querySelector('.chapterbar').scrollIntoView({block:'start'});
}
function route() {
  if (location.hash === '#dictionary') return;
  const index = chapters.findIndex(item => '#' + item.id === location.hash);
  activate(Math.max(0, index), current >= 0);
}
function toggleToc() {
  byId('toc').showModal();
  byId('toc').querySelector('[aria-current]')?.scrollIntoView({block:'nearest'});
}
function init() {
  buildContents(); showGlossary();
  const calc = () => {
    const volume = Number(byId('metal-part').value), density = Number(byId('metal-alloy').value);
    const num = (v,n) => v.toLocaleString('ru-RU',{minimumFractionDigits:n, maximumFractionDigits:n});
    byId('metal-result').value = num(volume,2) + ' мм³ × ' + num(density,2) + ' / 1000 = ' + num(volume*density/1000,3) + ' г';
  };
  byId('mass-calc').addEventListener('change',calc);
  byId('mass-calc').addEventListener('submit',e=>e.preventDefault());
  calc();
  byId('open-toc').addEventListener('click', toggleToc);
  byId('close-toc').addEventListener('click', () => byId('toc').close());
  byId('toc').addEventListener('click', event => {
    if (event.target !== byId('toc')) return;
    const b = byId('toc').getBoundingClientRect();
    if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) byId('toc').close();
  });
  byId('lookup').addEventListener('input', showGlossary);
  for(const view of ['model','diagram'])byId('mobile-'+view).addEventListener('click',()=>setMobileView(view));
  byId('previous').addEventListener('click', () => location.hash = chapters[current - 1].id);
  byId('next').addEventListener('click', () => location.hash = chapters[current + 1].id);
  byId('plus').addEventListener('click', () => viewer?.zoom(1.25));
  byId('minus').addEventListener('click', () => viewer?.zoom(.8));
  byId('reset').addEventListener('click', () => {const key=chapters[current].focus;viewer?.show(key);syncSceneButtons(key);});
  byId('stones').addEventListener('click', () => {viewer?.toggleStones();syncSceneButtons(byId('view-choice').value);});
  byId('view-choice').addEventListener('change', event => {const key=event.target.value;viewer?.show(key);syncSceneButtons(key);});
  window.addEventListener('hashchange', route);
  if (location.hash === '#dictionary') activate(0);
  else route();
}
init();
try {
  const {mountViewer} = await import('./viewer.js?v=plates1');
  viewer = mountViewer(byId('scene'), {onSelect(key) {
    const found = chapters.find(item => item.focus === key);
    if (found && chapters[current]?.focus !== key) location.hash = found.id;
    else syncSceneButtons(key);
  }});
  panel.restore();viewer.show(chapters[current].focus);
} catch (error) {
  console.error('Ошибка просмотра 3D', error);
  byId('fallback').hidden = false;
  document.querySelectorAll('.controls button').forEach(button => button.disabled = true);
}
