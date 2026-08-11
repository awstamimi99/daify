(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const data = window.MenuFlowAdminSeed;

  function statusKind(s) {
    return { active: 'success', trial: 'info', suspended: 'danger', expired: 'neutral' }[s] || 'neutral';
  }

  function render() {
    const id = new URLSearchParams(location.search).get('id') || data.platformRestaurants[0].id;
    const record = data.platformRestaurants.find(r => r.id === id) || data.platformRestaurants[0];
    const storeRestaurant = window.MenuFlowStore.getState().restaurants[id];
    const sub = data.subscriptions.find(s => s.restaurant === record.name);

    const content = window.MenuFlowAdminShell.render({
      active: 'restaurants',
      title: record.name,
      breadcrumb: `<a href="restaurants.html">Restaurants</a> / ${record.name}`,
      subtitle: `Owned by ${record.owner}`,
      actions: `<span class="status-badge status-badge--${statusKind(record.status)}">${record.status}</span>`,
    });

    content.innerHTML = `
      <div class="dash-stats">
        <div class="dash-stat"><span>Plan</span><strong>${record.plan}</strong></div>
        <div class="dash-stat"><span>Menus</span><strong>${record.menus}</strong></div>
        <div class="dash-stat"><span>Created</span><strong style="font-size:1.3rem">${record.created}</strong></div>
        <div class="dash-stat"><span>Last active</span><strong style="font-size:1.3rem">${record.lastActive}</strong></div>
      </div>

      <div class="dash-design-grid">
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Team</h2></div></div>
          <div class="dash-table-wrap"><table class="dash-table"><tbody>
            ${(storeRestaurant?.team || []).map(m => `<tr><td data-label="Name" class="cell-primary">${m.name}</td><td data-label="Role" style="text-transform:capitalize">${m.role}</td><td data-label="Status"><span class="status-badge status-badge--${m.status === 'active' ? 'success' : 'warning'}">${m.status}</span></td></tr>`).join('') || '<tr><td class="cell-muted">No team data in this demo restaurant.</td></tr>'}
          </tbody></table></div>
        </div>
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Subscription</h2></div></div>
          ${sub ? `<div class="chart-legend-list">
            <div class="chart-legend-row"><span>Plan</span><div class="bar-track"></div><strong>${sub.plan}</strong></div>
            <div class="chart-legend-row"><span>Billing cycle</span><div class="bar-track"></div><strong>${sub.cycle}</strong></div>
            <div class="chart-legend-row"><span>Status</span><div class="bar-track"></div><strong>${sub.status}</strong></div>
            <div class="chart-legend-row"><span>Renews</span><div class="bar-track"></div><strong>${sub.renews}</strong></div>
          </div>` : '<p class="dash-empty">No subscription record.</p>'}
        </div>
      </div>

      <div class="dash-card" style="margin-top:1.75rem">
        <div class="dash-card-header"><div><h2>Actions</h2><p>Changes here affect this restaurant immediately.</p></div></div>
        <div class="button-row">
          <button class="btn btn--ghost" type="button" id="changePlanBtn">Change plan</button>
          ${record.status === 'suspended' ? `<button class="btn btn--dark" type="button" id="statusBtn">Reactivate</button>` : `<button class="btn btn--danger" type="button" id="statusBtn">Suspend restaurant</button>`}
        </div>
      </div>`;

    $('#statusBtn').addEventListener('click', () => {
      const suspending = record.status !== 'suspended';
      window.MenuFlowShellCommon.confirmDialog({
        title: suspending ? `Suspend ${record.name}?` : `Reactivate ${record.name}?`,
        message: suspending ? "Their published menus go offline immediately." : 'Restores full platform access.',
        confirmLabel: suspending ? 'Suspend' : 'Reactivate',
        danger: suspending,
      }).then(ok => {
        if (!ok) return;
        record.status = suspending ? 'suspended' : 'active';
        window.MenuFlowShellCommon.toast(suspending ? 'Restaurant suspended' : 'Restaurant reactivated');
        render();
      });
    });
    $('#changePlanBtn').addEventListener('click', () => {
      window.MenuFlowShellCommon.toast('Plan changes for a specific restaurant will be available once billing is connected.');
    });
  }

  render();
})();
