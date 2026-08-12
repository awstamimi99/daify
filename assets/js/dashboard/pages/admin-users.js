(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const users = window.MenuFlowAdminStore.users;
  const esc = window.MenuFlowShellCommon.esc;
  let query = '';
  let filter = 'all';

  function render() {
    const content = window.MenuFlowAdminShell.render({
      active: 'users',
      title: 'Users',
      subtitle: 'Everyone with a DAIFY account.',
      actions: `<button class="btn btn--dark" type="button" id="addUserBtn">+ Add user</button>`,
    });
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
    $('#addUserBtn').addEventListener('click', () => openUserDialog(null));
    renderTable();
  }

  function renderTable() {
    const rows = users.list().filter(u => {
      if (filter === 'disabled' && u.status !== 'disabled') return false;
      if (['Owner', 'Manager', 'Admin'].includes(filter) && u.role !== filter) return false;
      if (query && !u.name.toLowerCase().includes(query) && !u.email.toLowerCase().includes(query)) return false;
      return true;
    });
    $('#tableWrap').innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Restaurants</th><th>Status</th><th>Joined</th><th></th></tr></thead><tbody>
      ${rows.map(u => `<tr data-id="${u.id}">
        <td data-label="Name"><span class="table-row-avatar"><i>${esc(u.name.charAt(0))}</i>${esc(u.name)}</span></td>
        <td data-label="Email" class="cell-muted">${esc(u.email)}</td>
        <td data-label="Role">${esc(u.role)}</td>
        <td data-label="Restaurants" class="cell-muted">${u.restaurants}</td>
        <td data-label="Status"><span class="status-badge status-badge--${u.status === 'active' ? 'success' : 'danger'}">${u.status === 'active' ? 'Active' : 'Disabled'}</span></td>
        <td data-label="Joined" class="cell-muted">${esc(u.joined)}</td>
        <td data-label="" class="cell-actions">
          <button class="icon-btn" type="button" data-action="edit" title="Edit">✎</button>
          ${u.role !== 'Admin' ? `<button class="icon-btn ${u.status === 'active' ? 'icon-btn--danger' : ''}" type="button" data-action="toggle" title="${u.status === 'active' ? 'Disable' : 'Reactivate'}">${u.status === 'active' ? '✕' : '▶'}</button>` : ''}
          <button class="icon-btn icon-btn--danger" type="button" data-action="remove" title="Remove">🗑</button>
        </td>
      </tr>`).join('') || `<tr><td class="cell-muted" colspan="7">No users match.</td></tr>`}
    </tbody></table></div>`;

    $$('[data-action="toggle"]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const user = users.list().find(u => u.id === id);
      const disabling = user.status === 'active';
      window.MenuFlowShellCommon.confirmDialog({
        title: disabling ? `Disable ${user.name}?` : `Reactivate ${user.name}?`,
        message: disabling ? 'They will immediately lose access to DAIFY.' : 'Restores their access to DAIFY.',
        confirmLabel: disabling ? 'Disable' : 'Reactivate',
        danger: disabling,
      }).then(ok => {
        if (!ok) return;
        users.update(id, { status: disabling ? 'disabled' : 'active' });
        window.MenuFlowAdminStore.addAudit('DAIFY Admin', disabling ? 'Disabled user' : 'Reactivated user', user.email);
        window.MenuFlowShellCommon.toast(disabling ? 'User disabled' : 'User reactivated');
        renderTable();
      });
    }));
    $$('[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => openUserDialog(btn.closest('tr').dataset.id)));
    $$('[data-action="remove"]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const user = users.list().find(u => u.id === id);
      window.MenuFlowShellCommon.confirmDialog({ title: `Remove ${user.name}?`, message: 'Deletes this account from the platform directory. This cannot be undone.', confirmLabel: 'Remove user', danger: true }).then(ok => {
        if (!ok) return;
        users.remove(id);
        window.MenuFlowAdminStore.addAudit('DAIFY Admin', 'Removed user', user.email);
        window.MenuFlowShellCommon.toast('User removed');
        renderTable();
      });
    }));
  }

  function ensureDialog(id) {
    let dialog = $(`#${id}`);
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = id;
      dialog.className = 'dash-modal';
      document.body.appendChild(dialog);
    }
    return dialog;
  }

  function openUserDialog(id) {
    const user = id ? users.list().find(u => u.id === id) : null;
    const dialog = ensureDialog('userDialog');
    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>${user ? `Edit ${esc(user.name)}` : 'Add user'}</h2>
      <form id="userForm" novalidate>
        <div class="field"><label for="uName">Name</label><input id="uName" value="${user ? esc(user.name) : ''}" required /></div>
        <div class="field" style="margin-top:1rem"><label for="uEmail">Email</label><input id="uEmail" type="email" value="${user ? esc(user.email) : ''}" required /></div>
        <div class="field" style="margin-top:1rem"><label for="uRole">Role</label>
          <select id="uRole">
            <option value="Owner" ${!user || user.role === 'Owner' ? 'selected' : ''}>Owner</option>
            <option value="Manager" ${user?.role === 'Manager' ? 'selected' : ''}>Manager</option>
            <option value="Admin" ${user?.role === 'Admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
          <button class="btn btn--dark" type="submit">${user ? 'Save changes' : 'Add user'}</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    dialog.querySelector('[data-choice="cancel"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#userForm', dialog).addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#uName', dialog).value.trim();
      const email = $('#uEmail', dialog).value.trim();
      const role = $('#uRole', dialog).value;
      if (!name || !email) return;
      if (user) {
        users.update(user.id, { name, email, role });
      } else {
        users.add({ name, email, role });
      }
      window.MenuFlowAdminStore.addAudit('DAIFY Admin', user ? 'Edited user' : 'Added user', email);
      window.MenuFlowShellCommon.toast(user ? 'User updated' : 'User added');
      dialog.close();
      renderTable();
    });
  }

  render();
})();
