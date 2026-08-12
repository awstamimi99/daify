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
  const BLOCK_META = {
    featured: { label: 'Featured dishes', desc: 'Dishes marked "Featured" in Menu Builder.', locked: false, removable: false, editable: false },
    menu: { label: 'Menu', desc: 'Your categories and dishes. Always visible.', locked: true, removable: false, editable: false },
    story: { label: 'Our story', desc: 'A photo and a few words about your restaurant.', locked: false, removable: true, editable: true },
    gallery: { label: 'Gallery', desc: 'A grid of photos from your space or dishes.', locked: false, removable: true, editable: true },
  };
  const GALLERY_FILES = [
    'burrata-tomato.jpg', 'charred-lemon-chicken.jpg', 'charred-octopus.jpg', 'fig-panna-cotta.jpg',
    'garden-fattoush.jpg', 'green-herb-hummus.jpg', 'hibiscus-cooler.jpg', 'lamb-kibbeh.jpg', 'lamb-kofta.jpg',
    'lemon-linguine.jpg', 'olive-oil-cake.jpg', 'orange-blossom-cold-brew.jpg', 'peach-halloumi.jpg',
    'pistachio-baklava.jpg', 'roasted-aubergine.jpg', 'rosemary-lemonade.jpg', 'sparkling-water.jpg',
    'tahini-chocolate-tart.jpg', 'truffle-rigatoni.jpg', 'warm-lentil-salad.jpg', 'whipped-feta.jpg',
  ];
  const LIBRARY_IMAGES = [
    { src: '../assets/images/restaurant-interior.png', label: 'Restaurant interior' },
    { src: '../assets/images/oliva-seabass.png', label: 'Signature dish' },
    ...GALLERY_FILES.map(f => ({ src: `../assets/images/menu/${f}`, label: f.replace(/\.(jpg|png)$/, '').split('-').join(' ') })),
  ];

  let restaurant, menuId, activeConfig, theme = {}, layout = {}, device = 'mobile', subtab = 'style', expandedBlock = null;

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
      subtitle: 'Pick a template, then tune its style and layout to match your brand.',
      actions: `<span class="save-state" id="saveState" data-state="saved">All changes saved</span>` +
        (canPublish ? `<button class="btn btn--dark" type="button" id="publishBtn">Publish</button>` : ''),
      workspaceTabs: menuId ? window.MenuFlowShellCommon.menuWorkspaceTabs('design', menuId) : undefined,
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
          <div class="dash-subtabs" id="designSubtabs">
            <button type="button" data-tab="style" class="active">Style</button>
            <button type="button" data-tab="layout">Layout</button>
          </div>
          <div id="stylePanel">
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
          <div id="layoutPanel" hidden></div>
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

    if (!canEdit) $$('#colorControls, #shapeControls, #presetGrid, #layoutPanel').forEach(el => (el.style.pointerEvents = 'none', el.style.opacity = '.6'));

    bindSubtabs();
    renderTemplateGrid();
    loadTemplate();
    bindDevice();
    $('#publishBtn')?.addEventListener('click', () => {
      store.publishMenu(restaurant.id, menuId);
      window.MenuFlowShell.toast('Design published');
      init();
    });
  }

  function bindSubtabs() {
    $$('#designSubtabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        subtab = btn.dataset.tab;
        $$('#designSubtabs button').forEach(b => b.classList.toggle('active', b === btn));
        $('#stylePanel').hidden = subtab !== 'style';
        $('#layoutPanel').hidden = subtab !== 'layout';
      });
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
      message: 'Your fine-tuned colors and shapes for the current template will reset to its defaults. Menu content and layout are never affected.',
      confirmLabel: 'Switch template',
    }).then(ok => {
      if (!ok) return;
      store.updateMenu(restaurant.id, menuId, { template: id, theme: {} });
      renderTemplateGrid();
      loadTemplate();
      markSaved();
    });
  }

  function normalizeLayout(raw) {
    const l = raw && Object.keys(raw).length ? JSON.parse(JSON.stringify(raw)) : {};
    if (!l.blocks || !l.blocks.length) l.blocks = window.MenuFlowRenderer.DEFAULT_BLOCKS.map(b => Object.assign({}, b));
    l.hero = l.hero || {};
    l.footer = l.footer || {};
    return l;
  }

  function loadTemplate() {
    activeConfig = window.MenuFlowTemplateConfigs[currentMenu().template];
    theme = Object.assign({}, activeConfig.defaults, currentMenu().theme || {});
    layout = normalizeLayout(currentMenu().layout);
    $('#customizeTitle').textContent = `Customize ${activeConfig.name}`;
    renderPresets();
    renderColorControls();
    renderShapeControls();
    renderLayoutPanel();
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
        scheduleSave();
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
        scheduleSave();
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
          scheduleSave();
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

  // ---- Layout tab ----
  function defaultHeroImage() {
    return (window.MenuFlowMenuData && window.MenuFlowMenuData.restaurant.coverImage) || '';
  }
  function defaultFooterImage() {
    return (window.MenuFlowMenuData && (window.MenuFlowMenuData.restaurant.footerImage || window.MenuFlowMenuData.restaurant.coverImage)) || '';
  }

  function renderLayoutPanel() {
    const host = $('#layoutPanel');
    host.innerHTML = `
      <div class="dash-option-group">
        <span>Hero photo</span>
        <div class="layout-image-row">
          <div class="layout-image-thumb" id="heroThumb" style="background-image:url('${esc(layout.hero.image || defaultHeroImage())}')"></div>
          <div>
            <p class="layout-image-hint">${layout.hero.image ? 'Custom photo behind your restaurant name.' : 'Using your restaurant’s default cover photo.'}</p>
            <div class="button-row">
              <button class="btn btn--ghost" type="button" id="heroImageBtn" ${canEdit ? '' : 'disabled'}>Change photo</button>
              ${layout.hero.image ? `<button class="btn btn--ghost" type="button" id="heroImageReset" ${canEdit ? '' : 'disabled'}>Reset</button>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="dash-option-group">
        <span>Page sections</span>
        <p class="layout-image-hint">Drag to reorder. Hide, edit, or remove sections between your hero and closing footer.</p>
        <div class="layout-block-list" id="layoutBlockList"></div>
        <div class="layout-add-row">
          <button class="btn btn--ghost" type="button" id="addStoryBtn" ${canEdit ? '' : 'disabled'}>+ Add story section</button>
          <button class="btn btn--ghost" type="button" id="addGalleryBtn" ${canEdit ? '' : 'disabled'}>+ Add gallery</button>
        </div>
      </div>
      <div class="dash-option-group">
        <span>Closing section photo</span>
        <div class="layout-image-row">
          <div class="layout-image-thumb" id="footerThumb" style="background-image:url('${esc(layout.footer.image || defaultFooterImage())}')"></div>
          <div>
            <p class="layout-image-hint">${layout.footer.image ? 'Custom photo behind your closing message.' : 'Using your restaurant’s default photo.'}</p>
            <div class="button-row">
              <button class="btn btn--ghost" type="button" id="footerImageBtn" ${canEdit ? '' : 'disabled'}>Change photo</button>
              ${layout.footer.image ? `<button class="btn btn--ghost" type="button" id="footerImageReset" ${canEdit ? '' : 'disabled'}>Reset</button>` : ''}
            </div>
          </div>
        </div>
      </div>`;

    $('#heroImageBtn')?.addEventListener('click', () => openImagePicker(src => { layout.hero.image = src; scheduleSave(); renderLayoutPanel(); }));
    $('#heroImageReset')?.addEventListener('click', () => { layout.hero.image = null; scheduleSave(); renderLayoutPanel(); });
    $('#footerImageBtn')?.addEventListener('click', () => openImagePicker(src => { layout.footer.image = src; scheduleSave(); renderLayoutPanel(); }));
    $('#footerImageReset')?.addEventListener('click', () => { layout.footer.image = null; scheduleSave(); renderLayoutPanel(); });

    $('#addStoryBtn')?.addEventListener('click', () => {
      if (layout.blocks.some(b => b.type === 'story')) return;
      layout.blocks.push({ type: 'story', visible: true, heading: '', body: '', image: null, imagePosition: 'left' });
      expandedBlock = 'story';
      scheduleSave();
      renderBlockList();
    });
    $('#addGalleryBtn')?.addEventListener('click', () => {
      if (layout.blocks.some(b => b.type === 'gallery')) return;
      layout.blocks.push({ type: 'gallery', visible: true, heading: '', columns: 3, images: [] });
      expandedBlock = 'gallery';
      scheduleSave();
      renderBlockList();
    });

    renderBlockList();
    toggleAddButtons();
  }

  function toggleAddButtons() {
    const hasStory = layout.blocks.some(b => b.type === 'story');
    const hasGallery = layout.blocks.some(b => b.type === 'gallery');
    const storyBtn = $('#addStoryBtn'), galleryBtn = $('#addGalleryBtn');
    if (storyBtn) storyBtn.hidden = hasStory;
    if (galleryBtn) galleryBtn.hidden = hasGallery;
  }

  function renderBlockList() {
    const host = $('#layoutBlockList');
    if (!host) return;
    host.innerHTML = layout.blocks.map(block => {
      const meta = BLOCK_META[block.type] || { label: block.type, desc: '', locked: false, removable: false, editable: false };
      const isOpen = expandedBlock === block.type;
      return `<div class="layout-block-item" data-block-type="${block.type}">
        <div class="layout-block-row" draggable="${canEdit ? 'true' : 'false'}">
          <span class="drag-handle" aria-hidden="true">⠿</span>
          <div class="layout-block-info"><strong>${esc(meta.label)}</strong><span>${esc(meta.desc)}</span></div>
          ${meta.locked ? `<span class="layout-block-lock" title="Always visible">🔒</span>` : `<label class="toggle" title="Show on page"><input type="checkbox" data-visible-toggle ${block.visible !== false ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /><span class="toggle-track"></span></label>`}
          ${meta.editable ? `<button class="icon-btn" type="button" data-edit-toggle title="Edit">✎</button>` : ''}
          ${meta.removable ? `<button class="icon-btn icon-btn--danger" type="button" data-remove-block title="Remove">✕</button>` : ''}
        </div>
        ${meta.editable ? `<div class="layout-block-editor" ${isOpen ? '' : 'hidden'}>${block.type === 'story' ? storyEditorHtml(block) : galleryEditorHtml(block)}</div>` : ''}
      </div>`;
    }).join('');
    bindBlockListEvents();
    if (canEdit) bindBlockDrag(host);
  }

  function storyEditorHtml(block) {
    return `
      <div class="field"><label>Heading</label><input type="text" data-story-field="heading" value="${esc(block.heading || '')}" placeholder="Our story" ${canEdit ? '' : 'disabled'} /></div>
      <div class="field"><label>Text</label><textarea data-story-field="body" rows="3" placeholder="A few sentences about your restaurant..." ${canEdit ? '' : 'disabled'}>${esc(block.body || '')}</textarea></div>
      <div class="dash-option-group">
        <span>Photo</span>
        <div class="layout-image-row">
          <div class="layout-image-thumb" style="background-image:url('${esc(block.image || '')}')"></div>
          <div>
            <p class="layout-image-hint">${block.image ? 'Shown beside your text.' : 'Optional — add a photo for a split layout.'}</p>
            <div class="button-row">
              <button class="btn btn--ghost" type="button" data-story-image ${canEdit ? '' : 'disabled'}>${block.image ? 'Change photo' : 'Add photo'}</button>
              ${block.image ? `<button class="btn btn--ghost" type="button" data-story-image-remove ${canEdit ? '' : 'disabled'}>Remove</button>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="dash-option-group"><span>Photo position</span><div class="segmented" data-story-position>
        <button type="button" data-value="left" class="${(block.imagePosition || 'left') === 'left' ? 'active' : ''}" ${canEdit ? '' : 'disabled'}>Left</button>
        <button type="button" data-value="right" class="${block.imagePosition === 'right' ? 'active' : ''}" ${canEdit ? '' : 'disabled'}>Right</button>
      </div></div>`;
  }

  function galleryEditorHtml(block) {
    const images = block.images || [];
    return `
      <div class="field"><label>Heading</label><input type="text" data-gallery-field="heading" value="${esc(block.heading || '')}" placeholder="Gallery" ${canEdit ? '' : 'disabled'} /></div>
      <div class="dash-option-group"><span>Columns</span><div class="segmented" data-gallery-columns>
        ${[2, 3, 4].map(n => `<button type="button" data-value="${n}" class="${(Number(block.columns) || 3) === n ? 'active' : ''}" ${canEdit ? '' : 'disabled'}>${n}</button>`).join('')}
      </div></div>
      <div class="dash-option-group">
        <span>Photos</span>
        <div class="layout-gallery-grid">
          ${images.map((src, i) => `<div class="layout-gallery-thumb"><img src="${esc(src)}" alt="" />${canEdit ? `<button type="button" data-gallery-remove="${i}" aria-label="Remove photo">✕</button>` : ''}</div>`).join('')}
        </div>
        ${canEdit ? `<button class="btn btn--ghost" type="button" data-gallery-add>+ Add photo</button>` : ''}
      </div>`;
  }

  function findBlock(type) {
    return layout.blocks.find(b => b.type === type);
  }

  function bindBlockListEvents() {
    const host = $('#layoutBlockList');
    $$('[data-visible-toggle]', host).forEach(input => {
      input.addEventListener('change', () => {
        const block = findBlock(input.closest('.layout-block-item').dataset.blockType);
        block.visible = input.checked;
        scheduleSave();
      });
    });
    $$('[data-edit-toggle]', host).forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.closest('.layout-block-item').dataset.blockType;
        expandedBlock = expandedBlock === type ? null : type;
        renderBlockList();
      });
    });
    $$('[data-remove-block]', host).forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.closest('.layout-block-item').dataset.blockType;
        window.MenuFlowShell.confirmDialog({
          title: `Remove ${BLOCK_META[type]?.label || type}?`,
          message: 'This removes the section from your menu page. You can add it back any time.',
          confirmLabel: 'Remove section',
          danger: true,
        }).then(ok => {
          if (!ok) return;
          layout.blocks = layout.blocks.filter(b => b.type !== type);
          if (expandedBlock === type) expandedBlock = null;
          scheduleSave();
          renderBlockList();
          toggleAddButtons();
        });
      });
    });

    // Story editor
    $$('[data-story-field]', host).forEach(input => {
      input.addEventListener('input', () => {
        const block = findBlock('story');
        block[input.dataset.storyField] = input.value;
        scheduleSave();
      });
    });
    $('[data-story-image]', host)?.addEventListener('click', () => openImagePicker(src => {
      findBlock('story').image = src;
      scheduleSave();
      renderBlockList();
    }));
    $('[data-story-image-remove]', host)?.addEventListener('click', () => {
      findBlock('story').image = null;
      scheduleSave();
      renderBlockList();
    });
    $$('[data-story-position] button', host).forEach(btn => {
      btn.addEventListener('click', () => {
        findBlock('story').imagePosition = btn.dataset.value;
        scheduleSave();
        renderBlockList();
      });
    });

    // Gallery editor
    $$('[data-gallery-field]', host).forEach(input => {
      input.addEventListener('input', () => {
        findBlock('gallery')[input.dataset.galleryField] = input.value;
        scheduleSave();
      });
    });
    $$('[data-gallery-columns] button', host).forEach(btn => {
      btn.addEventListener('click', () => {
        findBlock('gallery').columns = Number(btn.dataset.value);
        scheduleSave();
        renderBlockList();
      });
    });
    $('[data-gallery-add]', host)?.addEventListener('click', () => openImagePicker(src => {
      const block = findBlock('gallery');
      block.images = [...(block.images || []), src];
      scheduleSave();
      renderBlockList();
    }));
    $$('[data-gallery-remove]', host).forEach(btn => {
      btn.addEventListener('click', () => {
        const block = findBlock('gallery');
        block.images = block.images.filter((_, i) => i !== Number(btn.dataset.galleryRemove));
        scheduleSave();
        renderBlockList();
      });
    });
  }

  function bindBlockDrag(host) {
    let draggingType = null;
    $$('.layout-block-row', host).forEach(row => {
      row.addEventListener('dragstart', () => {
        draggingType = row.closest('.layout-block-item').dataset.blockType;
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', event => {
        event.preventDefault();
        row.closest('.layout-block-item').classList.add('drag-over');
      });
      row.addEventListener('dragleave', () => row.closest('.layout-block-item').classList.remove('drag-over'));
      row.addEventListener('drop', event => {
        event.preventDefault();
        const item = row.closest('.layout-block-item');
        item.classList.remove('drag-over');
        const targetType = item.dataset.blockType;
        if (!draggingType || draggingType === targetType) return;
        const types = layout.blocks.map(b => b.type);
        const from = types.indexOf(draggingType);
        const to = types.indexOf(targetType);
        layout.blocks.splice(to, 0, layout.blocks.splice(from, 1)[0]);
        scheduleSave();
        renderBlockList();
      });
    });
  }

  // ---- Image picker (upload or pick from library) ----
  let imagePickerDialog;
  function ensureImagePickerDialog() {
    if (!imagePickerDialog) {
      imagePickerDialog = document.createElement('dialog');
      imagePickerDialog.className = 'dash-modal';
      document.body.appendChild(imagePickerDialog);
    }
    return imagePickerDialog;
  }

  function openImagePicker(onSelect) {
    const dialog = ensureImagePickerDialog();
    dialog.innerHTML = `
      <div class="dash-modal-body">
        <h2>Choose a photo</h2>
        <div class="image-picker-upload">
          <label class="btn btn--dark" for="imagePickerFile">Upload photo</label>
          <input type="file" id="imagePickerFile" accept="image/*" hidden />
          <span class="image-picker-hint">JPG or PNG — large photos are optimized automatically.</span>
        </div>
        <div class="image-picker-grid">
          ${LIBRARY_IMAGES.map(img => `<button type="button" class="image-picker-thumb" data-src="${esc(img.src)}" title="${esc(img.label)}"><img src="${esc(img.src)}" alt="${esc(img.label)}" loading="lazy" /></button>`).join('')}
        </div>
        <div class="dash-modal-actions"><button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button></div>
      </div>`;
    dialog.showModal();
    const close = () => dialog.close();
    dialog.querySelectorAll('[data-src]').forEach(btn => btn.addEventListener('click', () => { onSelect(btn.dataset.src); close(); }));
    dialog.querySelector('[data-choice="cancel"]').addEventListener('click', close);
    dialog.querySelector('#imagePickerFile').addEventListener('change', async event => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await downscaleImage(file);
        onSelect(dataUrl);
        close();
      } catch (error) {
        window.MenuFlowShell.toast('Could not read that image', 'error');
      }
    });
  }

  function downscaleImage(file, maxDim = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Unreadable image'));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---- Save + preview ----
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
  function scheduleSave() {
    if (!canEdit) return;
    markSaving();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      store.updateMenu(restaurant.id, menuId, { theme, layout });
      markSaved();
    }, 350);
    sendPreview();
  }

  function reloadFrame() {
    $('#previewFrame').src = `../templates/${activeConfig.id}.html?embed=1`;
  }

  function sendPreview() {
    const frame = $('#previewFrame');
    const targetOrigin = location.protocol === 'file:' ? '*' : location.origin;
    frame.contentWindow?.postMessage({ type: 'menuflow-preview', theme, layout }, targetOrigin);
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
    $('#previewFrame').addEventListener('load', sendPreview);
  }

  init();
})();
