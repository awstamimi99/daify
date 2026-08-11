(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const plans = window.MenuFlowPlansSeed;

  function render() {
    const content = window.MenuFlowAdminShell.render({ active: 'plans', title: 'Plans', subtitle: 'Visual plan configuration — pricing and limits shown across the product.' });
    content.innerHTML = `<div class="dash-design-grid" style="grid-template-columns:repeat(3,1fr)">
      ${plans.map(p => planCard(p)).join('')}
    </div>
    <div class="dash-hint" style="margin-top:1.5rem">Editing here updates the demo plan catalog used across the dashboard and pricing page for this session. Real billing enforcement happens once Drupal Commerce (or equivalent) is connected.</div>`;
    bindEdit();
  }

  function planCard(p) {
    return `<div class="dash-card" data-plan="${p.id}">
      <div class="dash-card-header"><div><h2>${p.name}</h2><p>${p.templateAccess === 'all' ? 'All templates' : 'Core templates'} · Analytics ${p.analytics ? 'included' : 'not included'}</p></div></div>
      <div class="field" style="margin-bottom:.85rem"><label>Price (USD/mo)</label><input type="number" data-field="price" value="${p.price}" /></div>
      <div class="field-row" style="margin-bottom:.85rem">
        <div class="field"><label>Restaurants limit</label><input type="number" data-field="restaurants" value="${p.limits.restaurants}" /></div>
        <div class="field"><label>Menus limit</label><input type="number" data-field="menus" value="${p.limits.menus}" /></div>
      </div>
      <div class="field-row" style="margin-bottom:.85rem">
        <div class="field"><label>Team members limit</label><input type="number" data-field="teamMembers" value="${p.limits.teamMembers}" /></div>
        <div class="field"><label>Storage (MB)</label><input type="number" data-field="storageMb" value="${p.limits.storageMb}" /></div>
      </div>
      <button class="btn btn--ghost" type="button" data-save="${p.id}">Save changes</button>
    </div>`;
  }

  function bindEdit() {
    $$('[data-save]').forEach(btn => btn.addEventListener('click', () => {
      const card = btn.closest('[data-plan]');
      const plan = plans.find(p => p.id === card.dataset.plan);
      plan.price = Number(card.querySelector('[data-field="price"]').value);
      plan.limits.restaurants = Number(card.querySelector('[data-field="restaurants"]').value);
      plan.limits.menus = Number(card.querySelector('[data-field="menus"]').value);
      plan.limits.teamMembers = Number(card.querySelector('[data-field="teamMembers"]').value);
      plan.limits.storageMb = Number(card.querySelector('[data-field="storageMb"]').value);
      window.MenuFlowShellCommon.toast(`${plan.name} plan updated`);
    }));
  }

  render();
})();
