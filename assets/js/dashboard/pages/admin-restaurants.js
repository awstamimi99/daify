(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const data = window.MenuFlowAdminSeed;
  let query = '';
  let filter = 'all';

  function statusKind(s) {
    return { active: 'success', trial: 'info', suspended: 'danger', expired: 'neutral' }[s] || 'neutral';
  }
  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function render() {
    const content = window.MenuFlowAdminShell.render({ active: 'restaurants', title: 'Restaurants', subtitle: 'Every restaurant on the platform.' });
    content.innerHTML = `
      <div class="dash-filter-bar">
        <div class="dash-search"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="Search restaurants or owners…" /></div>
        <button class="dash-filter-chip active" data-filter="all">All</button>
        <button class="dash-filter-chip" data-filter="active">Active</button>
        <button class="dash-filter-chip" data-filter="trial">Trial</button>
        <button class="dash-filter-chip" data-filter="suspended">Suspended</button>
        <button class="dash-filter-chip" data-filter="expired">Expired</button>
      </div>
      <div id="tableWrap"></div>`;

    $('#search').addEventListener('input', e => { query = e.target.value.toLowerCase(); renderTable(); });
    $$('.dash-filter-chip').forEach(chip => chip.addEventListener('click', () => {
      $$('.dash-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filter = chip.dataset.filter;
      renderTable();
    }));
    renderTable();
  }

  function renderTable() {
    const rows = data.platformRestaurants.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (query && !r.name.toLowerCase().includes(query) && !r.owner.toLowerCase().includes(query)) return false;
      return true;
    });
    $('#tableWrap').innerHTML = rows.length
      ? `<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Restaurant</th><th>Owner</th><th>Plan</th><th>Status</th><th>Menus</th><th>Created</th><th>Last active</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr data-id="${r.id}">
          <td data-label="Restaurant" class="cell-primary">${r.name}</td>
          <td data-label="Owner" class="cell-muted">${r.owner}</td>
          <td data-label="Plan">${r.plan}</td>
          <td data-label="Status"><span class="status-badge status-badge--${statusKind(r.status)}">${cap(r.status)}</span></td>
          <td data-label="Menus" class="cell-muted">${r.menus}</td>
          <td data-label="Created" class="cell-muted">${r.created}</td>
          <td data-label="Last active" class="cell-muted">${r.lastActive}</td>
          <td data-label="" class="cell-actions">
            <a class="btn btn--ghost" style="padding:.5rem .85rem;font-size:.76rem" href="restaurant-detail.html?id=${r.id}">View</a>
            ${r.status === 'suspended' ? `<button class="icon-btn" type="button" data-action="reactivate" title="Reactivate">▶</button>` : `<button class="icon-btn icon-btn--danger" type="button" data-action="suspend" title="Suspend">⏸</button>`}
          </td>
        </tr>`).join('')}
      </tbody></table></div>`
      : `<div class="dash-card"><div class="dash-empty-state"><h3>No restaurants match</h3><p>Try a different search or filter.</p></div></div>`;

    $$('[data-action="suspend"]').forEach(btn => btn.addEventListener('click', () => toggleStatus(btn, 'suspended')));
    $$('[data-action="reactivate"]').forEach(btn => btn.addEventListener('click', () => toggleStatus(btn, 'active')));
  }

  function toggleStatus(btn, newStatus) {
    const id = btn.closest('tr').dataset.id;
    const r = data.platformRestaurants.find(x => x.id === id);
    window.MenuFlowShellCommon.confirmDialog({
      title: newStatus === 'suspended' ? `Suspend ${r.name}?` : `Reactivate ${r.name}?`,
      message: newStatus === 'suspended' ? "Their published menus go offline immediately and the owner can't make changes until reactivated." : 'Restores full access for this restaurant.',
      confirmLabel: newStatus === 'suspended' ? 'Suspend' : 'Reactivate',
      danger: newStatus === 'suspended',
    }).then(ok => {
      if (!ok) return;
      r.status = newStatus;
      window.MenuFlowShellCommon.toast(newStatus === 'suspended' ? 'Restaurant suspended' : 'Restaurant reactivated');
      renderTable();
    });
  }

  render();
})();
