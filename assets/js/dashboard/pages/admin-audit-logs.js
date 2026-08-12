(function () {
  const logs = window.MenuFlowAdminStore.auditLogs();
  const content = window.MenuFlowAdminShell.render({ active: 'audit-logs', title: 'Audit Logs', subtitle: 'Platform-wide record of important actions.' });
  content.innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>Time</th></tr></thead><tbody>
    ${logs.map(l => `<tr><td data-label="User" class="cell-primary">${l.user}</td><td data-label="Action">${l.action}</td><td data-label="Resource" class="cell-muted">${l.resource}</td><td data-label="Time" class="cell-muted">${l.time}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="dash-hint" style="margin-top:1rem">Restaurant owners see a restaurant-scoped version of this log from their own dashboard in a future release — this platform-wide view is admin-only.</div>`;
})();
