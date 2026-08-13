(function () {
  const sec = window.MenuFlowAdminStore.security();
  const content = window.MenuFlowAdminShell.render({ active: 'security', title: 'Security', subtitle: 'Platform security overview.' });

  content.innerHTML = `
    <div class="dash-stats">
      <div class="dash-stat"><span>Failed logins (24h)</span><strong>${sec.failedLogins24h}</strong></div>
      <div class="dash-stat"><span>Suspicious activity</span><strong>${sec.suspiciousActivity}</strong></div>
      <div class="dash-stat"><span>Disabled accounts</span><strong>${sec.disabledAccounts}</strong></div>
      <div class="dash-stat"><span>Recent password resets</span><strong>${sec.recentPasswordResets}</strong></div>
    </div>
    <div class="dash-card">
      <div class="dash-card-header"><div><h2>Recent security events</h2><p>Fed by the production audit and security pipeline — shown here as illustrative demo data.</p></div></div>
      <div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Type</th><th>Detail</th><th>User</th><th>Time</th></tr></thead><tbody>
        ${sec.events.map(e => `<tr><td data-label="Type" class="cell-primary">${e.type}</td><td data-label="Detail" class="cell-muted">${e.detail}</td><td data-label="User" class="cell-muted">${e.user}</td><td data-label="Time" class="cell-muted">${e.time}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
})();
