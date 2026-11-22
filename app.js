'use strict';
const one=s=>document.querySelector(s), many=s=>Array.from(document.querySelectorAll(s));
const all=window.jewels, byId=new Map(all.map(p=>[p.id,p]));
const highlights=['gran','64-Duet','63-Mirage','59-Pavane'];
let featured=0, filtered=all, limit=8, current=null, revision=0, run=null, viewerScript=null, originHash='';
const picture=(p,kind)=>'assets/'+kind+'/'+p.id+(kind==='studio'?'.webp':'.jpg');
function feature(n){
 featured=n;
 const p=byId.get(highlights[n]),hero=one('#heroImg');
 const pavane=p.id==='59-Pavane',capsule=p.edition===3,duet=p.id==='64-Duet';
 hero.closest('.hero').classList.toggle('signature-hero',pavane);
 hero.closest('.hero').classList.toggle('refraction-hero',capsule||duet||p.id==='gran');
 one('#mobileHero').media=pavane||capsule||duet||p.id==='gran'?'(max-width:650px)':'not all';one('#mobileHero').srcset=picture(p,'full');hero.src=picture(p,'macro');
 hero.alt=p.type+' «'+p.title+'»';
 one('#featureType').textContent=p.type+(p.id==='gran'?' · R&R Design':duet?' · R&R Design':capsule?' · Капсула «Преломление»':p.edition?' · Новая коллекция':' · Избранная работа');
 one('#heroTitle').textContent=p.title;
 one('#heroText').textContent=p.id==='gran'?'Квадратная «принцесса» над тремя рядами паве. Четыре опоры из белого золота открывают вид на нижние грани камня.':duet?'Две груши обращены остриём в разные стороны. Между лентами белого золота и золота цвета шампанского остаётся тонкий просвет.':p.id==='60-Caesura'?'Голубой восьмигранник над открытой галереей. Четыре багета ведут взгляд по одному плечу, семь круглых вставок — по другому.':pavane?'Восемь ажурных перьев расходятся веером от эмалевого крыла. Сапфиры, изумруды и аквамарины мерцают в золотой скани.':p.detail;
 many('.dots button').forEach((b,i)=>b.setAttribute('aria-pressed',i===n));
}
highlights.forEach((id,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','Показать «'+byId.get(id).title+'»');b.textContent=byId.get(id).title;b.onclick=()=>feature(i);one('.dots').append(b)});feature(0);
one('#heroOpen').onclick=()=>openPiece(highlights[featured]);
const filters={'Все':'','Преломление':'capsule','Новинки':'new','Кольца':'Кольцо','Серьги':'Серьги','Подвески':'Подвеска','Браслеты':'Браслет','Броши':'Брошь'};
function render(){
 one('#grid').replaceChildren(...filtered.slice(0,limit).map(p=>{
 const b=document.createElement('button');b.className='card';b.onclick=()=>openPiece(p.id);
 const wrap=document.createElement('div');wrap.className='photo';const pic=new Image();pic.alt='';pic.loading='lazy';pic.src=picture(p,'studio');wrap.append(pic);
 const kind=document.createElement('span');kind.className='kind';kind.textContent=p.type;const title=document.createElement('strong');title.textContent=p.title;b.append(wrap,kind,title);return b;
 }));one('#more').hidden=filtered.length<=limit;one('#count').textContent='Показано '+Math.min(limit,filtered.length)+' из '+filtered.length;
}
for(const [label,type] of Object.entries(filters)){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',!type);b.onclick=()=>{filtered=type==='capsule'?all.filter(p=>p.edition===3):type==='new'?all.filter(p=>p.edition>=2):type?all.filter(x=>x.type===type):all;limit=8;many('.filters button').forEach(f=>f.setAttribute('aria-pressed',f===b));render()};one('.filters').append(b)}
one('#more').onclick=()=>{const previous=limit;limit+=12;render();one('#grid').children[previous]?.focus({preventScroll:true})};render();
const modal=one('#piece'),photo=one('#pieceImg'),canvas=one('#canvas'),message=one('.status');
let shownMode='studio';
const gestures='Тяните, чтобы вращать. Колесо мыши или жест двумя пальцами меняет масштаб. Двойной щелчок приближает выбранную деталь.';
function release(){
 revision++;
 if(run){run.dispose();run=null}
 one('#tools3d').hidden=true;
 one('#signature').hidden=true;one('#align').hidden=true;
 one('#spin').setAttribute('aria-pressed','false');
}
function loadViewer(){if(!viewerScript)viewerScript=new Promise((yes,no)=>{const sc=document.createElement('script');sc.src='viewer.js';sc.onload=yes;sc.onerror=()=>{viewerScript=null;sc.remove();no(Error('viewer'))};document.head.append(sc)});return viewerScript}
async function mode(kind,preset){
 const fromGallery=shownMode==='gallery'||preset==='setting';const fromProfile=shownMode==='profile';shownMode=kind;
 release();const ticket=revision;const p=current;if(!p)return;
 many('.modes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===kind));
 photo.src=picture(p,['macro','profile','detail','gallery'].includes(kind)?kind:'full');photo.alt=p.type+' «'+p.title+'»';photo.hidden=false;canvas.hidden=true;message.textContent=kind==='profile'?p.sideView?.caption||'':'';
 if(kind==='gallery'){message.textContent='Профиль корзины. Видны угловые крапаны, открытый павильон камня и соединение стоек с шинкой.';photo.alt+=' — оправа сбоку'}
 if(kind==='detail'){message.textContent='Посадка круглых фианитов у основания стойки галереи.';photo.alt+=' — закрепка паве'}
 if(kind==='profile')photo.alt+=' — '+(p.sideView?.caption||'вид сбоку');
 const original=one('#open-photo');original.href=photo.src;original.hidden=kind==='model';
 if(kind!=='model')return;message.textContent='Загружаем 3D-модель…';
 try{await loadViewer();if(ticket!==revision)return;
 const view=await window.startJewel(canvas,p,()=>ticket===revision);if(ticket!==revision){view?.dispose();return}
 run=view;canvas.hidden=false;photo.hidden=true;one('#tools3d').hidden=false;one('#signature').hidden=!p.signature;one('#align').hidden=!p.illusion;one('#side').hidden=!p.sideView;one('#pave').hidden=p.id!=='gran';message.textContent=gestures;
 if(fromGallery&&p.id==='gran'&&run.gallery()){message.textContent='Боковой вид оправы. Потяните кольцо, чтобы осмотреть посадку камня со всех сторон.'}
 if(fromProfile&&p.sideView){run.profile();message.textContent=p.sideView.caption}
 }catch(e){if(ticket!==revision)return;await mode('studio');message.textContent='3D-просмотр недоступен. Можно рассмотреть украшение в режиме макро.';console.warn('3D',e)}
}
function show(p,preset){if(modal.open&&current===p){if(preset)mode('model',preset);return}shownMode='studio';current=p;one('[data-mode="gallery"]').hidden=p.id!=='gran';one('[data-mode="detail"]').hidden=p.id!=='gran';one('[data-mode="profile"]').hidden=!p.profile;one('#pieceType').textContent=p.type;one('#pieceTitle').textContent=p.title;one('#description').textContent=p.detail;const legend=one('#legend');legend.hidden=!p.story;legend.open=false;legend.querySelector('p').textContent=p.story||'';one('#spec').textContent=p.spec||(p.size?'Габариты 3D-композиции: '+p.size.map(x=>x.toLocaleString('ru-RU',{maximumFractionDigits:1})).join(' × ')+' мм':'');if(!modal.open)modal.showModal();mode('model',preset)}
one('#pave').onclick=()=>{if(run?.pave()){one('#spin').setAttribute('aria-pressed','false');message.textContent='Крайний ряд паве у плеча галереи. Потяните кольцо, чтобы посмотреть посадку сбоку.'}};
one('#side').onclick=()=>{run?.profile();one('#spin').setAttribute('aria-pressed','false');message.textContent=current.sideView.caption};
canvas.addEventListener('pointerdown',()=>{message.textContent=gestures});
one('#spin').onclick=()=>{message.textContent=gestures;if(run)one('#spin').setAttribute('aria-pressed',String(run.toggleSpin()))};
one('#reset').onclick=()=>{message.textContent=gestures;run?.reset();one('#spin').setAttribute('aria-pressed','false')};
one('#align').onclick=()=>{message.textContent=gestures;run?.align();one('#spin').setAttribute('aria-pressed','false')};one('#signature').onclick=()=>{message.textContent=gestures;run?.signature();one('#spin').setAttribute('aria-pressed','false')};
function openPiece(id){originHash=location.hash;history.pushState({jewel:true},'', '#work/'+id);show(byId.get(id))}
function syncSetting(){return location.hash==='#work/gran/setting'}
function sync(){const focus=syncSetting();const p=focus?byId.get('gran'):byId.get(location.hash.replace(/^#work\//,''));if(p)show(p,focus?'setting':null);else if(modal.open)modal.close()}
function close(){if(history.state?.jewel){history.back()}else{history.replaceState(null,'',originHash||'#collection');modal.close()}}
modal.addEventListener('cancel',e=>{e.preventDefault();close()});modal.addEventListener('click',e=>{if(e.target===modal)close()});modal.addEventListener('close',()=>{if(!modal.open){release();current=null}});one('.close').onclick=close;many('[data-mode]').forEach(b=>b.onclick=()=>mode(b.dataset.mode));many('[data-open]').forEach(b=>b.onclick=()=>openPiece(b.dataset.open));window.addEventListener('hashchange',sync);sync();
