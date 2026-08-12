(function () {
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShellCommon.esc;

  function statusKind(s) {
    return { active: 'success', trial: 'info', past_due: 'warning', cancelled: 'neutral', expired: 'danger' }[s] || 'neutral';
  }
  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');
  }

  const restaurants = store.listRestaurants();
  const rows = restaurants
    .map(r => ({ restaurant: r, sub: store.getSubscription(r.id), plan: store.planFor(r.id) }))
    .filter(row => row.sub);

  const content = window.MenuFlowAdminShell.render({ active: 'subscriptions', title: 'Subscriptions', subtitle: 'Billing status across every restaurant.' });
  content.innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Restaurant</th><th>Plan</th><th>Cycle</th><th>Status</th><th>Started</th><th>Renews</th></tr></thead><tbody>
    ${rows.map(({ restaurant, sub, plan }) => `<tr>
      <td data-label="Restaurant" class="cell-primary">${esc(restaurant.name)}${restaurant.location ? ` <span class="cell-muted">— ${esc(restaurant.location)}</span>` : ''}</td>
      <td data-label="Plan">${esc(plan?.name || sub.planId)}</td>
      <td data-label="Cycle" class="cell-muted" style="text-transform:capitalize">${esc(sub.billingCycle)}</td>
      <td data-label="Status"><span class="status-badge status-badge--${statusKind(sub.status)}">${cap(sub.status)}</span></td>
      <td data-label="Started" class="cell-muted">${esc(sub.startedAt)}</td>
      <td data-label="Renews" class="cell-muted">${esc(sub.renewsAt || '—')}</td>
    </tr>`).join('')}
  </tbody></table></div>
  <div class="dash-hint" style="margin-top:1rem">No real payment integration in this prototype — plan/cycle changes here happen instantly with no charge, from each restaurant's admin detail page.</div>`;
})();
