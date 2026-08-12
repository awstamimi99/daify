(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;
  const P = window.MenuFlowPermissions.PERMISSIONS;
  const canManage = store.can(P.TEAM_MANAGE);

  const PERMISSION_META = {
    [P.RESTAURANT_EDIT]: { label: 'Edit restaurant information', desc: 'Update contact, hours, and profile details.' },
    [P.MENU_CREATE]: { label: 'Add menu items', desc: 'Create new sections and dishes.' },
    [P.MENU_EDIT]: { label: 'Manage menu', desc: 'Edit pricing and availability.' },
    [P.MENU_DELETE]: { label: 'Delete menu items', desc: 'Remove sections and dishes.' },
    [P.MENU_PUBLISH]: { label: 'Publish menu', desc: 'Make draft changes live for guests.' },
    [P.THEME_EDIT]: { label: 'Edit design', desc: 'Change template, colors, and layout.' },
    [P.ANALYTICS_VIEW]: { label: 'View analytics', desc: 'See menu views and QR scans.' },
    [P.QR_MANAGE]: { label: 'Manage QR & publishing', desc: 'Download QR assets and card styling.' },
  };

  // The checklist only shows the meaningful "can do X" checkboxes — nobody
  // wants a separate "can view" toggle for every area. But the dashboard nav
  // gates on the *.view permission specifically (see shell.js NAV), so every
  // edit/manage-tier permission below must silently carry its view-tier
  // counterpart, or checking e.g. "Edit design" without a way to also check
  // "theme.view" leaves the Design nav item permanently hidden.
  const VIEW_IMPLIED_BY = {
    [P.RESTAURANT_EDIT]: P.RESTAURANT_VIEW,
    [P.MENU_CREATE]: P.MENU_VIEW,
    [P.MENU_EDIT]: P.MENU_VIEW,
    [P.MENU_DELETE]: P.MENU_VIEW,
    [P.MENU_PUBLISH]: P.MENU_VIEW,
    [P.THEME_EDIT]: P.THEME_VIEW,
    [P.QR_MANAGE]: P.QR_VIEW,
  };

  // View-tier permissions have no checkbox of their own — they're only ever
  // granted as a side effect of their edit-tier sibling above. That means
  // they must be treated as sticky once a member has one: there's no control
  // in this UI to represent "has qr.view but not qr.manage", so unchecking
  // qr.manage must never silently revoke a qr.view the member already held.
  const VIEW_TIER = new Set(Object.values(VIEW_IMPLIED_BY));

  function expandPermissions(checked, existing) {
    const set = new Set(checked);
    checked.forEach(p => { const view = VIEW_IMPLIED_BY[p]; if (view) set.add(view); });
    (existing || []).forEach(p => { if (VIEW_TIER.has(p)) set.add(p); });
    return [...set];
  }

  function render() {
    const restaurant = store.getActiveRestaurant();
    const content = window.MenuFlowShell.render({
      active: 'team',
      title: 'Team',
      breadcrumb: esc(restaurant.name),
      subtitle: 'Who has access to this restaurant, and what they can do.',
      actions: canManage ? `<button class="btn btn--dark" type="button" id="inviteBtn">+ Invite manager</button>` : '',
    });
    if (!window.MenuFlowShell.requirePermission(P.TEAM_VIEW, content)) return;
    content.innerHTML = `<div id="teamTable"></div>`;
    renderTable(restaurant);
    $('#inviteBtn')?.addEventListener('click', () => openInviteDialog(restaurant));
  }

  function renderTable(restaurant) {
    const host = $('#teamTable');
    host.innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr>
      <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last active</th><th></th>
    </tr></thead><tbody>
      ${restaurant.team.map(m => memberRow(m)).join('')}
    </tbody></table></div>`;
    bindRowActions(restaurant);
  }

  function memberRow(m) {
    const statusKind = m.status === 'active' ? 'success' : 'warning';
    return `<tr data-member="${m.id}">
      <td data-label="Name"><span class="table-row-avatar"><i>${esc(m.name.charAt(0))}</i>${esc(m.name)}</span></td>
      <td data-label="Email" class="cell-muted">${esc(m.email)}</td>
      <td data-label="Role" style="text-transform:capitalize">${esc(m.role)}</td>
      <td data-label="Status"><span class="status-badge status-badge--${statusKind}">${m.status === 'active' ? 'Active' : 'Pending invitation'}</span></td>
      <td data-label="Last active" class="cell-muted">${m.lastActive ? esc(m.lastActive) : '—'}</td>
      <td data-label="" class="cell-actions">
        ${canManage && m.role === 'manager' ? `<button class="icon-btn" type="button" data-action="edit" title="Edit member">✎</button><button class="icon-btn icon-btn--danger" type="button" data-action="remove" title="Remove">✕</button>` : ''}
      </td>
    </tr>`;
  }

  function bindRowActions(restaurant) {
    $$('#teamTable tbody tr').forEach(row => {
      const memberId = row.dataset.member;
      row.querySelector('[data-action="edit"]')?.addEventListener('click', () => openPermissionsDialog(restaurant, memberId));
      row.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
        const member = restaurant.team.find(m => m.id === memberId);
        window.MenuFlowShell.confirmDialog({ title: `Remove ${member.name}?`, message: 'They will immediately lose access to this restaurant.', confirmLabel: 'Remove', danger: true }).then(ok => {
          if (!ok) return;
          store.removeTeamMember(restaurant.id, memberId);
          window.MenuFlowShell.toast('Team member removed');
          renderTable(store.getActiveRestaurant());
        });
      });
    });
  }

  function permissionChecklist(selected) {
    return window.MenuFlowPermissions.MANAGER_ASSIGNABLE_PERMISSIONS.filter(p => PERMISSION_META[p])
      .map(p => {
        const meta = PERMISSION_META[p];
        return `<label class="permission-row"><input type="checkbox" value="${p}" ${selected.includes(p) ? 'checked' : ''} /><span><strong>${meta.label}</strong><span>${meta.desc}</span></span></label>`;
      })
      .join('');
  }

  function openInviteDialog(restaurant) {
    const dialog = ensureDialog('inviteDialog');

    const gate = store.checkLimit('managers');
    if (!gate.allowed) {
      window.MenuFlowShell.openPlanUpgradeDialog({
        mode: 'change-plan',
        restaurantId: restaurant.id,
        onSubmit: async ({ planId, billingCycle }) => {
          store.updateSubscription(restaurant.id, { planId, billingCycle, status: 'active' });
          window.MenuFlowShell.toast('Plan updated — you can invite another manager now.');
          openInviteDialog(restaurant);
          return { ok: true };
        },
      });
      return;
    }

    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>Invite manager</h2>
      <form id="inviteForm" novalidate>
        <div class="field" data-field="name">
          <label for="inviteName">Name</label>
          <input id="inviteName" name="name" required />
          <small class="field-error" id="inviteName-error"></small>
        </div>
        <div class="field" data-field="email" style="margin-top:1rem">
          <label for="inviteEmail">Email</label>
          <input id="inviteEmail" name="email" type="email" required />
          <small class="field-error" id="inviteEmail-error"></small>
        </div>
        <div class="dash-option-group" style="margin-top:1.25rem">
          <span>Permissions</span>
          <div class="permission-grid">${permissionChecklist(window.MenuFlowPermissions.MANAGER_DEFAULT_PERMISSIONS)}</div>
        </div>
        <div class="dash-hint">Billing and team management can't be granted to a manager — only the owner controls those.</div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" id="inviteCancel">Cancel</button>
          <button class="btn btn--dark" type="submit">Send invite</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    $('#inviteName').focus();
    $('#inviteCancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#inviteForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#inviteName').value.trim();
      const email = $('#inviteEmail').value.trim();
      let hasError = false;
      if (!name) { $('[data-field="name"]').classList.add('has-error'); $('#inviteName-error').textContent = 'Enter a name.'; hasError = true; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('[data-field="email"]').classList.add('has-error'); $('#inviteEmail-error').textContent = 'Enter a valid email.'; hasError = true; }
      if (hasError) return;
      // Baseline against MANAGER_DEFAULT_PERMISSIONS (not just the checked
      // boxes) so bare view-tier defaults with no checkbox of their own —
      // e.g. qr.view, granted by default without qr.manage — still land on
      // a brand-new invite, matching what permissionChecklist() below claims.
      const permissions = expandPermissions($$('.permission-grid input:checked', dialog).map(el => el.value), window.MenuFlowPermissions.MANAGER_DEFAULT_PERMISSIONS);
      store.inviteManager(restaurant.id, { name, email, permissions });
      dialog.close();
      window.MenuFlowShell.toast(`Invitation sent to ${email}`);
      renderTable(store.getActiveRestaurant());
    });
  }

  function openPermissionsDialog(restaurant, memberId) {
    const member = restaurant.team.find(m => m.id === memberId);
    const dialog = ensureDialog('permsDialog');
    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>Edit ${esc(member.name)}</h2>
      <div class="field-row">
        <div class="field"><label for="memberName">Name</label><input id="memberName" value="${esc(member.name)}" /></div>
        <div class="field"><label for="memberEmail">Email</label><input id="memberEmail" type="email" value="${esc(member.email)}" /></div>
      </div>
      <div class="field" style="margin-top:1rem"><label for="memberPhone">Phone</label><input id="memberPhone" type="tel" value="${esc(member.phone || '')}" /></div>
      <div class="dash-option-group" style="margin-top:1.25rem">
        <span>Permissions</span>
        <div class="permission-grid">${permissionChecklist(member.permissions)}</div>
      </div>
      <div class="dash-modal-actions">
        <button class="btn btn--ghost" type="button" id="permsCancel">Cancel</button>
        <button class="btn btn--dark" type="button" id="permsSave">Save changes</button>
      </div>
    </div>`;
    dialog.showModal();
    $('#permsCancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#permsSave').addEventListener('click', () => {
      const permissions = expandPermissions($$('.permission-grid input:checked', dialog).map(el => el.value), member.permissions);
      const name = $('#memberName').value.trim() || member.name;
      const email = $('#memberEmail').value.trim() || member.email;
      const phone = $('#memberPhone').value.trim();
      store.updateTeamMember(restaurant.id, memberId, { permissions, name, email, phone });
      dialog.close();
      window.MenuFlowShell.toast('Team member updated');
      renderTable(store.getActiveRestaurant());
    });
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

  render();
})();
