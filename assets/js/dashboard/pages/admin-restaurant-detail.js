(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShellCommon.esc;

  function statusKind(s) {
    return { active: 'success', trial: 'info', suspended: 'danger', expired: 'neutral' }[s] || 'neutral';
  }

  function currentId() {
    return new URLSearchParams(location.search).get('id') || store.listRestaurants()[0]?.id;
  }

  function render() {
    const id = currentId();
    const restaurant = store.getState().restaurants[id];
    if (!restaurant) {
      const content = window.MenuFlowAdminShell.render({ active: 'restaurants', title: 'Restaurant not found' });
      content.innerHTML = `<div class="dash-card"><div class="dash-empty-state"><h3>No such restaurant</h3><a class="btn btn--dark" href="restaurants.html">Back to Restaurants</a></div></div>`;
      return;
    }
    const sub = store.getSubscription(id);
    const plan = store.planFor(id);
    const usage = store.usageFor(id);

    const content = window.MenuFlowAdminShell.render({
      active: 'restaurants',
      title: restaurant.name,
      breadcrumb: `<a href="restaurants.html">Restaurants</a> / ${esc(restaurant.name)}`,
      subtitle: restaurant.location ? `${restaurant.location}` : undefined,
      actions: `<span class="status-badge status-badge--${statusKind(restaurant.status)}">${restaurant.status}</span>`,
    });

    content.innerHTML = `
      <div class="dash-stats">
        <div class="dash-stat"><span>Plan</span><strong>${esc(plan?.name || restaurant.plan)}</strong></div>
        <div class="dash-stat"><span>Menus</span><strong>${usage.menus}${plan && plan.limits.menus !== 'custom' ? ` / ${plan.limits.menus}` : ''}</strong></div>
        <div class="dash-stat"><span>Managers</span><strong>${usage.managers}${plan && plan.limits.managers !== 'custom' ? ` / ${plan.limits.managers}` : ''}</strong></div>
        <div class="dash-stat"><span>Created</span><strong style="font-size:1.3rem">${esc(restaurant.createdAt)}</strong></div>
      </div>

      <div class="dash-design-grid">
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Team</h2><p>Add, edit, or remove anyone with access to this restaurant.</p></div><button class="btn btn--ghost" type="button" id="addMemberBtn">+ Add member</button></div>
          <div id="teamTable"></div>
        </div>
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Subscription</h2></div></div>
          ${sub ? `<div class="chart-legend-list">
            <div class="chart-legend-row"><span>Plan</span><div class="bar-track"></div><strong>${esc(plan?.name || sub.planId)}</strong></div>
            <div class="chart-legend-row"><span>Billing cycle</span><div class="bar-track"></div><strong style="text-transform:capitalize">${esc(sub.billingCycle)}</strong></div>
            <div class="chart-legend-row"><span>Status</span><div class="bar-track"></div><strong style="text-transform:capitalize">${esc(sub.status.replace('_', ' '))}</strong></div>
            <div class="chart-legend-row"><span>Renews</span><div class="bar-track"></div><strong>${esc(sub.renewsAt || '—')}</strong></div>
          </div>` : '<p class="dash-empty">No subscription record.</p>'}
        </div>
      </div>

      <div class="dash-card" style="margin-top:1.75rem">
        <div class="dash-card-header"><div><h2>Actions</h2><p>Changes here affect this restaurant immediately.</p></div></div>
        <div class="button-row">
          <button class="btn btn--dark" type="button" id="manageAsOwnerBtn">Manage as owner ↗</button>
          <button class="btn btn--ghost" type="button" id="changePlanBtn">Change plan</button>
          ${restaurant.status === 'suspended' ? `<button class="btn btn--dark" type="button" id="statusBtn">Reactivate</button>` : `<button class="btn btn--danger" type="button" id="statusBtn">Suspend restaurant</button>`}
        </div>
      </div>`;

    renderTeam(restaurant);
    bindActions(restaurant, plan);
  }

  function renderTeam(restaurant) {
    $('#teamTable').innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
      ${restaurant.team.map(m => `<tr data-member="${m.id}">
        <td data-label="Name" class="cell-primary">${esc(m.name)}</td>
        <td data-label="Email" class="cell-muted">${esc(m.email || '—')}</td>
        <td data-label="Role" style="text-transform:capitalize">${esc(m.role)}</td>
        <td data-label="Status"><span class="status-badge status-badge--${m.status === 'active' ? 'success' : 'warning'}">${esc(m.status)}</span></td>
        <td data-label="" class="cell-actions">
          <button class="icon-btn" type="button" data-action="edit" title="Edit role">✎</button>
          ${restaurant.team.length > 1 ? `<button class="icon-btn icon-btn--danger" type="button" data-action="remove" title="Remove">✕</button>` : ''}
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;

    $$('#teamTable [data-action="remove"]').forEach(btn => btn.addEventListener('click', () => {
      const memberId = btn.closest('tr').dataset.member;
      const member = restaurant.team.find(m => m.id === memberId);
      window.MenuFlowShellCommon.confirmDialog({ title: `Remove ${member.name}?`, message: 'They will immediately lose access to this restaurant.', confirmLabel: 'Remove', danger: true }).then(ok => {
        if (!ok) return;
        store.removeTeamMember(restaurant.id, memberId);
        window.MenuFlowAdminStore.addAudit('DAIFY Admin', 'Removed team member', `${member.name} — ${restaurant.name}`);
        window.MenuFlowShellCommon.toast('Team member removed');
        render();
      });
    }));
    $$('#teamTable [data-action="edit"]').forEach(btn => btn.addEventListener('click', () => openMemberDialog(restaurant, btn.closest('tr').dataset.member)));
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

  function openMemberDialog(restaurant, memberId) {
    const member = memberId ? restaurant.team.find(m => m.id === memberId) : null;
    const dialog = ensureDialog('memberDialog');
    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>${member ? `Edit ${esc(member.name)}` : 'Add team member'}</h2>
      <form id="memberForm" novalidate>
        <div class="field"><label for="mName">Name</label><input id="mName" value="${member ? esc(member.name) : ''}" required /></div>
        <div class="field" style="margin-top:1rem"><label for="mEmail">Email</label><input id="mEmail" type="email" value="${member ? esc(member.email || '') : ''}" /></div>
        <div class="field" style="margin-top:1rem"><label for="mRole">Role</label>
          <select id="mRole">
            <option value="manager" ${!member || member.role === 'manager' ? 'selected' : ''}>Manager</option>
            <option value="owner" ${member?.role === 'owner' ? 'selected' : ''}>Owner</option>
          </select>
        </div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
          <button class="btn btn--dark" type="submit">${member ? 'Save changes' : 'Add member'}</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    dialog.querySelector('[data-choice="cancel"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#memberForm', dialog).addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#mName', dialog).value.trim();
      const email = $('#mEmail', dialog).value.trim();
      const role = $('#mRole', dialog).value;
      if (!name) return;
      if (member) {
        const permissions = role === 'owner' ? window.MenuFlowPermissions.OWNER_PERMISSIONS : window.MenuFlowPermissions.MANAGER_DEFAULT_PERMISSIONS;
        store.updateTeamMember(restaurant.id, member.id, { name, email, role, permissions });
      } else {
        store.addTeamMember(restaurant.id, { name, email, role });
      }
      window.MenuFlowAdminStore.addAudit('DAIFY Admin', member ? 'Edited team member' : 'Added team member', `${name} — ${restaurant.name}`);
      window.MenuFlowShellCommon.toast(member ? 'Team member updated' : 'Team member added');
      dialog.close();
      render();
    });
  }

  function bindActions(restaurant, plan) {
    $('#addMemberBtn').addEventListener('click', () => openMemberDialog(restaurant, null));
    $('#manageAsOwnerBtn').addEventListener('click', () => {
      store.switchRestaurant(restaurant.id);
      store.switchRole('owner');
      window.MenuFlowShellCommon.toast(`Now managing ${restaurant.name} as owner`);
      location.href = '../dashboard/index.html';
    });
    $('#statusBtn').addEventListener('click', () => {
      const suspending = restaurant.status !== 'suspended';
      window.MenuFlowShellCommon.confirmDialog({
        title: suspending ? `Suspend ${restaurant.name}?` : `Reactivate ${restaurant.name}?`,
        message: suspending ? 'Their published menus go offline immediately.' : 'Restores full platform access.',
        confirmLabel: suspending ? 'Suspend' : 'Reactivate',
        danger: suspending,
      }).then(ok => {
        if (!ok) return;
        store.updateRestaurant(restaurant.id, { status: suspending ? 'suspended' : 'active' });
        window.MenuFlowAdminStore.addAudit('DAIFY Admin', suspending ? 'Suspended restaurant' : 'Reactivated restaurant', restaurant.name);
        window.MenuFlowShellCommon.toast(suspending ? 'Restaurant suspended' : 'Restaurant reactivated');
        render();
      });
    });
    $('#changePlanBtn').addEventListener('click', () => openPlanDialog(restaurant));
  }

  function openPlanDialog(restaurant) {
    const sub = store.getSubscription(restaurant.id);
    const dialog = ensureDialog('planDialog');
    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>Change plan</h2>
      <form id="planForm" novalidate>
        <div class="field"><label for="planSelect">Plan</label>
          <select id="planSelect">${(window.MenuFlowPlansSeed || []).map(p => `<option value="${p.id}" ${sub && p.id === sub.planId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        </div>
        <div class="field" style="margin-top:1rem"><label for="cycleSelect">Billing cycle</label>
          <select id="cycleSelect">
            <option value="monthly" ${sub?.billingCycle === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="yearly" ${sub?.billingCycle === 'yearly' ? 'selected' : ''}>Yearly</option>
          </select>
        </div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
          <button class="btn btn--dark" type="submit">Save plan</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    dialog.querySelector('[data-choice="cancel"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#planForm', dialog).addEventListener('submit', e => {
      e.preventDefault();
      const planId = $('#planSelect', dialog).value;
      const billingCycle = $('#cycleSelect', dialog).value;
      store.updateSubscription(restaurant.id, { planId, billingCycle });
      const planName = (window.MenuFlowPlansSeed || []).find(p => p.id === planId)?.name || planId;
      window.MenuFlowAdminStore.addAudit('DAIFY Admin', 'Changed restaurant plan', `${restaurant.name} → ${planName}`);
      window.MenuFlowShellCommon.toast('Plan updated');
      dialog.close();
      render();
    });
  }

  render();
})();
