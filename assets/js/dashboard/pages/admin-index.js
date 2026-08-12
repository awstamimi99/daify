(function () {
  const $ = s => document.querySelector(s);
  const esc = window.MenuFlowShellCommon.esc;
  const store = window.MenuFlowStore;
  const admin = window.MenuFlowAdminStore;

  function statusKind(s) {
    return { active: 'success', trial: 'info', suspended: 'danger', expired: 'neutral' }[s] || 'neutral';
  }
  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function render() {
    const content = window.MenuFlowAdminShell.render({ active: 'overview', title: 'Platform Overview', subtitle: "How DAIFY is doing today." });
    const restaurants = store.listRestaurants();
    const active = restaurants.filter(r => r.status === 'active').length;
    const trial = restaurants.filter(r => r.status === 'trial').length;
    const analytics = admin.analytics();
    const publishedMenus = restaurants.reduce((sum, r) => sum + Object.values(r.menus).filter(m => m.status === 'published').length, 0);
    const mrr = restaurants.reduce((sum, r) => {
      const plan = store.planFor(r.id);
      if (!plan || plan.customPricing) return sum;
      const sub = store.getSubscription(r.id);
      return sum + (sub?.billingCycle === 'yearly' ? (plan.yearlyMonthlyPrice || 0) : (plan.monthlyPrice || 0));
    }, 0);

    content.innerHTML = `
      <div class="dash-stats">
        <a class="dash-stat" href="restaurants.html"><span>Restaurants</span><strong>${restaurants.length}</strong></a>
        <a class="dash-stat" href="subscriptions.html"><span>Active subscriptions</span><strong>${active}</strong></a>
        <a class="dash-stat" href="subscriptions.html"><span>Trial accounts</span><strong>${trial}</strong></a>
        <a class="dash-stat" href="users.html"><span>Users</span><strong>${admin.users.list().length}</strong></a>
      </div>
      <div class="dash-stats">
        <a class="dash-stat" href="restaurants.html"><span>Published menus</span><strong>${publishedMenus}</strong></a>
        <a class="dash-stat" href="restaurants.html"><span>Menus created</span><strong>${restaurants.reduce((s, r) => s + Object.keys(r.menus).length, 0)}</strong></a>
        <a class="dash-stat" href="subscriptions.html"><span>MRR (estimate)</span><strong>$${mrr.toLocaleString()}</strong><small>demo estimate</small></a>
        <a class="dash-stat" href="analytics.html"><span>Recent signups</span><strong>${analytics.signupsOverTime.slice(-1)[0]}</strong><small>this week</small></a>
      </div>

      <div class="dash-design-grid">
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Recent restaurants</h2></div><a class="btn btn--ghost" href="restaurants.html" style="padding:.5rem .9rem;font-size:.76rem">View all</a></div>
          <div class="dash-table-wrap"><table class="dash-table"><tbody>
            ${restaurants.slice(0, 5).map(r => `<tr><td data-label="Restaurant" class="cell-primary">${esc(r.name)}</td><td data-label="Plan" class="cell-muted">${esc(store.planFor(r.id)?.name || r.plan)}</td><td data-label="Status"><span class="status-badge status-badge--${statusKind(r.status)}">${cap(r.status)}</span></td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Security alerts</h2></div><a class="btn btn--ghost" href="security.html" style="padding:.5rem .9rem;font-size:.76rem">View all</a></div>
          <ul class="dash-checklist">
            ${admin.security().events.slice(0, 4).map(e => `<li><span class="dash-check-icon" style="background:var(--dash-warning-bg);color:var(--dash-warning);border-color:var(--dash-warning-bg)">!</span><span style="flex:1"><strong style="font-weight:600">${esc(e.type)}</strong><br><small style="color:var(--dash-text-muted)">${esc(e.detail)} · ${esc(e.time)}</small></span></li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="dash-card" style="margin-top:1.75rem">
        <div class="dash-card-header"><div><h2>Open support issues</h2></div><a class="btn btn--ghost" href="support.html" style="padding:.5rem .9rem;font-size:.76rem">View all</a></div>
        <div class="dash-table-wrap"><table class="dash-table"><tbody>
          ${admin.tickets.list().filter(t => t.status !== 'Resolved').map(t => `<tr><td data-label="Client" class="cell-primary">${esc(t.client)}</td><td data-label="Subject" class="cell-muted">${esc(t.subject)}</td><td data-label="Priority"><span class="status-badge status-badge--${t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'neutral'}">${esc(t.priority)}</span></td><td data-label="Status"><span class="status-badge status-badge--info">${esc(t.status)}</span></td></tr>`).join('') || '<tr><td class="cell-muted">No open tickets.</td></tr>'}
        </tbody></table></div>
      </div>`;
  }

  render();
})();
