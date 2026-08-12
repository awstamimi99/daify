(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const esc = window.MenuFlowShellCommon.esc;
  const store = window.MenuFlowPlansStore;
  let working = store.list().map(p => JSON.parse(JSON.stringify(p)));

  function render() {
    const content = window.MenuFlowAdminShell.render({
      active: 'plans',
      title: 'Plans',
      subtitle: 'Configure pricing, limits, and included services — shown live on the pricing page and dashboard billing.',
      actions: `<button class="btn btn--ghost" type="button" id="resetPlansBtn">Reset to defaults</button><button class="btn btn--dark" type="button" id="addPlanBtn">+ Add plan</button>`,
    });
    content.innerHTML = `<div class="plan-editor-grid" id="planGrid"></div>`;
    renderGrid();
    $('#addPlanBtn').addEventListener('click', addPlan);
    $('#resetPlansBtn').addEventListener('click', () => {
      window.MenuFlowShellCommon.confirmDialog({
        title: 'Reset all plans to defaults?',
        message: 'This discards every pricing/feature edit and restores the original Starter, Pro, and Business plans.',
        confirmLabel: 'Reset plans',
        danger: true,
      }).then(ok => {
        if (!ok) return;
        working = store.reset().map(p => JSON.parse(JSON.stringify(p)));
        window.MenuFlowShellCommon.toast('Plans reset to defaults');
        renderGrid();
      });
    });
  }

  function renderGrid() {
    $('#planGrid').innerHTML = working.map(planCard).join('');
    working.forEach(bindCard);
  }

  function planCard(p) {
    return `<div class="dash-card plan-editor-card" data-plan="${p.id}">
      <div class="field"><label>Plan name</label><input data-f="name" value="${esc(p.name)}" /></div>
      <div class="field" style="margin-top:.85rem"><label>Tagline (shown on the pricing card)</label><input data-f="tagline" value="${esc(p.tagline || '')}" /></div>
      <div class="field-row" style="margin-top:.85rem">
        <div class="field"><label>Badge (e.g. Most Popular)</label><input data-f="badge" value="${esc(p.badge || '')}" placeholder="None" /></div>
        <div class="field"><label>CTA button label</label><input data-f="ctaLabel" value="${esc(p.cta?.label || '')}" /></div>
      </div>

      <label class="plan-editor-check" style="margin-top:1rem"><input type="checkbox" data-f="customPricing" ${p.customPricing ? 'checked' : ''} /> Custom pricing (hide fixed price, show "Contact Sales")</label>

      <div class="plan-editor-pricing" ${p.customPricing ? 'hidden' : ''}>
        <div class="field-row" style="margin-top:.85rem">
          <div class="field"><label>Monthly price (USD)</label><input type="number" min="0" data-f="monthlyPrice" value="${p.monthlyPrice ?? ''}" /></div>
          <div class="field"><label>Yearly price (USD/mo)</label><input type="number" min="0" data-f="yearlyMonthlyPrice" value="${p.yearlyMonthlyPrice ?? ''}" /></div>
        </div>
        <p class="dash-hint" data-yearly-summary style="margin-top:.5rem"></p>
      </div>

      <div class="field-row" style="margin-top:1rem">
        <div class="field"><label>Restaurants limit</label><input data-f="limit-restaurants" value="${p.limits.restaurants}" /></div>
        <div class="field"><label>Menus limit</label><input data-f="limit-menus" value="${p.limits.menus}" /></div>
        <div class="field"><label>Managers limit</label><input data-f="limit-managers" value="${p.limits.managers}" /></div>
      </div>
      <p class="dash-hint" style="margin-top:.35rem">Enter a number, or the word <code>custom</code> for contract-based/unlimited.</p>

      <div class="field-row" style="margin-top:1rem">
        <div class="field"><label>Template access</label>
          <select data-f="templateAccess">
            <option value="core" ${p.templateAccess === 'core' ? 'selected' : ''}>Core templates</option>
            <option value="all" ${p.templateAccess === 'all' ? 'selected' : ''}>All templates</option>
            <option value="custom" ${p.templateAccess === 'custom' ? 'selected' : ''}>Custom templates</option>
          </select>
        </div>
        <div class="field"><label>Analytics tier</label>
          <select data-f="analyticsTier">
            <option value="basic" ${p.analyticsTier === 'basic' ? 'selected' : ''}>Basic</option>
            <option value="advanced" ${p.analyticsTier === 'advanced' ? 'selected' : ''}>Advanced</option>
            <option value="advanced-multi" ${p.analyticsTier === 'advanced-multi' ? 'selected' : ''}>Advanced + cross-location</option>
          </select>
        </div>
      </div>
      <label class="plan-editor-check" style="margin-top:.85rem"><input type="checkbox" data-f="customDesign" ${p.customDesign ? 'checked' : ''} /> Includes custom design / advanced customization</label>

      <div class="dash-option-group" style="margin-top:1.25rem">
        <span>Services included in this plan</span>
        <div class="plan-feature-list" data-features></div>
        <button class="btn btn--ghost" type="button" data-add-feature style="margin-top:.5rem">+ Add service</button>
      </div>

      <div class="button-row" style="margin-top:1.25rem">
        <button class="btn btn--dark" type="button" data-save>Save changes</button>
        <button class="btn btn--ghost icon-btn--danger" type="button" data-delete>Delete plan</button>
      </div>
    </div>`;
  }

  function featureRowHtml(value, index) {
    return `<div class="plan-feature-row" data-index="${index}"><input value="${esc(value)}" /><button type="button" aria-label="Remove">✕</button></div>`;
  }

  function bindCard(p) {
    const card = $(`[data-plan="${p.id}"]`);
    renderFeatures(card, p);
    updateYearlySummary(card, p);

    card.querySelectorAll('[data-f]').forEach(el => {
      el.addEventListener('input', () => syncField(card, p, el));
      el.addEventListener('change', () => syncField(card, p, el));
    });
    card.querySelector('[data-add-feature]').addEventListener('click', () => {
      p.features = [...p.features, ''];
      renderFeatures(card, p);
      card.querySelector('.plan-feature-row:last-child input').focus();
    });
    card.querySelector('[data-save]').addEventListener('click', () => savePlan(p));
    card.querySelector('[data-delete]').addEventListener('click', () => deletePlan(p));
  }

  function renderFeatures(card, p) {
    const host = card.querySelector('[data-features]');
    host.innerHTML = p.features.map((f, i) => featureRowHtml(f, i)).join('') || '<p class="dash-empty">No services listed.</p>';
    host.querySelectorAll('.plan-feature-row').forEach(row => {
      const i = Number(row.dataset.index);
      row.querySelector('input').addEventListener('input', e => { p.features[i] = e.target.value; });
      row.querySelector('button').addEventListener('click', () => {
        p.features = p.features.filter((_, idx) => idx !== i);
        renderFeatures(card, p);
      });
    });
  }

  function updateYearlySummary(card, p) {
    const el = card.querySelector('[data-yearly-summary]');
    if (!el) return;
    const monthly = Number(p.yearlyMonthlyPrice) || 0;
    const total = monthly * 12;
    const fullPriceTotal = (Number(p.monthlyPrice) || 0) * 12;
    const savings = Math.max(0, fullPriceTotal - total);
    el.textContent = `Billed $${total}/year annually · Save $${savings}/year vs. monthly`;
  }

  function syncField(card, p, el) {
    const key = el.dataset.f;
    if (key === 'customPricing') {
      p.customPricing = el.checked;
      card.querySelector('.plan-editor-pricing').hidden = el.checked;
      return;
    }
    if (key === 'customDesign') { p.customDesign = el.checked; return; }
    if (key === 'ctaLabel') { p.cta = Object.assign({}, p.cta, { label: el.value }); return; }
    if (key.startsWith('limit-')) {
      const limitKey = key.replace('limit-', '');
      const raw = el.value.trim();
      p.limits[limitKey] = /^custom$/i.test(raw) ? 'custom' : (Number(raw) || 0);
      return;
    }
    if (key === 'monthlyPrice' || key === 'yearlyMonthlyPrice') {
      p[key] = el.value === '' ? null : Number(el.value);
      p.yearlyTotal = (Number(p.yearlyMonthlyPrice) || 0) * 12;
      p.yearlySavings = Math.max(0, ((Number(p.monthlyPrice) || 0) * 12) - p.yearlyTotal);
      updateYearlySummary(card, p);
      return;
    }
    p[key] = el.value;
  }

  function savePlan(p) {
    p.features = p.features.filter(f => f.trim());
    store.save(working);
    window.MenuFlowAdminStore.addAudit('DAIFY Admin', 'Updated plan', p.name);
    window.MenuFlowShellCommon.toast(`${p.name} plan saved`);
  }

  function deletePlan(p) {
    window.MenuFlowShellCommon.confirmDialog({
      title: `Delete the ${p.name} plan?`,
      message: 'Restaurants currently on this plan keep their assignment, but it disappears from pricing and new signups. This cannot be undone.',
      confirmLabel: 'Delete plan',
      danger: true,
    }).then(ok => {
      if (!ok) return;
      working = working.filter(x => x.id !== p.id);
      store.save(working);
      window.MenuFlowAdminStore.addAudit('DAIFY Admin', 'Deleted plan', p.name);
      window.MenuFlowShellCommon.toast('Plan deleted');
      renderGrid();
    });
  }

  function addPlan() {
    const id = `plan-${Date.now().toString(36)}`;
    working = [...working, {
      id, name: 'New plan', tagline: '', badge: null, customPricing: false,
      monthlyPrice: 0, yearlyMonthlyPrice: 0, yearlyTotal: 0, yearlySavings: 0,
      limits: { restaurants: 1, menus: 1, managers: 1 },
      templateAccess: 'core', customDesign: false, analyticsTier: 'basic',
      cta: { label: 'Get started', href: 'signup.html' }, highlights: [], features: [],
    }];
    renderGrid();
    $(`[data-plan="${id}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  render();
})();
