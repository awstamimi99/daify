(function () {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const shapeValues = {cardShape:{square:'0px',soft:'14px',rounded:'28px'},buttonShape:{square:'0px',rounded:'12px',pill:'999px'}};
  // Mirrors each template's `--restaurant-font-heading` (set per-file in
  // assets/css/templates/*.css) so the studio chrome can borrow the same
  // typeface — the one piece of template identity the shared config object
  // doesn't already carry.
  const HEADING_FONTS = {
    atelier: '"Cormorant Garamond", Georgia, serif',
    verde: '"DM Serif Display", Georgia, serif',
    noir: '"Cormorant Garamond", Georgia, serif',
    amalfi: '"DM Serif Display", Georgia, serif',
    sora: '"Space Grotesk", Inter, sans-serif',
    ember: '"Space Grotesk", Inter, sans-serif',
    souk: '"Cormorant Garamond", "Noto Kufi Arabic", serif',
    mellow: '"DM Serif Display", Georgia, serif',
    feast: '"DM Serif Display", Georgia, serif'
  };
  let activeConfig;
  let theme = {};
  const frame = $('#menuPreview');
  const loadingState = $('#previewLoading');

  function themeFromUrl() {
    const value = new URLSearchParams(location.search).get('theme');
    if (!value) return {};
    try { return JSON.parse(value); } catch (error) { return {}; }
  }

  function init() {
    const configs = window.MenuFlowTemplateConfigs;
    const params = new URLSearchParams(location.search);
    const requested = params.get('template');
    $('#templateSelect').innerHTML = Object.values(configs).map(config => `<option value="${config.id}">${config.name} · ${config.category}</option>`).join('');
    $('#templateSelect').value = configs[requested] ? requested : 'atelier';
    $('#languageSelect').value = params.get('lang') === 'ar' ? 'ar' : 'en';
    $('#templateSelect').addEventListener('change', () => loadTemplate());
    $('#presetSelect').addEventListener('change', applyPreset);
    $('#languageSelect').addEventListener('change', reloadFrame);
    $$('[data-theme]').forEach(input => input.addEventListener('input', () => {
      theme[input.dataset.theme] = input.value;
      syncColorValue(input.dataset.theme, input.value);
      syncPaletteStrip();
      sendTheme();
    }));
    $$('[data-device]').forEach(button => button.addEventListener('click', () => {
      $$('[data-device]').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      $('.preview-canvas').dataset.device = button.dataset.device;
    }));
    $$('[data-device]').forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
    frame.addEventListener('load', () => { sendTheme(); loadingState.classList.add('is-hidden'); });
    frame.addEventListener('error', () => loadingState.classList.add('is-hidden'));
    $('#resetTheme').addEventListener('click', resetTheme);
    loadTemplate(themeFromUrl());
  }

  function loadTemplate(overrides = {}) {
    activeConfig = window.MenuFlowTemplateConfigs[$('#templateSelect').value];
    theme = Object.assign({}, activeConfig.defaults, overrides);
    $('#workspaceTitle').textContent = activeConfig.name;
    $('#workspaceMeta').textContent = `${activeConfig.category} · Full sample menu`;
    $('#panelTemplateName').textContent = activeConfig.name;
    $('#panelTemplateCategory').textContent = activeConfig.category;
    $('#panelTemplateDescription').textContent = activeConfig.description;
    document.title = `${activeConfig.name} — Template Studio — DAIFY`;
    $('#presetSelect').innerHTML = Object.keys(activeConfig.presets).map(name=>`<option>${name}</option>`).join('');
    // Families don't all support the same capabilities (e.g. Feast has no
    // itemLayout/sectionNav) — hide every group first so a capability the
    // previous template exposed doesn't linger visible for one that doesn't.
    $$('[data-capability]').forEach(group => { group.hidden = true; });
    Object.entries(activeConfig.supports).forEach(([key,values]) => renderOptions(key,values));
    syncInputs(); reloadFrame();
  }

  function optionGlyph(key, value) {
    if (shapeValues[key]) return `<i class="opt-glyph${key === 'buttonShape' ? ' opt-glyph--wide' : ''}" style="border-radius:${shapeValues[key][value]}" aria-hidden="true"></i>`;
    if (key === 'gridColumns') return `<i class="opt-glyph opt-glyph--cols" aria-hidden="true">${'<b></b>'.repeat(Number(value) || 0)}</i>`;
    return '';
  }
  function renderOptions(key, values) {
    const host = document.querySelector(`[data-options="${key}"]`);
    if (!host) return;
    const group = host.closest('[data-capability]'); group.hidden = !values?.length;
    host.innerHTML = (values || []).map(value=>`<button type="button" data-value="${value}" aria-pressed="false">${optionGlyph(key, value)}<span>${value.replace('-',' ')}</span></button>`).join('');
    host.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
      if (shapeValues[key]) theme[key === 'cardShape' ? 'cardRadius' : 'buttonRadius'] = shapeValues[key][button.dataset.value];
      else theme[key] = button.dataset.value;
      host.querySelectorAll('button').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      if (key === 'itemLayout') syncGridColumnsVisibility();
      sendTheme();
    }));
  }

  // "Items per row" only means something once the layout is actually a
  // multi-column grid, so it stays out of the way for list/image-focus.
  function syncGridColumnsVisibility() {
    const group = document.querySelector('[data-capability="gridColumns"]');
    if (group && activeConfig.supports.gridColumns) group.hidden = theme.itemLayout !== 'grid';
  }

  function applyPreset() { Object.assign(theme,activeConfig.presets[$('#presetSelect').value]);syncInputs();sendTheme(); }
  function resetTheme() {
    theme = Object.assign({}, activeConfig.defaults);
    $('#presetSelect').selectedIndex = 0;
    syncInputs();
    sendTheme();
  }
  function syncColorValue(key, value) {
    const output = document.querySelector(`[data-color-value="${key}"]`);
    if (output) output.textContent = value;
  }
  function syncPaletteStrip() {
    $$('#paletteStrip [data-swatch]').forEach(dot => { dot.style.background = theme[dot.dataset.swatch] || 'transparent'; });
    syncStudioTheme();
  }

  // Lets the studio shell borrow the template being edited — background
  // wash and heading typeface only. The interactive accent (buttons, focus
  // rings, active states) stays fixed DAIFY red in customizer.css; it's
  // never driven from here, so it can't drift to whatever color a template
  // or a user's own color picking happens to land on.
  function syncStudioTheme() {
    const root = document.documentElement.style;
    root.setProperty('--studio-bg', theme.background || '#f4efe5');
    root.setProperty('--studio-surface', theme.surface || '#ffffff');
    root.setProperty('--studio-primary', theme.primary || '#201f1b');
    root.setProperty('--studio-heading-font', HEADING_FONTS[activeConfig.id] || 'var(--font-serif)');
  }
  function syncInputs() {
    $$('[data-theme]').forEach(input => {
      input.value = theme[input.dataset.theme];
      syncColorValue(input.dataset.theme, input.value);
    });
    Object.entries(activeConfig.supports).forEach(([key])=>{
      const host=document.querySelector(`[data-options="${key}"]`);if(!host)return;
      let current=theme[key];
      if(shapeValues[key]){const prop=key==='cardShape'?'cardRadius':'buttonRadius';current=Object.keys(shapeValues[key]).find(name=>shapeValues[key][name]===theme[prop])}
      host.querySelectorAll('button').forEach(button => {
        const active = button.dataset.value === current;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    });
    syncGridColumnsVisibility();
    syncPaletteStrip();
  }
  function previewUrl(mode) {
    const id = activeConfig.id;
    const lang = $('#languageSelect').value;
    const params = new URLSearchParams({[mode]:'1',sample:'1',lang,theme:JSON.stringify(theme)});
    return `templates/${id}.html?${params}`;
  }
  function workspaceUrl() {
    const lang = $('#languageSelect').value;
    const params = new URLSearchParams({template:activeConfig.id,lang,theme:JSON.stringify(theme)});
    return `template-preview.html?${params}`;
  }
  function reloadFrame(){
    loadingState.classList.remove('is-hidden');
    frame.src=previewUrl('embed');
    syncWorkspaceLinks();
  }
  function sendTheme(){
    const targetOrigin = location.protocol === 'file:' ? '*' : location.origin;
    frame.contentWindow?.postMessage({type:'menuflow-theme',theme},targetOrigin);
    syncWorkspaceLinks();
  }
  function syncWorkspaceLinks() {
    const url = workspaceUrl();
    $('#openTemplate').href = url;
    $('#openTemplateMobile').href = url;
    const params = new URLSearchParams({ template: activeConfig.id, lang: $('#languageSelect').value });
    history.replaceState(null, '', `${location.pathname}?${params}`);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
