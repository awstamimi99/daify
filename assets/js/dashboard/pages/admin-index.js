(function () {
  const $ = s => document.querySelector(s);
  const data = window.MenuFlowAdminSeed;

  function render() {
    const content = window.MenuFlowAdminShell.render({ active: 'overview', title: 'Platform Overview', subtitle: "How MenuFlow is doing today." });
    const restaurants = data.platformRestaurants;
    const active = restaurants.filter(r => r.status === 'active').length;
    const trial = restaurants.filter(r => r.status === 'trial').length;
    const publishedMenus = data.platformAnalytics.publishedMenus;
    const mrr = restaurants.reduce((sum, r) => sum + ({ Starter: 12, Pro: 29, Business: 69 }[r.plan] || 0), 0);

    content.innerHTML = `
      <div class="dash-stats">
        <div class="dash-stat"><span>Restaurants</span><strong>${restaurants.length}</strong></div>
        <div class="dash-stat"><span>Active subscriptions</span><strong>${active}</strong></div>
        <div class="dash-stat"><span>Trial accounts</span><strong>${trial}</strong></div>
        <div class="dash-stat"><span>Users</span><strong>${data.platformUsers.length}</strong></div>
      </div>
      <div class="dash-stats">
        <div class="dash-stat"><span>Published menus</span><strong>${publishedMenus}</strong></div>
        <div class="dash-stat"><span>Menus created</span><strong>${data.platformAnalytics.activeRestaurants}</strong></div>
        <div class="dash-stat"><span>MRR (placeholder)</span><strong>$${mrr.toLocaleString()}</strong><small>demo estimate</small></div>
        <div class="dash-stat"><span>Recent signups</span><strong>${data.platformAnalytics.signupsOverTime.slice(-1)[0]}</strong><small>this week</small></div>
      </div>

      <div class="dash-design-grid">
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Recent restaurants</h2></div><a class="btn btn--ghost" href="restaurants.html" style="padding:.5rem .9rem;font-size:.76rem">View all</a></div>
          <div class="dash-table-wrap"><table class="dash-table"><tbody>
            ${restaurants.slice(0, 5).map(r => `<tr><td data-label="Restaurant" class="cell-primary">${r.name}</td><td data-label="Plan" class="cell-muted">${r.plan}</td><td data-label="Status"><span class="status-badge status-badge--${statusKind(r.status)}">${cap(r.status)}</span></td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Security alerts</h2></div><a class="btn btn--ghost" href="security.html" style="padding:.5rem .9rem;font-size:.76rem">View all</a></div>
          <ul class="dash-checklist">
            ${data.securityEvents.events.slice(0, 4).map(e => `<li><span class="dash-check-icon" style="background:var(--dash-warning-bg);color:var(--dash-warning);border-color:var(--dash-warning-bg)">!</span><span style="flex:1"><strong style="font-weight:600">${e.type}</strong><br><small style="color:var(--dash-text-muted)">${e.detail} · ${e.time}</small></span></li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="dash-card" style="margin-top:1.75rem">
        <div class="dash-card-header"><div><h2>Open support issues</h2></div><a class="btn btn--ghost" href="support.html" style="padding:.5rem .9rem;font-size:.76rem">View all</a></div>
        <div class="dash-table-wrap"><table class="dash-table"><tbody>
          ${data.supportTickets.filter(t => t.status !== 'Resolved').map(t => `<tr><td data-label="Client" class="cell-primary">${t.client}</td><td data-label="Subject" class="cell-muted">${t.subject}</td><td data-label="Priority"><span class="status-badge status-badge--${t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'neutral'}">${t.priority}</span></td><td data-label="Status"><span class="status-badge status-badge--info">${t.status}</span></td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  }

  function statusKind(s) {
    return { active: 'success', trial: 'info', suspended: 'danger', expired: 'neutral' }[s] || 'neutral';
  }
  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  render();
})();
