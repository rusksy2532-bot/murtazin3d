const find = id => document.getElementById(id);
const angles = {
  whole: ['Переплетённые золотые шинки «Дуэта» и две вставки огранки груша', 'Две груши над переплетёнными шинками.'],
  macro: ['Крупный план лапок оправы и двух встречных груш', 'Крупный план оправ и камней до обжима крапанов.'],
  side: ['Кольцо «Дуэт» сбоку, вид на плечи и галереи оправ', 'В профиль видны подъём плеч и высота оправ.']
};
for (const button of document.querySelectorAll('[data-angle]')) {
  button.addEventListener('click', () => {
    const key = button.dataset.angle;
    const img = find('duet-angle');
    img.src = '/assets/landing/duet-' + key + '.webp';
    img.alt = angles[key][0];
    find('duet-note').textContent = angles[key][1];
    for (const sibling of button.parentElement.children) sibling.setAttribute('aria-pressed', String(sibling === button));
  });
}
const filmDialog = find('film-dialog');
const film = find('gran-film');
find('play-film').addEventListener('click', () => {
  filmDialog.showModal();
  if (!film.hasAttribute('src')) {
    film.poster = '/assets/landing/gran-case.webp';
    film.src = film.dataset.file;
  }
  film.currentTime = 0;
  film.play().catch(() => {}); // Native controls remain available when playback needs another tap.
});
find('close-film').addEventListener('click', () => filmDialog.close());
filmDialog.addEventListener('click', event => {
  if (event.target !== filmDialog) return;
  const bounds = filmDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) filmDialog.close();
});
filmDialog.addEventListener('close', () => film.pause());
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}
function link(label, url, cls) {
  const node = el('a', cls, label); node.href = url; return node;
}
function photo(url, alt) {
  const img = el('img'); img.src = url; img.alt = alt; img.width = 800; img.height = 600;
  img.loading = 'lazy'; img.decoding = 'async'; return img;
}
function projectCard(p) {
  const card = el('article','project'), art = el('div','project-photo');
  const model = link('',p.model), img = photo(p.image,p.alt);
  model.append(img); art.append(model);
  if (p.metalPhoto) {
    const modes = el('div','photo-tabs');
    for (const [name,src] of [['3D-рендер',p.image],['В металле',p.metalPhoto]]) {
      const b = el('button','',name); b.type = 'button';
      b.setAttribute('aria-pressed',String(src===p.image));
      b.onclick = () => {
        img.src = src; img.alt = src===p.image ? p.alt : 'Отливка — '+p.title;
        for (const tab of modes.children) tab.setAttribute('aria-pressed',String(tab===b));
      };
      modes.append(b);
    }
    art.append(modes);
  }
  const content = el('div','project-content'), rows = el('dl');
  for (const [label,value] of [['Расчётная масса',p.mass],['Вставки',p.stones],['Стенка / усадка',p.wall]]) {
    const row = el('div'); row.append(el('dt','',label),el('dd','',value)); rows.append(row);
  }
  const actions = el('div','project-actions');
  actions.append(link('Тепловая карта 3D',p.heatmap,'secondary'),link('Техлист ↗',p.report,'textlink'));
  if (p.secondary) actions.append(link(p.secondary.label,p.secondary.url,'textlink'));
  const specs = el('details','specs');
  specs.append(el('summary','','Размеры и допуски'),rows);
  content.append(el('p','category',p.category),el('h4','card-title',p.title),el('p','project-brief',p.construction),specs,actions);
  card.append(art,content); return card;
}
function workshop(projects) {
  for (const group of ['series','assembly']) {
    const cases = projects.filter(p => p.group===group);
    find(group).replaceChildren(...cases.filter(p=>!p.planned).map(projectCard));
    const plans = cases.filter(p=>p.planned);
    const details = find(group+'-plans');
    details.hidden = !plans.length;
    details.querySelector('ul').replaceChildren(...plans.map(p=>{
      const li = el('li'); li.append(el('strong','',p.title+'. '),document.createTextNode(p.brief)); return li;
    }));
  }
}
const types = {'Все':'','Кольца':'Кольцо','Серьги':'Серьги','Подвески':'Подвеска','Броши':'Брошь','Браслеты':'Браслет'};
let pieces = [], selected = 'Все', archive = false;
function drawCollection() {
  const source = pieces.filter(p => archive ? p.archive : p.featured);
  const filtered = source.filter(p => !types[selected] || p.type===types[selected]);
  find('selection-title').textContent = archive ? 'Архив эскизов' : 'Избранная коллекция';
  const filters = document.querySelector('.filters');
  filters.replaceChildren(...Object.entries(types).filter(([,type])=>!type || source.some(p=>p.type===type)).map(([label])=>{
    const button = el('button','',label); button.type='button';
    button.setAttribute('aria-pressed',String(selected===label));
    button.onclick=()=>{selected=label;drawCollection(); Array.from(filters.children).find(b=>b.textContent===label)?.focus({preventScroll:true});};
    return button;
  }));
  find('jewels').replaceChildren(...filtered.map(p=>{
    const card=el('article','jewel'), open=link('',p.model,'jewel-photo');
    open.append(photo(p.image,p.type+' «'+p.title+'»'));
    card.append(open,el('h3','',p.title),el('p','',p.description),link('Рассмотреть в 3D ↗',p.model,'textlink'));return card;
  }));
  find('piece-count').textContent=filtered.length+' из '+source.length;
  find('archive').textContent=archive?'Вернуться к избранному ↑':'Смотреть полный архив эскизов ('+pieces.filter(p=>p.archive).length+') ↓';
  find('archive').setAttribute('aria-expanded',String(archive));
}
find('archive').onclick=()=>{
  archive=!archive;selected='Все';drawCollection();
  find('collection').scrollIntoView({block:'start'});
  find('selection-title').tabIndex=-1;find('selection-title').focus({preventScroll:true});
};
const loaded = new Set();
async function route() {
  if (filmDialog.open) filmDialog.close();
  const hash=location.hash;
  if(hash.startsWith('#work/')){location.replace('/catalog/'+hash);return;}
  const view=['#atelier','#collection','#contact'].includes(hash)?'atelier':'workshop';
  document.documentElement.dataset.view=view;
  const scope=document.querySelector(view==='atelier'?'.atelier-view':'.work-view');
  for(const image of scope.querySelectorAll('[data-src]')){image.src=image.dataset.src; image.removeAttribute('data-src');}
  if(hash==='#atelier'||hash==='#workshop'||!hash)window.scrollTo(0,0);
  if(hash==='#contact')scope.querySelector('footer').scrollIntoView();
  if(loaded.has(view))return;
  loaded.add(view);
  try{
    const res=await fetch('/data/'+view+'.json');
    if(!res.ok)throw Error(res.status);
    const items=await res.json();
    if(view==='atelier'){pieces=items;drawCollection();}else workshop(items);
  }catch(e){loaded.delete(view);find(view==='atelier'?'atelier-error':'work-error').hidden=false;}
}
window.addEventListener('hashchange',route);route();
