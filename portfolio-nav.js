class PortfolioNav extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode:'open'});
    const atHome = ['/', '/index.html'].includes(location.pathname);
    const page = atHome ? '' : '/';
    root.innerHTML = `<style>
      :host{display:block;position:sticky;top:0;z-index:25;background:#19221f;color:#f7f4eb;font:500 14px/1.2 Inter,"Segoe UI",Arial,sans-serif}
      *{box-sizing:border-box}a{color:inherit;text-decoration:none}a:focus-visible{outline:2px solid #e7cfa8;outline-offset:2px}
      .inner{max-width:1560px;margin:auto;padding:0 clamp(16px,4.5vw,76px);display:flex;align-items:center;justify-content:space-between;gap:16px;height:68px}
      .logo{display:flex;align-items:center;gap:10px}.logo img{width:35px;height:39px}.word{font:22px/1 Georgia,serif;white-space:nowrap}.word small{display:block;margin-top:4px;font:9px/1.1 Arial,sans-serif;letter-spacing:.15em;color:#c2b5a2;text-transform:uppercase}
      nav,.actions{display:flex;align-items:center;gap:6px}nav{background:#26312c;border:1px solid #47534b;border-radius:30px;padding:3px}nav a{border-radius:24px;padding:8px 16px;white-space:nowrap;color:#e7e8df}nav a[aria-current]{color:#232821;background:#f0ecdf}
      .inspect,.tg{display:inline-flex;align-items:center;gap:7px;padding:9px 12px}.inspect{background:#dfcfad;color:#21251e;border-radius:4px;font-weight:650}.tg{padding-right:0}.inspect:hover{background:#efe2c5}svg{width:17px;height:17px;flex:none}
      @media(max-width:900px){.inner{padding:0 12px;gap:6px;font-size:13px}nav a{padding:8px}.tg{padding:8px 0}.actions{gap:6px}.inspect{padding:8px}.word{font-size:19px}.logo{gap:6px}}
      @media(max-width:767px){.inner{height:72px;display:grid;grid-template-columns:1fr auto;grid-template-rows:36px 30px;gap:1px 5px;padding:2px 12px 3px}.logo{gap:6px}.logo img{width:23px;height:29px}.word{font-size:16px}.word small{font-size:7px;margin-top:2px}.actions{grid-row:1;grid-column:2}.inspect,.tg{font-size:12px;padding:4px 7px}.actions svg{width:14px;height:14px}.tg{padding-right:0}nav{grid-column:1/-1;grid-row:2;justify-self:start;padding:2px}nav a{font-size:12px;padding:4px 13px}}
      @media(max-width:380px){.audience-detail{display:none}nav a{padding-inline:9px}}
    </style><div class="inner">
    <a class="logo" href="/" aria-label="R&amp;R Design, главная"><img src="/mark.svg" alt=""><span class="word">R&amp;R Design<small>Murtazin 3D</small></span></a>
    <nav aria-label="Раздел портфолио"><a href="${page}#workshop" data-tab="workshop">Для мастерских<span class="audience-detail"> и производств</span></a><a href="${page}#atelier" data-tab="atelier">Частные заказы</a></nav>
    <div class="actions"><a class="inspect" href="/check/"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m10 2 7 4v8l-7 4-7-4V6zm-7 4 7 4 7-4m-7 4v8"/></svg>Проверить STL</a><a class="tg" href="https://t.me/RR_Atelier_Rime_Et_Or">Telegram ↗</a></div></div>`;
    this.update = () => {
      const landing = atHome || ['/cad/', '/cad/index.html'].includes(location.pathname);
      const atelier = (landing && ['#atelier','#collection','#contact'].includes(location.hash)) || location.pathname.startsWith('/catalog/') || (this.dataset.section==='atelier' && !atHome);
      root.querySelectorAll('[data-tab]').forEach(a=>{
        if(a.dataset.tab===(atelier?'atelier':'workshop')) a.setAttribute('aria-current','page');
        else a.removeAttribute('aria-current');
      });
    };
    this.update();
    window.addEventListener('hashchange',this.update);
  }
  disconnectedCallback(){window.removeEventListener('hashchange',this.update);}
}
customElements.define('portfolio-nav',PortfolioNav);
if(!document.querySelector('portfolio-nav') && window===window.top){
  const nav=document.createElement('portfolio-nav');
  if(location.pathname.startsWith('/catalog/')) document.querySelector('body > header')?.remove();
  document.body.prepend(nav);
}
