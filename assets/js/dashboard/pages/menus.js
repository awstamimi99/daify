(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;
  const P = window.MenuFlowPermissions.PERMISSIONS;
  const canCreate = store.can(P.MENU_CREATE);
  const canPublish = store.can(P.MENU_PUBLISH);
  const canDelete = store.can(P.MENU_DELETE);

  function render() {
    const restaurant = store.getActiveRestaurant();
    const content = window.MenuFlowShell.render({
      active: 'menus',
      title: 'Menus',
      breadcrumb: esc(restaurant.name),
      subtitle: 'Every menu for this restaurant — Main Menu, seasonal menus, and drafts.',
      actions: canCreate ? `<button class="btn btn--dark" type="button" id="createMenuBtn">+ Create menu</button>` : '',
    });
    if (!window.MenuFlowShell.requirePermission(P.MENU_VIEW, content)) return;

    content.innerHTML = `<div id="menusList"></div>`;
    renderList(restaurant);
    $('#createMenuBtn')?.addEventListener('click', openCreateDialog);
  }

  function renderList(restaurant) {
    const menus = Object.values(restaurant.menus).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const host = $('#menusList');
    if (!menus.length) {
      host.innerHTML = `<div class="dash-card"><div class="dash-empty-state"><div class="dash-empty-state-icon">▤</div><h3>No menus yet</h3><p>Create your first menu to start adding sections and dishes.</p>${canCreate ? '<button class="btn btn--dark" type="button" id="createMenuBtnEmpty">+ Create menu</button>' : ''}</div></div>`;
      $('#createMenuBtnEmpty')?.addEventListener('click', openCreateDialog);
      return;
    }

    host.innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr>
      <th>Menu</th><th>Status</th><th>Template</th><th>Items</th><th>Updated</th><th></th>
    </tr></thead><tbody>
      ${menus.map(menuRow).join('')}
    </tbody></table></div>`;

    bindRowActions(restaurant);
  }

  function menuRow(menu) {
    const itemCount = menu.sections.reduce((s, sec) => s + sec.items.length, 0);
    const config = window.MenuFlowTemplateConfigs?.[menu.template];
    const unpublished = store.hasUnpublishedChanges(menu);
    return `<tr data-menu="${menu.id}">
      <td data-label="Menu"><span class="cell-primary">${esc(menu.name)}</span>${menu.id === 'main-menu' ? ' <span class="status-badge status-badge--neutral" style="margin-left:.4rem">Primary</span>' : ''}</td>
      <td data-label="Status">
        <span class="status-badge status-badge--${menu.status === 'published' ? 'success' : 'neutral'}">${menu.status === 'published' ? 'Published' : 'Draft'}</span>
        ${unpublished ? '<div style="margin-top:.3rem"><span class="status-badge status-badge--warning">Unpublished changes</span></div>' : ''}
      </td>
      <td data-label="Template" class="cell-muted">${config ? esc(config.name) : esc(menu.template)}</td>
      <td data-label="Items" class="cell-muted">${itemCount}</td>
      <td data-label="Updated" class="cell-muted">${esc(menu.updatedAt)}</td>
      <td data-label="" class="cell-actions">
        <a class="btn btn--ghost" style="padding:.5rem .85rem;font-size:.76rem" href="menu-builder.html?menu=${menu.id}">Open</a>
        <button class="icon-btn" type="button" data-action="preview" title="Preview">↗</button>
        <button class="icon-btn" type="button" data-action="duplicate" title="Duplicate">⧉</button>
        ${canPublish ? `<button class="icon-btn" type="button" data-action="${menu.status === 'published' ? 'unpublish' : 'publish'}" title="${menu.status === 'published' ? 'Unpublish' : 'Publish'}">${menu.status === 'published' ? '⏸' : '▶'}</button>` : ''}
        ${canDelete ? `<button class="icon-btn icon-btn--danger" type="button" data-action="archive" title="Archive">✕</button>` : ''}
      </td>
    </tr>`;
  }

  function bindRowActions(restaurant) {
    $$('#menusList tbody tr').forEach(row => {
      const menuId = row.dataset.menu;
      row.querySelector('[data-action="preview"]')?.addEventListener('click', () => {
        const menu = store.getMenu(menuId, restaurant.id);
        window.open(`../templates/${menu.template}.html`, '_blank');
      });
      row.querySelector('[data-action="duplicate"]')?.addEventListener('click', () => {
        store.duplicateMenu(restaurant.id, menuId);
        window.MenuFlowShell.toast('Menu duplicated');
        renderList(store.getActiveRestaurant());
      });
      row.querySelector('[data-action="publish"]')?.addEventListener('click', () => {
        store.publishMenu(restaurant.id, menuId);
        window.MenuFlowShell.toast('Menu published');
        renderList(store.getActiveRestaurant());
      });
      row.querySelector('[data-action="unpublish"]')?.addEventListener('click', () => {
        window.MenuFlowShell.confirmDialog({ title: 'Unpublish this menu?', message: 'Guests scanning your QR code will no longer see it until you publish again.', confirmLabel: 'Unpublish', danger: true }).then(ok => {
          if (!ok) return;
          store.unpublishMenu(restaurant.id, menuId);
          window.MenuFlowShell.toast('Menu unpublished');
          renderList(store.getActiveRestaurant());
        });
      });
      row.querySelector('[data-action="archive"]')?.addEventListener('click', () => {
        window.MenuFlowShell.confirmDialog({ title: 'Archive this menu?', message: 'This permanently removes the menu and its sections and dishes. This cannot be undone.', confirmLabel: 'Archive menu', danger: true }).then(ok => {
          if (!ok) return;
          store.deleteMenu(restaurant.id, menuId);
          window.MenuFlowShell.toast('Menu archived');
          renderList(store.getActiveRestaurant());
        });
      });
    });
  }

  function openCreateDialog() {
    let dialog = $('#createMenuDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'createMenuDialog';
      dialog.className = 'dash-modal';
      document.body.appendChild(dialog);
    }

    const gate = store.checkLimit('menus');
    if (!gate.allowed) {
      dialog.innerHTML = `<div class="dash-modal-body">
        <h2>Menu limit reached</h2>
        <p>Your ${gate.plan?.name || 'current'} plan includes ${gate.limit} menu${gate.limit === 1 ? '' : 's'}. Upgrade to create another.</p>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" data-choice="cancel">Not now</button>
          <a class="btn btn--dark" href="../pricing.html">View plans</a>
        </div>
      </div>`;
      dialog.showModal();
      dialog.querySelector('[data-choice="cancel"]').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
      return;
    }

    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>Create menu</h2>
      <form id="createMenuForm" novalidate>
        <div class="field" data-field="name">
          <label for="newMenuName">Menu name</label>
          <input id="newMenuName" name="name" required placeholder="e.g. Breakfast Menu" />
          <small class="field-error" id="newMenuName-error"></small>
        </div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" id="createMenuCancel">Cancel</button>
          <button class="btn btn--dark" type="submit">Create menu</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    $('#newMenuName').focus();
    $('#createMenuCancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#createMenuForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#newMenuName').value.trim();
      if (!name) {
        $('[data-field="name"]').classList.add('has-error');
        $('#newMenuName-error').textContent = 'Enter a menu name.';
        return;
      }
      const restaurant = store.getActiveRestaurant();
      const id = store.createMenu(restaurant.id, { name, template: 'atelier' });
      dialog.close();
      window.location.href = `menu-builder.html?menu=${id}`;
    });
  }

  render();
})();
