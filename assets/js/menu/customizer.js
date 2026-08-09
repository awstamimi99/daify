(function () {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const shapeValues = {cardShape:{square:'0px',soft:'14px',rounded:'28px'},buttonShape:{square:'0px',rounded:'12px',pill:'999px'}};
  let activeConfig;
  let theme = {};

  function themeFromUrl() {
    const value = new URLSearchParams(location.search).get('theme');
    if (!value) return {};
    try { return JSON.parse(value); } catch (error) { return {}; }
  }

  function init() {
    const configs = window.MenuFlowTemplateConfigs;
    const requested = new URLSearchParams(location.search).get('template');
    $('#templateSelect').innerHTML = Object.values(configs).map(config => `<option value="${config.id}">${config.name} · ${config.category}</option>`).join('');
    $('#templateSelect').value = configs[requested] ? requested : 'atelier';
    $('#templateSelect').addEventListener('change', () => loadTemplate());
    $('#presetSelect').addEventListener('change', applyPreset);
    $('#languageSelect').addEventListener('change', reloadFrame);
    $$('[data-theme]').forEach(input => input.addEventListener('input', () => {theme[input.dataset.theme]=input.value;sendTheme()}));
    $$('[data-device]').forEach(button => button.addEventListener('click', () => {$$('[data-device]').forEach(item=>item.classList.remove('active'));button.classList.add('active');$('.preview-canvas').dataset.device=button.dataset.device}));
    $('#menuPreview').addEventListener('load', sendTheme);
    loadTemplate(themeFromUrl());
  }

  function loadTemplate(overrides = {}) {
    activeConfig = window.MenuFlowTemplateConfigs[$('#templateSelect').value];
    theme = Object.assign({}, activeConfig.defaults, overrides);
    $('#workspaceTitle').textContent = activeConfig.name;
    $('#presetSelect').innerHTML = Object.keys(activeConfig.presets).map(name=>`<option>${name}</option>`).join('');
    Object.entries(activeConfig.supports).forEach(([key,values]) => renderOptions(key,values));
    syncInputs(); reloadFrame();
  }

  function renderOptions(key, values) {
    const host = document.querySelector(`[data-options="${key}"]`);
    if (!host) return;
    const group = host.closest('[data-capability]'); group.hidden = !values?.length;
    host.innerHTML = (values || []).map(value=>`<button type="button" data-value="${value}">${value.replace('-',' ')}</button>`).join('');
    host.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
      if (shapeValues[key]) theme[key === 'cardShape' ? 'cardRadius' : 'buttonRadius'] = shapeValues[key][button.dataset.value];
      else theme[key] = button.dataset.value;
      host.querySelectorAll('button').forEach(item=>item.classList.remove('active'));button.classList.add('active');sendTheme();
    }));
  }

  function applyPreset() { Object.assign(theme,activeConfig.presets[$('#presetSelect').value]);syncInputs();sendTheme(); }
  function syncInputs() {
    $$('[data-theme]').forEach(input=>input.value=theme[input.dataset.theme]);
    Object.entries(activeConfig.supports).forEach(([key])=>{
      const host=document.querySelector(`[data-options="${key}"]`);if(!host)return;
      let current=theme[key];
      if(shapeValues[key]){const prop=key==='cardShape'?'cardRadius':'buttonRadius';current=Object.keys(shapeValues[key]).find(name=>shapeValues[key][name]===theme[prop])}
      host.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.value===current));
    });
  }
  function previewUrl(mode) {
    const id = activeConfig.id;
    const lang = $('#languageSelect').value;
    const params = new URLSearchParams({[mode]:'1',lang,theme:JSON.stringify(theme)});
    return `templates/${id}.html?${params}`;
  }
  function reloadFrame(){
    $('#menuPreview').src=previewUrl('embed');
    $('#openTemplate').href=previewUrl('preview');
  }
  function sendTheme(){
    const frame = $('#menuPreview');
    const targetOrigin = location.protocol === 'file:' ? '*' : location.origin;
    frame.contentWindow?.postMessage({type:'menuflow-theme',theme},targetOrigin);
    $('#openTemplate').href=previewUrl('preview');
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
