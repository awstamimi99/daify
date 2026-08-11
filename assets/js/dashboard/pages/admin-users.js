(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const data = window.MenuFlowAdminSeed;
  let query = '';
  let filter = 'all';

  function render() {
    const content = window.MenuFlowAdminShell.render({ active: 'users', title: 'Users', subtitle: 'Everyone with a MenuFlow account.' });
    content.innerHTML = `
      <div class="dash-filter-bar">
        <div class="dash-search"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="Search by name or email…" /></div>
        <button class="dash-filter-chip active" data-filter="all">All</button>
        <button class="dash-filter-chip" data-filter="Owner">Owner</button>
        <button class="dash-filter-chip" data-filter="Manager">Manager</button>
        <button class="dash-filter-chip" data-filter="Admin">Admin</button>
        <button class="dash-filter-chip" data-filter="disabled">Disabled</button>
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
    const rows = data.platformUsers.filter(u => {
      if (filter === 'disabled' && u.status !== 'disabled') return false;
      if (['Owner', 'Manager', 'Admin'].includes(filter) && u.role !== filter) return false;
      if (query && !u.name.toLowerCase().includes(query) && !u.email.toLowerCase().includes(query)) return false;
      return true;
    });
    $('#tableWrap').innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Restaurants</th><th>Status</th><th>Last login</th><th>Joined</th><th></th></tr></thead><tbody>
      ${rows.map(u => `<tr data-id="${u.id}">
        <td data-label="Name"><span class="table-row-avatar"><i>${u.name.charAt(0)}</i>${u.name}</span></td>
        <td data-label="Email" class="cell-muted">${u.email}</td>
        <td data-label="Role">${u.role}</td>
        <td data-label="Restaurants" class="cell-muted">${u.restaurants}</td>
        <td data-label="Status"><span class="status-badge status-badge--${u.status === 'active' ? 'success' : 'danger'}">${u.status === 'active' ? 'Active' : 'Disabled'}</span></td>
        <td data-label="Last login" class="cell-muted">${u.lastLogin}</td>
        <td data-label="Joined" class="cell-muted">${u.joined}</td>
        <td data-label="" class="cell-actions">${u.role !== 'Admin' ? `<button class="icon-btn ${u.status === 'active' ? 'icon-btn--danger' : ''}" type="button" data-action="toggle" title="${u.status === 'active' ? 'Disable' : 'Reactivate'}">${u.status === 'active' ? '✕' : '▶'}</button>` : ''}</td>
      </tr>`).join('') || `<tr><td class="cell-muted" colspan="8">No users match.</td></tr>`}
    </tbody></table></div>`;

    $$('[data-action="toggle"]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const user = data.platformUsers.find(u => u.id === id);
      const disabling = user.status === 'active';
      window.MenuFlowShellCommon.confirmDialog({
        title: disabling ? `Disable ${user.name}?` : `Reactivate ${user.name}?`,
        message: disabling ? 'They will immediately lose access to MenuFlow.' : 'Restores their access to MenuFlow.',
        confirmLabel: disabling ? 'Disable' : 'Reactivate',
        danger: disabling,
      }).then(ok => {
        if (!ok) return;
        user.status = disabling ? 'disabled' : 'active';
        window.MenuFlowShellCommon.toast(disabling ? 'User disabled' : 'User reactivated');
        renderTable();
      });
    }));
  }

  render();
})();
