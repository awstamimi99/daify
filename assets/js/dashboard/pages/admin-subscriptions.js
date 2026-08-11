(function () {
  const data = window.MenuFlowAdminSeed;
  function statusKind(s) {
    return { Active: 'success', Trial: 'info', 'Past Due': 'warning', Cancelled: 'neutral', Expired: 'danger' }[s] || 'neutral';
  }
  const content = window.MenuFlowAdminShell.render({ active: 'subscriptions', title: 'Subscriptions', subtitle: 'Billing status across every restaurant.' });
  content.innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Restaurant</th><th>Plan</th><th>Cycle</th><th>Status</th><th>Started</th><th>Renews</th></tr></thead><tbody>
    ${data.subscriptions.map(s => `<tr>
      <td data-label="Restaurant" class="cell-primary">${s.restaurant}</td>
      <td data-label="Plan">${s.plan}</td>
      <td data-label="Cycle" class="cell-muted">${s.cycle}</td>
      <td data-label="Status"><span class="status-badge status-badge--${statusKind(s.status)}">${s.status}</span></td>
      <td data-label="Started" class="cell-muted">${s.started}</td>
      <td data-label="Renews" class="cell-muted">${s.renews}</td>
    </tr>`).join('')}
  </tbody></table></div>
  <div class="dash-hint" style="margin-top:1rem">No real payment integration in this prototype — statuses are illustrative demo data.</div>`;
})();
