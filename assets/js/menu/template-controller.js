(function () {
  function init() {
    const root = document.querySelector('#menu-root');
    if (!root || !window.MenuFlowMenuData) return;
    const template = document.body.dataset.template || 'atelier';
    const config = window.MenuFlowTemplateConfigs[template];
    const params = new URLSearchParams(location.search);
    const lang = params.get('lang') === 'ar' ? 'ar' : 'en';
    const customTheme = readTheme(params.get('theme'));
    window.MenuFlowRenderer.render(root, window.MenuFlowMenuData, {template, name:config.name, lang});
    window.MenuFlowTheme.apply(Object.assign({}, config.defaults, customTheme));
    bindSearch(); bindNavigation(); bindMessages(config);
    if (params.get('preview') === '1') addPreviewToolbar(template, lang, params.get('theme'));
    if (params.get('embed') === '1') document.body.classList.add('is-embedded');
  }

  function readTheme(value) {
    if (!value) return {};
    try { return JSON.parse(value); } catch (error) { return {}; }
  }

  function bindSearch() {
    const input = document.querySelector('[data-menu-search]');
    if (!input) return;
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      let visible = 0;
      document.querySelectorAll('[data-menu-item]').forEach(item => {
        const match = !query || item.dataset.search.includes(query);
        item.hidden = !match; if (match) visible++;
      });
      document.querySelectorAll('[data-menu-section]').forEach(section => {
        section.hidden = !section.querySelector('[data-menu-item]:not([hidden])');
      });
      document.querySelector('.menu-empty').hidden = visible !== 0;
    });
  }

  function bindNavigation() {
    const links = [...document.querySelectorAll('[data-section-link]')];
    links.forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      document.getElementById(link.dataset.sectionLink)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
    }));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.classList.toggle('active', link.dataset.sectionLink === entry.target.id));
      links.find(link => link.dataset.sectionLink === entry.target.id)?.scrollIntoView({inline:'center',block:'nearest'});
    }), {rootMargin:'-28% 0px -62% 0px'});
    document.querySelectorAll('[data-menu-section]').forEach(section => observer.observe(section));
  }

  function bindMessages(config) {
    addEventListener('message', event => {
      const sameOrigin = location.protocol === 'file:' || event.origin === location.origin;
      if (!sameOrigin || event.data?.type !== 'menuflow-theme') return;
      window.MenuFlowTheme.apply(Object.assign({}, config.defaults, event.data.theme));
    });
  }

  function addPreviewToolbar(template, lang, themeValue) {
    document.body.classList.add('has-preview-toolbar');
    const bar = document.createElement('aside');
    bar.className = 'preview-toolbar';
    bar.setAttribute('aria-label','Template preview controls');
    const themeQuery = themeValue ? `&theme=${encodeURIComponent(themeValue)}` : '';
    const customizeQuery = themeValue ? `&theme=${encodeURIComponent(themeValue)}` : '';
    bar.innerHTML = `<a class="preview-back" href="../templates.html">← Templates</a><strong>${window.MenuFlowTemplateConfigs[template].name}</strong><div class="preview-sizes"><button data-size="desktop" class="active">Desktop</button><button data-size="tablet">Tablet</button><button data-size="mobile">Mobile</button></div>${template === 'souk' ? `<a href="?preview=1&lang=${lang === 'ar' ? 'en' : 'ar'}${themeQuery}">${lang === 'ar' ? 'English' : 'العربية'}</a>` : ''}<a class="preview-customize" href="../template-customizer.html?template=${template}${customizeQuery}">Customize</a>`;
    document.body.prepend(bar);
    bar.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => {
      bar.querySelectorAll('[data-size]').forEach(item => item.classList.remove('active')); button.classList.add('active');
      document.body.dataset.previewSize = button.dataset.size;
    }));
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
