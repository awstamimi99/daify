(function () {
  const $ = (s, c) => (c || document).querySelector(s);
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
    cardShape: 'Card shape',
    buttonShape: 'Button shape',
    itemLayout: 'Item layout',
    sectionNav: 'Section navigation',
    imageStyle: 'Image style',
    cardStyle: 'Card style',
  };

  let activeConfig;
  let theme = {};

  const currentTemplate = () => window.MenuFlowStore.getState().selectedTemplate || 'atelier';
  const toHex = value => (/^#[0-9a-fA-F]{3,8}$/.test(value) ? value : '#000000');

  function renderTemplateGrid() {
    const configs = window.MenuFlowTemplateConfigs;
    const selected = currentTemplate();
    const grid = $('#templateGrid');
    grid.innerHTML = Object.values(configs)
      .map(
        config => `
      <button type="button" class="dash-template-pick ${config.id === selected ? 'active' : ''}" data-template="${config.id}">
        <span class="dash-template-check">✓</span>
        <strong>${config.name}</strong>
        <span>${config.category}</span>
      </button>`
      )
      .join('');

    grid.querySelectorAll('[data-template]').forEach(btn => {
      btn.addEventListener('click', () => selectTemplate(btn.dataset.template));
    });
  }

  function selectTemplate(id) {
    if (id === currentTemplate()) return;
    window.MenuFlowStore.setState(s => ({ ...s, selectedTemplate: id, theme: {} }));
    renderTemplateGrid();
    loadTemplate();
    window.MenuFlowDashShell.showToast('Template switched');
  }

  function loadTemplate() {
    activeConfig = window.MenuFlowTemplateConfigs[currentTemplate()];
    theme = Object.assign({}, activeConfig.defaults, window.MenuFlowStore.getState().theme || {});
    $('#customizeTitle').textContent = `Customize ${activeConfig.name}`;
    renderColorControls();
    renderShapeControls();
    reloadFrame();
  }

  function renderColorControls() {
    const host = $('#colorControls');
    host.innerHTML = colorFields
      .map(
        field => `
      <label class="dash-color-field">
        <input type="color" data-theme="${field.key}" value="${toHex(theme[field.key])}" />
        <span>${field.label}</span>
      </label>`
      )
      .join('');
    host.querySelectorAll('[data-theme]').forEach(input => {
      input.addEventListener('input', () => {
        theme[input.dataset.theme] = input.value;
        persistTheme();
      });
    });
  }

  function renderShapeControls() {
    const host = $('#shapeControls');
    host.innerHTML = Object.entries(activeConfig.supports)
      .filter(([key]) => capabilityLabels[key])
      .map(
        ([key]) => `
        <div class="dash-option-group" data-capability="${key}">
          <span>${capabilityLabels[key]}</span>
          <div class="segmented" data-options="${key}"></div>
        </div>`
      )
      .join('');

    Object.entries(activeConfig.supports).forEach(([key, values]) => {
      const optHost = host.querySelector(`[data-options="${key}"]`);
      if (!optHost) return;
      optHost.innerHTML = values.map(value => `<button type="button" data-value="${value}">${value.replace('-', ' ')}</button>`).join('');
      syncShapeActive(key, optHost);
      optHost.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          if (shapeValues[key]) {
            theme[key === 'cardShape' ? 'cardRadius' : 'buttonRadius'] = shapeValues[key][btn.dataset.value];
          } else {
            theme[key] = btn.dataset.value;
          }
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

  function persistTheme() {
    window.MenuFlowStore.setState(s => ({ ...s, theme, meta: Object.assign({}, s.meta, { customizedDesign: true }) }));
    sendTheme();
    window.MenuFlowDashShell.showToast('Saved');
  }

  function reloadFrame() {
    $('#previewFrame').src = `../templates/${activeConfig.id}.html?embed=1`;
  }

  function sendTheme() {
    const frame = $('#previewFrame');
    const targetOrigin = location.protocol === 'file:' ? '*' : location.origin;
    frame.contentWindow?.postMessage({ type: 'menuflow-theme', theme }, targetOrigin);
  }

  function init() {
    renderTemplateGrid();
    loadTemplate();
    $('#previewFrame').addEventListener('load', sendTheme);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
