(function () {
  function $(s, c) { return (c || document).querySelector(s); }

  function render() {
    const state = window.MenuFlowStore.getState();
    const sections = state.sections || [];
    const items = sections.flatMap(s => s.items || []);
    const unavailable = items.filter(it => it.available === false).length;
    const featured = items.filter(it => it.featured).length;

    $('#statSections').textContent = String(sections.length);
    $('#statItems').textContent = String(items.length);
    $('#statUnavailable').textContent = String(unavailable);
    $('#statFeatured').textContent = String(featured);

    const hasCustomTheme = state.theme && Object.keys(state.theme).length > 0;
    const checklist = [
      { label: 'Choose a starting template', done: Boolean(state.selectedTemplate) },
      { label: 'Add your first dish', done: items.length > 0 },
      { label: 'Customize your colors and layout', done: hasCustomTheme || Boolean(state.meta?.customizedDesign) },
      { label: 'Preview your QR code', done: Boolean(state.meta?.visitedQr) },
    ];

    const list = $('#dashChecklist');
    list.innerHTML = checklist
      .map(
        step => `<li class="${step.done ? 'done' : ''}"><span class="dash-check-icon" aria-hidden="true">${step.done ? '✓' : ''}</span><span>${step.label}</span></li>`
      )
      .join('');
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', render) : render();
})();
