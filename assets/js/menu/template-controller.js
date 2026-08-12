(function () {
  let config, lang, sectionObserver, previewCoverImage = '';

  function init() {
    const root = document.querySelector('#menu-root');
    if (!root || !window.MenuFlowMenuData) return;
    const template = document.body.dataset.template || 'atelier';
    config = window.MenuFlowTemplateConfigs[template];
    const params = new URLSearchParams(location.search);
    lang = params.get('lang') === 'ar' ? 'ar' : 'en';
    previewCoverImage = params.get('embed') === '1'
      ? `../assets/images/template-covers-v2/${template}.png`
      : '';
    const customTheme = readTheme(params.get('theme'));
    rerender(window.MenuFlowMenuData);
    window.MenuFlowTheme.apply(Object.assign({}, config.defaults, customTheme));
    bindMessages(config);
    if (params.get('embed') === '1') document.body.classList.add('is-embedded');
  }

  function renderer() {
    const registry = window.MenuFlowRendererRegistry || {};
    return registry[config.family || 'classic'] || window.MenuFlowRenderer;
  }

  function rerender(data) {
    const root = document.querySelector('#menu-root');
    renderer().render(root, data, {
      template: document.body.dataset.template,
      name: config.name,
      lang,
      previewCoverImage
    });
    bindSearch();
    bindNavigation();
    bindItemDetail();
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
    sectionObserver?.disconnect();
    sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.classList.toggle('active', link.dataset.sectionLink === entry.target.id));
      links.find(link => link.dataset.sectionLink === entry.target.id)?.scrollIntoView({inline:'center',block:'nearest'});
    }), {rootMargin:'-28% 0px -62% 0px'});
    document.querySelectorAll('[data-menu-section]').forEach(section => sectionObserver.observe(section));
  }

  // Optional contract: a family that wants tap-to-open item detail renders
  // ONE <dialog data-item-sheet> shell with data-sheet-* slot elements, and
  // gives each [data-menu-item] a set of data-detail-* attributes to read.
  // Families that don't opt in (e.g. classic) simply have no [data-item-sheet]
  // in the DOM, so this is a no-op for them.
  function bindItemDetail() {
    const sheet = document.querySelector('[data-item-sheet]');
    if (!sheet) return;
    document.querySelectorAll('[data-menu-item][data-detail-name]').forEach(card => {
      card.addEventListener('click', () => openItemSheet(sheet, card));
    });
    sheet.querySelector('[data-sheet-close]')?.addEventListener('click', () => sheet.close());
    sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
  }

  function openItemSheet(sheet, card) {
    const d = card.dataset;
    const setText = (selector, value) => { const el = sheet.querySelector(selector); if (el) el.textContent = value || ''; };
    setText('[data-sheet-name]', d.detailName);
    setText('[data-sheet-desc]', d.detailDesc);
    setText('[data-sheet-price]', d.detailPrice);

    const media = sheet.querySelector('[data-sheet-media]');
    if (media) {
      media.replaceChildren();
      if (d.detailImage) {
        const img = document.createElement('img');
        img.src = d.detailImage;
        img.alt = d.detailName || '';
        media.appendChild(img);
      }
    }

    const tagsHost = sheet.querySelector('[data-sheet-tags]');
    if (tagsHost) {
      tagsHost.replaceChildren();
      const tags = [d.detailBadge, ...(d.detailDietary ? d.detailDietary.split(',').filter(Boolean) : [])].filter(Boolean);
      tags.forEach(tag => {
        const span = document.createElement('span');
        span.textContent = tag;
        tagsHost.appendChild(span);
      });
    }

    sheet.classList.toggle('is-unavailable', d.detailAvailable === 'false');
    sheet.showModal();
  }

  function bindMessages(config) {
    addEventListener('message', event => {
      const sameOrigin = location.protocol === 'file:' || event.origin === location.origin;
      if (!sameOrigin || !event.data) return;
      if (event.data.type === 'menuflow-theme') {
        window.MenuFlowTheme.apply(Object.assign({}, config.defaults, event.data.theme));
      } else if (event.data.type === 'menuflow-preview') {
        const merged = Object.assign({}, window.MenuFlowMenuData, { layout: event.data.layout || {} });
        rerender(merged);
        window.MenuFlowTheme.apply(Object.assign({}, config.defaults, event.data.theme || {}));
      } else if (event.data.type === 'menuflow-language') {
        lang = event.data.lang === 'ar' ? 'ar' : 'en';
        rerender(window.MenuFlowMenuData);
      }
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
