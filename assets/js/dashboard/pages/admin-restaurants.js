(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShellCommon.esc;
  let query = '';
  let filter = 'all';

  function statusKind(s) {
    return { active: 'success', trial: 'info', suspended: 'danger', expired: 'neutral' }[s] || 'neutral';
  }
  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function ownerOf(r) {
    return r.team.find(m => m.role === 'owner')?.name || '—';
  }
  function planNameOf(r) {
    return store.planFor(r.id)?.name || cap(r.plan);
  }
  function menuCountOf(r) {
    return Object.keys(r.menus).length;
  }

  function render() {
    const content = window.MenuFlowAdminShell.render({
      active: 'restaurants',
      title: 'Restaurants',
      subtitle: 'Every restaurant on the platform.',
      actions: `<button class="btn btn--dark" type="button" id="addRestaurantBtn">+ Add restaurant</button>`,
    });
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
    $('#addRestaurantBtn').addEventListener('click', openAddDialog);
    renderTable();
  }

  function renderTable() {
    const rows = store.listRestaurants().filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (query && !r.name.toLowerCase().includes(query) && !ownerOf(r).toLowerCase().includes(query)) return false;
      return true;
    });
    $('#tableWrap').innerHTML = rows.length
      ? `<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Restaurant</th><th>Owner</th><th>Plan</th><th>Status</th><th>Menus</th><th>Created</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr data-id="${r.id}">
          <td data-label="Restaurant" class="cell-primary">${esc(r.name)}${r.location ? ` <span class="cell-muted">— ${esc(r.location)}</span>` : ''}</td>
          <td data-label="Owner" class="cell-muted">${esc(ownerOf(r))}</td>
          <td data-label="Plan">${esc(planNameOf(r))}</td>
          <td data-label="Status"><span class="status-badge status-badge--${statusKind(r.status)}">${cap(r.status)}</span></td>
          <td data-label="Menus" class="cell-muted">${menuCountOf(r)}</td>
          <td data-label="Created" class="cell-muted">${esc(r.createdAt)}</td>
          <td data-label="" class="cell-actions">
            <a class="btn btn--ghost" style="padding:.5rem .85rem;font-size:.76rem" href="restaurant-detail.html?id=${r.id}">View</a>
            <button class="icon-btn" type="button" data-action="edit" title="Edit">✎</button>
            ${r.status === 'suspended' ? `<button class="icon-btn" type="button" data-action="reactivate" title="Reactivate">▶</button>` : `<button class="icon-btn icon-btn--danger" type="button" data-action="suspend" title="Suspend">⏸</button>`}
            <button class="icon-btn icon-btn--danger" type="button" data-action="delete" title="Delete">✕</button>
          </td>
        </tr>`).join('')}
      </tbody></table></div>`
      : `<div class="dash-card"><div class="dash-empty-state"><h3>No restaurants match</h3><p>Try a different search or filter.</p></div></div>`;

    $$('[data-action="suspend"]').forEach(btn => btn.addEventListener('click', () => toggleStatus(btn, 'suspended')));
    $$('[data-action="reactivate"]').forEach(btn => btn.addEventListener('click', () => toggleStatus(btn, 'active')));
    $$('[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => openEditDialog(btn.closest('tr').dataset.id)));
    $$('[data-action="delete"]').forEach(btn => btn.addEventListener('click', () => deleteRestaurant(btn.closest('tr').dataset.id)));
  }

  function toggleStatus(btn, newStatus) {
    const id = btn.closest('tr').dataset.id;
    const r = store.getState().restaurants[id];
    window.MenuFlowShellCommon.confirmDialog({
      title: newStatus === 'suspended' ? `Suspend ${r.name}?` : `Reactivate ${r.name}?`,
      message: newStatus === 'suspended' ? "Their published menus go offline immediately and the owner can't make changes until reactivated." : 'Restores full access for this restaurant.',
      confirmLabel: newStatus === 'suspended' ? 'Suspend' : 'Reactivate',
      danger: newStatus === 'suspended',
    }).then(ok => {
      if (!ok) return;
      store.updateRestaurant(id, { status: newStatus });
      window.MenuFlowAdminStore.addAudit('DAIFY Admin', newStatus === 'suspended' ? 'Suspended restaurant' : 'Reactivated restaurant', r.name);
      window.MenuFlowShellCommon.toast(newStatus === 'suspended' ? 'Restaurant suspended' : 'Restaurant reactivated');
      renderTable();
    });
  }

  function deleteRestaurant(id) {
    const r = store.getState().restaurants[id];
    window.MenuFlowShellCommon.confirmDialog({
      title: `Delete ${r.name}?`,
      message: 'This permanently removes the restaurant, its menus, and its team from the platform. This cannot be undone.',
      confirmLabel: 'Delete restaurant',
      danger: true,
    }).then(ok => {
      if (!ok) return;
      store.deleteRestaurant(id);
      window.MenuFlowAdminStore.addAudit('DAIFY Admin', 'Deleted restaurant', r.name);
      window.MenuFlowShellCommon.toast('Restaurant deleted');
      renderTable();
    });
  }

  function planOptions(selected) {
    return (window.MenuFlowPlansSeed || []).map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
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

  function openAddDialog() {
    const dialog = ensureDialog('addRestaurantDialog');
    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>Add restaurant</h2>
      <form id="addRestaurantForm" novalidate>
        <div class="field"><label for="rName">Restaurant name</label><input id="rName" required /></div>
        <div class="field-row" style="margin-top:1rem">
          <div class="field"><label for="rLocation">Location</label><input id="rLocation" placeholder="City" /></div>
          <div class="field"><label for="rPlan">Plan</label><select id="rPlan">${planOptions('starter')}</select></div>
        </div>
        <div class="field-row" style="margin-top:1rem">
          <div class="field"><label for="rOwnerName">Owner name</label><input id="rOwnerName" required /></div>
          <div class="field"><label for="rOwnerEmail">Owner email</label><input id="rOwnerEmail" type="email" /></div>
        </div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
          <button class="btn btn--dark" type="submit">Add restaurant</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    dialog.querySelector('[data-choice="cancel"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#addRestaurantForm', dialog).addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#rName', dialog).value.trim();
      const ownerName = $('#rOwnerName', dialog).value.trim();
      if (!name || !ownerName) return;
      const result = store.createRestaurant(null, {
        name,
        location: $('#rLocation', dialog).value.trim(),
        plan: $('#rPlan', dialog).value,
        ownerName,
        ownerEmail: $('#rOwnerEmail', dialog).value.trim(),
        bypassLimit: true,
      });
      if (result.ok) {
        window.MenuFlowAdminStore.addAudit('DAIFY Admin', 'Added restaurant', name);
        window.MenuFlowShellCommon.toast(`${name} added`);
        dialog.close();
        renderTable();
      }
    });
  }

  function openEditDialog(id) {
    const r = store.getState().restaurants[id];
    const owner = r.team.find(m => m.role === 'owner');
    const dialog = ensureDialog('editRestaurantDialog');
    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>Edit ${esc(r.name)}</h2>
      <form id="editRestaurantForm" novalidate>
        <div class="field"><label for="eName">Restaurant name</label><input id="eName" value="${esc(r.name)}" required /></div>
        <div class="field-row" style="margin-top:1rem">
          <div class="field"><label for="eLocation">Location</label><input id="eLocation" value="${esc(r.location || '')}" /></div>
          <div class="field"><label for="ePlan">Plan</label><select id="ePlan">${planOptions(r.plan)}</select></div>
        </div>
        <div class="field" style="margin-top:1rem"><label for="eOwnerName">Owner name</label><input id="eOwnerName" value="${esc(owner?.name || '')}" /></div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
          <button class="btn btn--dark" type="submit">Save changes</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    dialog.querySelector('[data-choice="cancel"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#editRestaurantForm', dialog).addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#eName', dialog).value.trim();
      const planId = $('#ePlan', dialog).value;
      store.updateRestaurant(id, { name, location: $('#eLocation', dialog).value.trim(), plan: planId });
      const sub = store.getSubscription(id);
      if (sub && sub.planId !== planId) store.updateSubscription(id, { planId });
      const ownerName = $('#eOwnerName', dialog).value.trim();
      if (owner && ownerName && ownerName !== owner.name) store.updateTeamMember(id, owner.id, { name: ownerName });
      window.MenuFlowAdminStore.addAudit('DAIFY Admin', 'Edited restaurant', name);
      window.MenuFlowShellCommon.toast('Restaurant updated');
      dialog.close();
      renderTable();
    });
  }

  render();
})();
