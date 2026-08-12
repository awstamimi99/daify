(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const configs = window.MenuFlowTemplateConfigs || {};
  const slugs = Object.keys(configs);
  let slug = params.get('template') && configs[params.get('template')] ? params.get('template') : 'atelier';
  let lang = params.get('lang') === 'ar' ? 'ar' : 'en';
  let config = configs[slug];
  const frame = $('#tpvFrame');
  const frameState = $('#tpvFrameState');
  const messageTarget = location.protocol === 'file:' ? '*' : location.origin;

  function syncPage() {
    document.title = `${config.name} — Template Preview — DAIFY`;
    $('#tpvName').textContent = config.name;
    $('#tpvCategory').textContent = config.category;
    $('#tpvDescription').textContent = config.description;
    $('#tpvCustomize').href = `template-customizer.html?template=${slug}`;
    $('#tpvPosition').textContent = `${slugs.indexOf(slug) + 1} / ${slugs.length}`;
    $('#tpvLang').textContent = lang === 'ar' ? 'English' : 'العربية';
    $$('#tpvPicker button').forEach(button => {
      const active = button.dataset.template === slug;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      if (active) button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  function renderPicker() {
    $('#tpvPicker').innerHTML = slugs.map(id => {
      const item = configs[id];
      return `<button type="button" data-template="${id}" aria-label="Preview ${item.name}">
        <span class="tpv-thumb"><img src="assets/images/template-previews/${id}.jpg" alt="" loading="lazy" /></span>
        <span class="tpv-thumb-meta"><strong>${item.name}</strong><small>${item.category}</small></span>
      </button>`;
    }).join('');
  }

  function setLoading(isLoading, hasError = false) {
    frameState.classList.toggle('is-hidden', !isLoading && !hasError);
    frameState.classList.toggle('is-error', hasError);
    if (hasError) {
      frameState.querySelector('strong').textContent = 'Preview could not load';
      frameState.querySelector('small').textContent = 'Choose another template or refresh the page.';
    } else {
      frameState.querySelector('strong').textContent = 'Preparing your preview';
      frameState.querySelector('small').textContent = 'Loading the sample menu…';
    }
  }

  function loadFrame() {
    setLoading(true);
    const query = new URLSearchParams({ embed: '1', sample: '1', lang });
    const theme = params.get('theme');
    if (theme) query.set('theme', theme);
    frame.src = `templates/${slug}.html?${query}`;
  }

  function selectTemplate(nextSlug) {
    if (!configs[nextSlug] || nextSlug === slug) return;
    slug = nextSlug;
    config = configs[slug];
    params.set('template', slug);
    history.replaceState(null, '', `${location.pathname}?${params}`);
    syncPage();
    loadFrame();
  }

  function setDevice(device) {
    $('#tpvCanvasWrap').dataset.device = device;
    $$('#tpvDevices button').forEach(b => b.classList.toggle('active', b.dataset.device === device));
  }

  $$('#tpvDevices button').forEach(btn => btn.addEventListener('click', () => setDevice(btn.dataset.device)));
  $('#tpvPicker').addEventListener('click', event => {
    const button = event.target.closest('button[data-template]');
    if (button) selectTemplate(button.dataset.template);
  });
  $('#tpvLang').addEventListener('click', () => {
    lang = lang === 'ar' ? 'en' : 'ar';
    params.set('lang', lang);
    history.replaceState(null, '', `${location.pathname}?${params}`);
    syncPage();
    frame.contentWindow?.postMessage({ type: 'menuflow-language', lang }, messageTarget);
  });

  frame.addEventListener('load', () => {
    // file:// documents have opaque origins in Chrome, so a parent-page DOM
    // inspection can report a false failure even though the menu rendered.
    // A successful iframe load is authoritative in that mode. Over HTTP we
    // can additionally validate that the renderer populated #menu-root.
    if (location.protocol === 'file:') {
      setLoading(false);
      return;
    }
    requestAnimationFrame(() => {
      try {
        const root = frame.contentDocument?.querySelector('#menu-root');
        setLoading(false, !root || !root.children.length);
      } catch (error) {
        setLoading(false);
      }
    });
  });
  frame.addEventListener('error', () => setLoading(false, true));

  renderPicker();
  syncPage();
  setDevice('mobile');
  loadFrame();
})();
