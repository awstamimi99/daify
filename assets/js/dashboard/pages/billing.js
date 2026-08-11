(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;
  const canManage = store.can(window.MenuFlowPermissions.PERMISSIONS.BILLING_MANAGE);

  function render() {
    const restaurant = store.getActiveRestaurant();
    const sub = window.MenuFlowSubscriptionsSeed[restaurant.id];
    const plan = window.MenuFlowPlansSeed.find(p => p.id === sub.planId);

    const content = window.MenuFlowShell.render({
      active: 'billing',
      title: 'Billing',
      breadcrumb: esc(restaurant.name),
      subtitle: 'Your plan, usage, and renewal details.',
    });

    const statusKind = { active: 'success', trial: 'info', 'past due': 'danger' }[sub.status] || 'neutral';

    content.innerHTML = `
      <div class="dash-card" style="margin-bottom:1.75rem">
        <div class="dash-card-header">
          <div><h2>${esc(plan.name)} plan</h2><p>$${plan.price}/${sub.billingCycle === 'monthly' ? 'month' : 'year'} · Renews ${esc(sub.renewsAt)}</p></div>
          <span class="status-badge status-badge--${statusKind}">${sub.status === 'trial' ? 'Trial' : sub.status === 'active' ? 'Active' : sub.status}</span>
        </div>
        <div class="button-row">
          ${canManage ? `<button class="btn btn--dark" type="button" id="upgradeBtn">Upgrade plan</button><button class="btn btn--ghost" type="button" id="changePlanBtn">Change plan</button><button class="btn btn--ghost" type="button" id="cancelBtn">Cancel subscription</button>` : `<span class="status-badge status-badge--neutral">Only the owner can manage billing</span>`}
        </div>
      </div>

      <div class="dash-card" style="margin-bottom:1.75rem">
        <div class="dash-card-header"><div><h2>Usage</h2><p>Based on your ${esc(plan.name)} plan limits.</p></div></div>
        <div class="chart-legend-list">
          ${usageRow('Restaurants', sub.usage.restaurants, plan.limits.restaurants)}
          ${usageRow('Menus', sub.usage.menus, plan.limits.menus)}
          ${usageRow('Team members', sub.usage.teamMembers, plan.limits.teamMembers)}
          ${usageRow('Storage', sub.usage.storageMb, plan.limits.storageMb, 'MB')}
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-header"><div><h2>Compare plans</h2></div></div>
        <div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Plan</th><th>Price</th><th>Restaurants</th><th>Menus</th><th>Team</th><th>Storage</th></tr></thead><tbody>
          ${window.MenuFlowPlansSeed.map(p => `<tr>
            <td data-label="Plan" class="cell-primary">${esc(p.name)}${p.id === plan.id ? ' <span class=\"status-badge status-badge--success\">Current</span>' : ''}</td>
            <td data-label="Price">$${p.price}/mo</td>
            <td data-label="Restaurants">${p.limits.restaurants}</td>
            <td data-label="Menus">${p.limits.menus}</td>
            <td data-label="Team">${p.limits.teamMembers}</td>
            <td data-label="Storage">${p.limits.storageMb >= 1000 ? (p.limits.storageMb / 1000) + ' GB' : p.limits.storageMb + ' MB'}</td>
          </tr>`).join('')}
        </tbody></table></div>
      </div>`;

    bindActions(restaurant, plan);
  }

  function usageRow(label, used, limit, unit = '') {
    const pct = Math.min(100, Math.round((used / limit) * 100));
    return `<div class="chart-legend-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;${pct > 90 ? 'background:var(--dash-danger)' : ''}"></div></div><strong>${used}${unit} / ${limit}${unit}</strong></div>`;
  }

  function bindActions(restaurant, plan) {
    $('#upgradeBtn')?.addEventListener('click', () => {
      window.location.href = '../pricing.html';
    });
    $('#changePlanBtn')?.addEventListener('click', () => {
      window.location.href = '../pricing.html';
    });
    $('#cancelBtn')?.addEventListener('click', () => {
      window.MenuFlowShell.confirmDialog({
        title: 'Cancel your subscription?',
        message: `You'll keep ${plan.name} access until the end of your current billing period (${restaurant.name} renews ${window.MenuFlowSubscriptionsSeed[restaurant.id].renewsAt}), then your menus will be unpublished.`,
        confirmLabel: 'Cancel subscription',
        danger: true,
      }).then(ok => {
        if (ok) window.MenuFlowShell.toast('This is a prototype — cancellation isn\'t wired up to real billing yet.', 'error');
      });
    });
  }

  render();
})();
