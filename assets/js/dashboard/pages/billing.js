(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;
  const canManage = store.can(window.MenuFlowPermissions.PERMISSIONS.BILLING_MANAGE);

  function priceLine(plan, cycle) {
    if (plan.customPricing) return 'Custom pricing';
    return cycle === 'yearly' ? `$${plan.yearlyMonthlyPrice}/mo · billed $${plan.yearlyTotal}/year` : `$${plan.monthlyPrice}/month`;
  }

  function planPriceCell(plan) {
    if (plan.customPricing) return 'Custom';
    return `$${plan.monthlyPrice}/mo`;
  }

  function limitText(value) {
    return value === 'custom' ? 'Custom' : value;
  }

  function render() {
    const restaurant = store.getActiveRestaurant();
    const sub = store.getSubscription(restaurant.id);
    const plan = store.planFor(restaurant.id);
    const usage = store.usageFor(restaurant.id);

    const content = window.MenuFlowShell.render({
      active: 'billing',
      title: 'Billing',
      breadcrumb: esc(restaurant.name),
      subtitle: 'Your plan, usage, and renewal details.',
    });
    if (!window.MenuFlowShell.requirePermission(window.MenuFlowPermissions.PERMISSIONS.BILLING_VIEW, content)) return;

    const statusKind = { active: 'success', trial: 'info', past_due: 'danger', expired: 'neutral', cancelled: 'neutral' }[sub.status] || 'neutral';

    content.innerHTML = `
      <div class="dash-card" style="margin-bottom:1.75rem">
        <div class="dash-card-header">
          <div><h2>${esc(plan.name)} plan ${plan.badge ? `<span class="status-badge status-badge--info">${esc(plan.badge)}</span>` : ''}</h2><p>${esc(priceLine(plan, sub.billingCycle))}${sub.renewsAt ? ` · Renews ${esc(sub.renewsAt)}` : ''}</p></div>
          <span class="status-badge status-badge--${statusKind}">${sub.status === 'trial' ? 'Trial' : sub.status === 'past_due' ? 'Past due' : sub.status === 'active' ? 'Active' : esc(sub.status)}</span>
        </div>
        ${!plan.customPricing ? `<div class="dash-option-group" style="margin-bottom:1rem">
          <span>Billing cycle</span>
          <div class="segmented" id="cycleToggle">
            <button type="button" data-cycle="monthly" class="${sub.billingCycle === 'monthly' ? 'active' : ''}" ${canManage ? '' : 'disabled'}>Monthly</button>
            <button type="button" data-cycle="yearly" class="${sub.billingCycle === 'yearly' ? 'active' : ''}" ${canManage ? '' : 'disabled'}>Yearly · save $${plan.yearlySavings}/yr</button>
          </div>
        </div>` : ''}
        <div class="button-row">
          ${canManage ? `<button class="btn btn--dark" type="button" id="changePlanBtn">Change plan</button><button class="btn btn--ghost" type="button" id="cancelBtn">Cancel subscription</button>` : `<span class="status-badge status-badge--neutral">Only the owner can manage billing</span>`}
        </div>
      </div>

      <div class="dash-card" style="margin-bottom:1.75rem">
        <div class="dash-card-header"><div><h2>Usage</h2><p>Based on your ${esc(plan.name)} plan limits.</p></div></div>
        <div class="chart-legend-list">
          ${usageRow('Restaurants', usage.restaurants, plan.limits.restaurants)}
          ${usageRow('Menus', usage.menus, plan.limits.menus)}
          ${usageRow('Managers', usage.managers, plan.limits.managers)}
        </div>
      </div>

      <div class="dash-card" style="margin-bottom:1.75rem">
        <div class="dash-card-header"><div><h2>What's included</h2></div></div>
        <ul class="dash-checklist">
          ${plan.features.map(f => `<li><span class="dash-check-icon" style="background:var(--dash-bg);color:var(--mf-sage-dark);border-color:var(--dash-border)">✓</span><span style="flex:1">${esc(f)}</span></li>`).join('')}
        </ul>
      </div>

      <div class="dash-card">
        <div class="dash-card-header"><div><h2>Compare plans</h2></div></div>
        <div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Plan</th><th>Price</th><th>Restaurants</th><th>Menus</th><th>Managers</th></tr></thead><tbody>
          ${(window.MenuFlowPlansSeed || []).map(p => `<tr>
            <td data-label="Plan" class="cell-primary">${esc(p.name)}${p.id === plan.id ? ' <span class="status-badge status-badge--success">Current</span>' : ''}</td>
            <td data-label="Price">${planPriceCell(p)}</td>
            <td data-label="Restaurants">${limitText(p.limits.restaurants)}</td>
            <td data-label="Menus">${limitText(p.limits.menus)}</td>
            <td data-label="Managers">${limitText(p.limits.managers)}</td>
          </tr>`).join('')}
        </tbody></table></div>
      </div>`;

    bindActions(restaurant, plan, sub);
  }

  function usageRow(label, used, limit) {
    if (limit === 'custom') return `<div class="chart-legend-row"><span>${label}</span><div class="bar-track"></div><strong>${used} / Custom</strong></div>`;
    const pct = Math.min(100, Math.round((used / limit) * 100));
    return `<div class="chart-legend-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;${pct >= 100 ? 'background:var(--dash-danger)' : ''}"></div></div><strong>${used} / ${limit}</strong></div>`;
  }

  function bindActions(restaurant, plan, sub) {
    $('#changePlanBtn')?.addEventListener('click', () => {
      window.MenuFlowShell.openPlanUpgradeDialog({
        mode: 'change-plan',
        restaurantId: restaurant.id,
        onSubmit: async ({ planId, billingCycle }) => {
          store.updateSubscription(restaurant.id, { planId, billingCycle, status: 'active' });
          window.MenuFlowShell.toast('Plan updated.');
          render();
          return { ok: true };
        },
      });
    });
    $$('#cycleToggle button').forEach(btn => btn.addEventListener('click', () => {
      const cycle = btn.dataset.cycle;
      if (cycle === sub.billingCycle) return;
      store.updateSubscription(restaurant.id, { billingCycle: cycle });
      window.MenuFlowShell.toast(cycle === 'yearly' ? `Switched to yearly billing — saving $${plan.yearlySavings}/year` : 'Switched to monthly billing');
      render();
    }));
    $('#cancelBtn')?.addEventListener('click', () => {
      window.MenuFlowShell.confirmDialog({
        title: 'Cancel your subscription?',
        message: `You'll keep ${plan.name} access until the end of your current billing period${sub.renewsAt ? ` (renews ${sub.renewsAt})` : ''}, then your menus will be unpublished.`,
        confirmLabel: 'Cancel subscription',
        danger: true,
      }).then(ok => {
        if (ok) window.MenuFlowShell.toast('This is a prototype — cancellation isn\'t wired up to real billing yet.', 'error');
      });
    });
  }

  render();
})();
