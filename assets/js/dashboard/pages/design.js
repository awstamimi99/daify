(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;
  const canEdit = store.can(window.MenuFlowPermissions.PERMISSIONS.THEME_EDIT);
  const canPublish = store.can(window.MenuFlowPermissions.PERMISSIONS.MENU_PUBLISH);

  const shapeValues = {
    cardShape: { square: '0px', soft: '14px', rounded: '28px' },
    buttonShape: { square: '0px', rounded: '12px', pill: '999px' },
  };
  const colorFields = [
    { key: 'background', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'primary', label: 'Primary' },
    { key: 'accent', label: 'Accent' },
    { key: 'text', label: 'Text' },
    { key: 'muted', label: 'Muted' },
  ];
  const capabilityLabels = {
    cardShape: 'Card shape', buttonShape: 'Button shape', itemLayout: 'Item layout',
    sectionNav: 'Navigation', imageStyle: 'Image style', cardStyle: 'Card style',
  };

  let restaurant, menuId, activeConfig, theme = {}, device = 'mobile', dirty = false;

  function currentMenu() {
    return store.getMenu(menuId, restaurant.id);
  }

  function init() {
    restaurant = store.getActiveRestaurant();
    store.updateRestaurantFlags(restaurant.id, { designVisited: true });
    const params = new URLSearchParams(location.search);
    const menus = Object.values(restaurant.menus);
    menuId = params.get('menu') && restaurant.menus[params.get('menu')] ? params.get('menu') : (menus.find(m => m.id === 'main-menu') || menus[0])?.id;

    const content = window.MenuFlowShell.render({
      active: 'design',
      title: 'Design',
      breadcrumb: esc(restaurant.name),
      subtitle: 'Pick a template, then tune it to match your brand.',
      actions: `<span class="save-state" id="saveState" data-state="saved">All changes saved</span>` +
        (canPublish ? `<button class="btn btn--dark" type="button" id="publishBtn">Publish</button>` : ''),
    });
    if (!window.MenuFlowShell.requirePermission(window.MenuFlowPermissions.PERMISSIONS.THEME_VIEW, content)) return;

    if (!menuId) {
      content.innerHTML = `<div class="dash-card"><div class="dash-empty-state"><h3>No menu yet</h3><p>Create a menu first to customize its design.</p><a class="btn btn--dark" href="menus.html">Go to Menus</a></div></div>`;
      return;
    }

    content.innerHTML = `
      <div class="dash-card" style="margin-bottom:1.75rem">
        <div class="dash-card-header"><div><h2>Template</h2><p>Switching templates resets fine-tuned colors for a clean start.</p></div></div>
        <div class="dash-template-grid" id="templateGrid"></div>
      </div>
      <div class="dash-design-grid">
        <div class="dash-card">
          <div class="dash-card-header"><div><h2 id="customizeTitle">Customize</h2><p>Changes preview instantly and save as a draft.</p></div></div>

          <div class="dash-option-group">
            <span>Presets</span>
            <div class="preset-grid" id="presetGrid"></div>
          </div>
          <div class="dash-option-group">
            <span>Colors</span>
            <div class="dash-swatch-row" id="colorControls"></div>
            <div id="contrastWarning"></div>
          </div>
          <div id="shapeControls"></div>
        </div>
        <div class="dash-preview-frame-wrap">
          <div class="dash-preview-frame-toolbar">
            <span style="font-size:.78rem;font-weight:700">Live preview</span>
            <div class="device-toggle" id="deviceToggle">
              <button type="button" data-device="mobile" class="active">Mobile</button>
              <button type="button" data-device="tablet">Tablet</button>
              <button type="button" data-device="desktop">Desktop</button>
            </div>
          </div>
          <div class="dash-preview-frame-viewport" id="previewViewport" data-device="mobile">
            <iframe id="previewFrame" title="Live menu preview"></iframe>
          </div>
        </div>
      </div>`;

    if (!canEdit) $$('#colorControls, #shapeControls, #presetGrid').forEach(el => (el.style.pointerEvents = 'none', el.style.opacity = '.6'));

    renderTemplateGrid();
    loadTemplate();
    bindDevice();
    $('#publishBtn')?.addEventListener('click', () => {
      store.publishMenu(restaurant.id, menuId);
      window.MenuFlowShell.toast('Design published');
      init();
    });
  }

  function renderTemplateGrid() {
    const configs = window.MenuFlowTemplateConfigs;
    const selected = currentMenu().template;
    $('#templateGrid').innerHTML = Object.values(configs)
      .map(c => `<button type="button" class="dash-template-pick ${c.id === selected ? 'active' : ''}" data-template="${c.id}" ${canEdit ? '' : 'disabled'}>
        <span class="dash-template-check">✓</span><strong>${c.name}</strong><span>${c.category}</span>
      </button>`)
      .join('');
    $$('[data-template]').forEach(btn => btn.addEventListener('click', () => selectTemplate(btn.dataset.template)));
  }

  function selectTemplate(id) {
    if (id === currentMenu().template) return;
    window.MenuFlowShell.confirmDialog({
      title: `Switch to ${window.MenuFlowTemplateConfigs[id].name}?`,
      message: 'Your fine-tuned colors and shapes for the current template will reset to its defaults. Menu content is never affected.',
      confirmLabel: 'Switch template',
    }).then(ok => {
      if (!ok) return;
      store.updateMenu(restaurant.id, menuId, { template: id, theme: {} });
      renderTemplateGrid();
      loadTemplate();
      markSaved();
    });
  }

  function loadTemplate() {
    activeConfig = window.MenuFlowTemplateConfigs[currentMenu().template];
    theme = Object.assign({}, activeConfig.defaults, currentMenu().theme || {});
    $('#customizeTitle').textContent = `Customize ${activeConfig.name}`;
    renderPresets();
    renderColorControls();
    renderShapeControls();
    checkContrast();
    reloadFrame();
  }

  function renderPresets() {
    const host = $('#presetGrid');
    const entries = Object.entries(activeConfig.presets || {});
    if (!entries.length) { host.innerHTML = `<p class="dash-empty" style="padding:1rem">No presets for this template.</p>`; return; }
    host.innerHTML = entries
      .map(([name, values]) => `<button type="button" class="preset-swatch" data-preset="${esc(name)}">
        <span class="preset-swatch-colors"><i style="background:${values.background}"></i><i style="background:${values.primary}"></i><i style="background:${values.accent}"></i></span>
        <span>${esc(name)}</span>
      </button>`)
      .join('');
    $$('[data-preset]', host).forEach(btn =>
      btn.addEventListener('click', () => {
        Object.assign(theme, activeConfig.presets[btn.dataset.preset]);
        renderColorControls();
        checkContrast();
        persistTheme();
      })
    );
  }

  function renderColorControls() {
    const host = $('#colorControls');
    host.innerHTML = colorFields
      .map(f => `<label class="dash-color-field">
        <input type="color" data-theme="${f.key}" value="${toHex(theme[f.key])}" ${canEdit ? '' : 'disabled'} />
        <span>${f.label}</span>
      </label>`)
      .join('');
    host.querySelectorAll('[data-theme]').forEach(input => {
      input.addEventListener('input', () => {
        theme[input.dataset.theme] = input.value;
        checkContrast();
        persistTheme();
      });
    });
  }

  function toHex(v) {
    return /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : '#000000';
  }

  function relLuminance(hex) {
    const c = hex.replace('#', '');
    const rgb = c.length === 3 ? c.split('').map(x => x + x) : [c.slice(0, 2), c.slice(2, 4), c.slice(4, 6)];
    const [r, g, b] = rgb.map(x => {
      const v = parseInt(x, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(hex1, hex2) {
    const l1 = relLuminance(toHex(hex1)) + 0.05;
    const l2 = relLuminance(toHex(hex2)) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  }

  function checkContrast() {
    const ratio = contrastRatio(theme.text, theme.background);
    const host = $('#contrastWarning');
    host.innerHTML = ratio < 3 ? `<div class="contrast-warning">⚠ Text and background are hard to read together (contrast ${ratio.toFixed(1)}:1). Try a darker text or lighter background.</div>` : '';
  }

  function renderShapeControls() {
    const host = $('#shapeControls');
    host.innerHTML = Object.entries(activeConfig.supports)
      .filter(([key]) => capabilityLabels[key])
      .map(([key]) => `<div class="dash-option-group"><span>${capabilityLabels[key]}</span><div class="segmented" data-options="${key}"></div></div>`)
      .join('');
    Object.entries(activeConfig.supports).forEach(([key, values]) => {
      const optHost = host.querySelector(`[data-options="${key}"]`);
      if (!optHost) return;
      optHost.innerHTML = values.map(v => `<button type="button" data-value="${v}" ${canEdit ? '' : 'disabled'}>${v.replace('-', ' ')}</button>`).join('');
      syncShapeActive(key, optHost);
      optHost.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          if (shapeValues[key]) theme[key === 'cardShape' ? 'cardRadius' : 'buttonRadius'] = shapeValues[key][btn.dataset.value];
          else theme[key] = btn.dataset.value;
          optHost.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          persistTheme();
        });
      });
    });
  }

  function syncShapeActive(key, optHost) {
    let current = theme[key];
    if (shapeValues[key]) {
      const prop = key === 'cardShape' ? 'cardRadius' : 'buttonRadius';
      current = Object.keys(shapeValues[key]).find(name => shapeValues[key][name] === theme[prop]);
    }
    optHost.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.value === current));
  }

  function markSaving() {
    const el = $('#saveState');
    el.dataset.state = 'saving';
    el.textContent = 'Saving…';
  }
  function markSaved() {
    const el = $('#saveState');
    el.dataset.state = 'saved';
    el.textContent = 'All changes saved';
  }

  let saveTimer;
  function persistTheme() {
    if (!canEdit) return;
    markSaving();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      store.updateMenu(restaurant.id, menuId, { theme });
      markSaved();
      sendTheme();
    }, 350);
    sendTheme();
  }

  function reloadFrame() {
    $('#previewFrame').src = `../templates/${activeConfig.id}.html?embed=1`;
  }

  function sendTheme() {
    const frame = $('#previewFrame');
    const targetOrigin = location.protocol === 'file:' ? '*' : location.origin;
    frame.contentWindow?.postMessage({ type: 'menuflow-theme', theme }, targetOrigin);
  }

  function bindDevice() {
    $$('#deviceToggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#deviceToggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        device = btn.dataset.device;
        $('#previewViewport').dataset.device = device;
      });
    });
    $('#previewFrame').addEventListener('load', sendTheme);
  }

  init();
})();
