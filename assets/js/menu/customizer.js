(function () {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const shapeValues = {
    cardShape: { square: '0px', soft: '14px', rounded: '28px' },
    buttonShape: { square: '0px', rounded: '12px', pill: '999px' }
  };
  const studioOptions = {
    buttonShape: ['square', 'rounded', 'pill'],
    cardShape: ['square', 'soft', 'rounded'],
    cardStyle: ['flat', 'bordered', 'elevated'],
    itemLayout: ['list', 'grid', 'image-focus'],
    gridColumns: ['1', '2', '3', '4'],
    sectionNav: ['tabs', 'chips', 'minimal'],
    imageStyle: ['square', 'rounded', 'circle', 'full-bleed']
  };
  const headingFonts = {
    atelier: '"Cormorant Garamond", Georgia, serif', verde: '"DM Serif Display", Georgia, serif',
    noir: '"Cormorant Garamond", Georgia, serif', amalfi: '"DM Serif Display", Georgia, serif',
    sora: '"Space Grotesk", Inter, sans-serif', ember: '"Space Grotesk", Inter, sans-serif',
    souk: '"Cormorant Garamond", "Noto Kufi Arabic", serif', mellow: '"DM Serif Display", Georgia, serif',
    feast: '"DM Serif Display", Georgia, serif'
  };

  let activeConfig;
  let theme = {};
  let dirty = false;
  let conversionShown = false;
  let activeDevice = 'mobile';
  let saveTimer;
  const frame = $('#menuPreview');
  const loadingState = $('#previewLoading');
  const claimDialog = $('#claimDialog');

  function parseTheme(value) {
    if (!value) return {};
    try { return JSON.parse(value); } catch (error) { return {}; }
  }

  function storageKey(id) { return `daify-studio:${id}`; }
  function readDraft(id) { return parseTheme(sessionStorage.getItem(storageKey(id))); }

  function init() {
    const configs = window.MenuFlowTemplateConfigs;
    const params = new URLSearchParams(location.search);
    const requested = configs[params.get('template')] ? params.get('template') : 'atelier';
    $('#templateSelect').innerHTML = Object.values(configs)
      .map(config => `<option value="${config.id}">${config.name} · ${config.category}</option>`).join('');
    $('#templateSelect').value = requested;
    $('#languageSelect').value = params.get('lang') === 'ar' ? 'ar' : 'en';

    Object.entries(studioOptions).forEach(([key, values]) => renderOptions(key, values));
    $('#templateSelect').addEventListener('change', () => { saveDraft(); loadTemplate(readDraft($('#templateSelect').value)); markChanged('Template changed'); });
    $('#presetSelect').addEventListener('change', applyPreset);
    $('#languageSelect').addEventListener('change', () => { markChanged('Language updated'); reloadFrame(); });
    $$('[data-theme]').forEach(input => input.addEventListener('input', () => {
      theme[input.dataset.theme] = input.value;
      syncColorValue(input.dataset.theme, input.value);
      syncPaletteStrip();
      markChanged('Color updated');
      sendTheme();
    }));
    $$('[data-device]').forEach(button => button.addEventListener('click', () => setDevice(button.dataset.device)));
    setDevice('mobile');

    frame.addEventListener('load', () => { sendTheme(); loadingState.classList.add('is-hidden'); });
    frame.addEventListener('error', () => loadingState.classList.add('is-hidden'));
    $('#resetTheme').addEventListener('click', resetTheme);
    $('#claimDesign').addEventListener('click', () => openClaim());
    $$('[data-claim-close]').forEach(button => button.addEventListener('click', closeClaim));
    claimDialog.addEventListener('click', event => { if (event.target === claimDialog) closeClaim(); });
    $('[data-leave-link]').addEventListener('click', handleLeaveLink);
    document.addEventListener('mouseout', handleExitIntent);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveDraft(); });

    const urlTheme = parseTheme(params.get('theme'));
    const initialTheme = Object.keys(urlTheme).length ? urlTheme : readDraft(requested);
    loadTemplate(initialTheme);
  }

  function setDevice(device) {
    activeDevice = device;
    $$('[data-device]').forEach(item => {
      const active = item.dataset.device === device;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    $('.preview-canvas').dataset.device = device;
    syncColumnControl();
    if (activeConfig) sendTheme();
  }

  function loadTemplate(overrides = {}) {
    activeConfig = window.MenuFlowTemplateConfigs[$('#templateSelect').value];
    theme = Object.assign({}, activeConfig.defaults, overrides);
    $('#workspaceTitle').textContent = activeConfig.name;
    $('#workspaceMeta').textContent = `${activeConfig.category} · Mobile-first sample menu`;
    $('#panelTemplateName').textContent = activeConfig.name;
    $('#panelTemplateCategory').textContent = activeConfig.category;
    $('#panelTemplateDescription').textContent = activeConfig.description;
    $('#claimTemplateName').textContent = activeConfig.name;
    document.title = `${activeConfig.name} — Design Studio — DAIFY`;
    $('#presetSelect').innerHTML = Object.keys(activeConfig.presets)
      .map(name => `<option value="${name}">${name}</option>`).join('');
    syncInputs();
    reloadFrame();
    syncClaimLink();
  }

  function optionGlyph(key, value) {
    if (shapeValues[key]) return `<i class="opt-glyph${key === 'buttonShape' ? ' opt-glyph--wide' : ''}" style="border-radius:${shapeValues[key][value]}" aria-hidden="true"></i>`;
    if (key === 'gridColumns') return `<i class="opt-glyph opt-glyph--cols" aria-hidden="true">${'<b></b>'.repeat(Number(value) || 0)}</i>`;
    const glyphs = { flat: '▭', bordered: '▣', elevated: '◫', list: '☷', grid: '⊞', 'image-focus': '▧', tabs: '━', chips: '◉', minimal: '—', square: '□', rounded: '▢', circle: '○', 'full-bleed': '▰' };
    return `<i class="opt-symbol" aria-hidden="true">${glyphs[value] || '◇'}</i>`;
  }

  function renderOptions(key, values) {
    const host = $(`[data-options="${key}"]`);
    if (!host) return;
    host.innerHTML = values.map(value => `<button type="button" data-value="${value}" aria-pressed="false">${optionGlyph(key, value)}<span>${value.replace('-', ' ')}</span></button>`).join('');
    host.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      if (shapeValues[key]) theme[key === 'cardShape' ? 'cardRadius' : 'buttonRadius'] = shapeValues[key][button.dataset.value];
      else if (key === 'gridColumns') theme[columnThemeKey()] = button.dataset.value;
      else theme[key] = button.dataset.value;
      syncOptionButtons(key);
      syncGridColumnsState();
      markChanged(`${labelFor(key)} updated`);
      sendTheme();
    }));
  }

  function labelFor(key) {
    return ({ buttonShape: 'Button shape', cardShape: 'Card shape', cardStyle: 'Card style', itemLayout: 'Layout', gridColumns: 'Grid', sectionNav: 'Navigation', imageStyle: 'Images' })[key] || 'Design';
  }

  function applyPreset() {
    Object.assign(theme, activeConfig.presets[$('#presetSelect').value]);
    syncInputs();
    markChanged('Preset applied');
    sendTheme();
  }

  function resetTheme() {
    theme = Object.assign({}, activeConfig.defaults);
    $('#presetSelect').selectedIndex = 0;
    syncInputs();
    markChanged('Design reset');
    sendTheme();
  }

  function markChanged(message) {
    dirty = true;
    $('#saveState').textContent = message;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 450);
  }

  function saveDraft() {
    if (!activeConfig) return;
    sessionStorage.setItem(storageKey(activeConfig.id), JSON.stringify(theme));
    $('#saveState').textContent = 'Design saved in this browser';
    syncClaimLink();
  }

  function syncColorValue(key, value) {
    const output = $(`[data-color-value="${key}"]`);
    if (output) output.textContent = value;
  }

  function syncPaletteStrip() {
    $$('#paletteStrip [data-swatch]').forEach(dot => { dot.style.background = theme[dot.dataset.swatch] || 'transparent'; });
    const root = document.documentElement.style;
    root.setProperty('--studio-bg', theme.background || '#f4efe5');
    root.setProperty('--studio-surface', theme.surface || '#fff');
    root.setProperty('--studio-primary', theme.primary || '#201f1b');
    root.setProperty('--studio-heading-font', headingFonts[activeConfig.id] || 'var(--font-serif)');
  }

  function optionValue(key) {
    if (key === 'gridColumns') return theme[columnThemeKey()] || '1';
    if (!shapeValues[key]) return theme[key];
    const property = key === 'cardShape' ? 'cardRadius' : 'buttonRadius';
    return Object.keys(shapeValues[key]).find(name => shapeValues[key][name] === theme[property]);
  }

  function syncOptionButtons(key) {
    const current = optionValue(key);
    $$(`[data-options="${key}"] button`).forEach(button => {
      const active = button.dataset.value === current;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function syncInputs() {
    $$('[data-theme]').forEach(input => {
      input.value = theme[input.dataset.theme];
      syncColorValue(input.dataset.theme, input.value);
    });
    Object.keys(studioOptions).forEach(syncOptionButtons);
    syncGridColumnsState();
    syncPaletteStrip();
  }

  function syncGridColumnsState() {
    const group = $('[data-capability="gridColumns"]');
    const disabled = theme.itemLayout !== 'grid';
    group.classList.toggle('is-disabled', disabled);
    group.querySelectorAll('button').forEach(button => { button.disabled = disabled; });
    syncColumnControl();
  }

  function columnThemeKey(device = activeDevice) {
    return `${device}Columns`;
  }

  function syncColumnControl() {
    if (!activeConfig) return;
    const names = { mobile: 'Mobile setting', tablet: 'Tablet setting', desktop: 'Desktop setting' };
    const notes = {
      mobile: 'Mobile menus begin with one generous card per row. Choose two only for a denser visual menu.',
      tablet: 'Tablet columns are saved separately from mobile and desktop.',
      desktop: 'Desktop columns are saved separately, so phone readability stays protected.'
    };
    $('#columnDeviceLabel').textContent = names[activeDevice];
    $('#columnDeviceNote').textContent = notes[activeDevice];
    const allowed = { mobile: ['1','2'], tablet: ['1','2','3'], desktop: ['1','2','3','4'] }[activeDevice];
    $$('[data-options="gridColumns"] button').forEach(button => { button.hidden = !allowed.includes(button.dataset.value); });
    syncOptionButtons('gridColumns');
  }

  function previewUrl() {
    theme.gridColumns = theme[columnThemeKey()] || '1';
    const params = new URLSearchParams({ embed: '1', sample: '1', lang: $('#languageSelect').value, theme: JSON.stringify(theme) });
    return `templates/${activeConfig.id}.html?${params}`;
  }

  function workspaceUrl() {
    const params = new URLSearchParams({ template: activeConfig.id, lang: $('#languageSelect').value, theme: JSON.stringify(theme) });
    return `template-preview.html?${params}`;
  }

  function reloadFrame() {
    loadingState.classList.remove('is-hidden');
    frame.src = previewUrl();
    syncWorkspaceLinks();
  }

  function sendTheme() {
    theme.gridColumns = theme[columnThemeKey()] || '1';
    const targetOrigin = location.protocol === 'file:' ? '*' : location.origin;
    frame.contentWindow?.postMessage({ type: 'menuflow-theme', theme }, targetOrigin);
    syncWorkspaceLinks();
  }

  function syncWorkspaceLinks() {
    $('#openTemplate').href = workspaceUrl();
    const params = new URLSearchParams({ template: activeConfig.id, lang: $('#languageSelect').value });
    history.replaceState(null, '', `${location.pathname}?${params}`);
    syncClaimLink();
  }

  function syncClaimLink() {
    if (!activeConfig) return;
    const params = new URLSearchParams({ template: activeConfig.id, lang: $('#languageSelect').value, theme: JSON.stringify(theme), source: 'design-studio' });
    $('#claimSignup').href = `signup.html?${params}`;
  }

  function openClaim(leaveTarget = '') {
    conversionShown = true;
    $('#claimTemplateName').textContent = activeConfig.name;
    syncClaimLink();
    const leave = $('#claimLeave');
    leave.hidden = !leaveTarget;
    if (leaveTarget) leave.href = leaveTarget;
    if (!claimDialog.open) claimDialog.showModal();
  }

  function closeClaim() { if (claimDialog.open) claimDialog.close(); }

  function handleLeaveLink(event) {
    if (!dirty) return;
    event.preventDefault();
    openClaim(event.currentTarget.href);
  }

  function handleExitIntent(event) {
    if (!dirty || conversionShown || claimDialog.open || event.clientY > 8 || event.relatedTarget) return;
    openClaim();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
