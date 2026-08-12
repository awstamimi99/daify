(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;
  const P = window.MenuFlowPermissions.PERMISSIONS;
  const canEdit = store.can(P.MENU_EDIT);
  const canCreate = store.can(P.MENU_CREATE);
  const canDelete = store.can(P.MENU_DELETE);
  const canPublish = store.can(P.MENU_PUBLISH);

  const MENU_IMAGES = [
    'burrata-tomato.jpg', 'charred-lemon-chicken.jpg', 'charred-octopus.jpg', 'fig-panna-cotta.jpg',
    'garden-fattoush.jpg', 'green-herb-hummus.jpg', 'hibiscus-cooler.jpg', 'lamb-kibbeh.jpg', 'lamb-kofta.jpg',
    'lemon-linguine.jpg', 'olive-oil-cake.jpg', 'orange-blossom-cold-brew.jpg', 'peach-halloumi.jpg',
    'pistachio-baklava.jpg', 'roasted-aubergine.jpg', 'rosemary-lemonade.jpg', 'sparkling-water.jpg',
    'tahini-chocolate-tart.jpg', 'truffle-rigatoni.jpg', 'warm-lentil-salad.jpg', 'whipped-feta.jpg',
  ];
  const imageLabel = f => f.replace(/\.(jpg|png)$/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const imageUrl = f => `../assets/images/menu/${f}`;

  let restaurant, menuId, activeSectionId = null;
  let query = { search: '', filter: 'all' };
  let bulkMode = false;
  let selected = new Set();
  let itemDraft = { sectionId: null, itemId: null };

  function currentMenu() {
    return store.getMenu(menuId, restaurant.id);
  }

  function init() {
    restaurant = store.getActiveRestaurant();
    const params = new URLSearchParams(location.search);
    const menus = Object.values(restaurant.menus);
    menuId = params.get('menu') && restaurant.menus[params.get('menu')] ? params.get('menu') : (menus.find(m => m.id === 'main-menu') || menus[0])?.id;

    const guardContent = window.MenuFlowShell.render({ active: 'menus', title: 'Menu Builder' });
    if (!window.MenuFlowShell.requirePermission(P.MENU_VIEW, guardContent)) return;

    if (!menuId) {
      const content = window.MenuFlowShell.render({ active: 'menus', title: 'Menu Builder' });
      content.innerHTML = `<div class="dash-card"><div class="dash-empty-state"><div class="dash-empty-state-icon">▤</div><h3>No menu selected</h3><p>Create a menu first.</p><a class="btn btn--dark" href="menus.html">Go to Menus</a></div></div>`;
      return;
    }

    const menu = currentMenu();
    activeSectionId = menu.sections[0]?.id || null;

    const content = window.MenuFlowShell.render({
      active: 'menus',
      title: menu.name,
      breadcrumb: `<a href="menus.html">Menus</a> / ${esc(menu.name)}`,
      subtitle: `${menu.status === 'published' ? 'Published' : 'Draft'} · Changes save automatically`,
      actions: [
        `<span class="status-badge status-badge--${menu.status === 'published' ? 'success' : 'neutral'}">${menu.status === 'published' ? 'Published' : 'Draft'}</span>`,
        canPublish && menu.status !== 'published' ? `<button class="btn btn--dark" type="button" id="publishBtn">Publish</button>` : '',
        canPublish && menu.status === 'published' && store.hasUnpublishedChanges(menu) ? `<button class="btn btn--dark" type="button" id="publishBtn">Publish changes</button>` : '',
      ].join(''),
      workspaceTabs: window.MenuFlowShellCommon.menuWorkspaceTabs('content', menuId),
    });

    content.innerHTML = `
      <div class="builder-layout">
        <div class="builder-sections">
          <div class="builder-sections-head"><span>Sections</span>${canCreate ? `<button class="icon-btn" type="button" id="addSectionBtn" title="Add section">+</button>` : ''}</div>
          <div id="sectionsNav"></div>
        </div>
        <div>
          <div class="dash-filter-bar">
            <div class="dash-search"><span aria-hidden="true">⌕</span><input type="search" id="itemSearch" placeholder="Search dishes…" /></div>
            <button class="dash-filter-chip active" data-filter="all">All</button>
            <button class="dash-filter-chip" data-filter="available">Available</button>
            <button class="dash-filter-chip" data-filter="unavailable">Unavailable</button>
            <button class="dash-filter-chip" data-filter="featured">Featured</button>
            ${canEdit ? `<button class="btn btn--ghost" type="button" id="bulkModeBtn" style="margin-left:auto">Select items</button>` : ''}
          </div>
          <div class="dash-bulk-bar" id="bulkBar">
            <strong id="bulkCount">0 selected</strong>
            <div class="button-row">
              <button class="btn btn--ghost" type="button" data-bulk="available">Set available</button>
              <button class="btn btn--ghost" type="button" data-bulk="unavailable">Set unavailable</button>
              <button class="btn btn--ghost" type="button" data-bulk="delete">Delete</button>
            </div>
          </div>
          <div id="sectionCard"></div>
        </div>
      </div>`;

    renderSectionsNav();
    renderItems();
    bindTop();
    bindDialogsAndDrawer();
  }

  // ---- Sections nav ----
  function renderSectionsNav() {
    const menu = currentMenu();
    const host = $('#sectionsNav');
    if (!menu.sections.length) {
      host.innerHTML = `<div class="dash-empty" style="padding:1.5rem .5rem">No sections yet.</div>`;
      return;
    }
    host.innerHTML = menu.sections
      .map(
        sec => `<div class="builder-section-item ${sec.id === activeSectionId ? 'active' : ''}" draggable="${canEdit}" data-section="${sec.id}">
          <span class="drag-handle" aria-hidden="true">⠿</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(sec.name)}</span>
          <span class="count">${sec.items.length}</span>
        </div>`
      )
      .join('');

    $$('.builder-section-item', host).forEach(el => {
      el.addEventListener('click', () => {
        activeSectionId = el.dataset.section;
        renderSectionsNav();
        renderItems();
      });
    });
    if (canEdit) bindSectionDrag(host);
  }

  function bindSectionDrag(host) {
    let draggingId = null;
    $$('.builder-section-item', host).forEach(el => {
      el.addEventListener('dragstart', () => { draggingId = el.dataset.section; el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', event => { event.preventDefault(); el.classList.add('drag-over'); });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', event => {
        event.preventDefault();
        el.classList.remove('drag-over');
        if (!draggingId || draggingId === el.dataset.section) return;
        const menu = currentMenu();
        const ids = menu.sections.map(s => s.id);
        const from = ids.indexOf(draggingId);
        const to = ids.indexOf(el.dataset.section);
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        store.reorderSections(menuId, ids);
        renderSectionsNav();
      });
    });
  }

  // ---- Items ----
  function filteredItems(section) {
    const q = query.search.trim().toLowerCase();
    return section.items.filter(it => {
      if (q && !it.name.toLowerCase().includes(q) && !(it.description || '').toLowerCase().includes(q)) return false;
      if (query.filter === 'available' && it.available === false) return false;
      if (query.filter === 'unavailable' && it.available !== false) return false;
      if (query.filter === 'featured' && !it.featured) return false;
      return true;
    });
  }

  function renderItems() {
    const menu = currentMenu();
    const section = menu.sections.find(s => s.id === activeSectionId);
    const host = $('#sectionCard');
    if (!section) {
      host.innerHTML = `<div class="dash-card"><div class="dash-empty-state"><div class="dash-empty-state-icon">▤</div><h3>No section selected</h3><p>Add a section to start building this menu.</p></div></div>`;
      return;
    }
    const items = filteredItems(section);
    host.innerHTML = `
      <div class="dash-section-card">
        <div class="dash-section-head">
          <div><h3>${esc(section.name)}</h3>${section.description ? `<p>${esc(section.description)}</p>` : ''}</div>
          <div class="dash-section-actions">
            ${canCreate ? `<button class="icon-btn" type="button" id="addItemBtn" title="Add dish">+</button>` : ''}
            ${canEdit ? `<button class="icon-btn" type="button" id="editSectionBtn" title="Edit section">✎</button>` : ''}
            ${canDelete ? `<button class="icon-btn icon-btn--danger" type="button" id="deleteSectionBtn" title="Delete section">✕</button>` : ''}
          </div>
        </div>
        <div class="dash-section-items ${bulkMode ? 'bulk-mode' : ''}" id="itemsList">
          ${items.length ? items.map(itemRow).join('') : `<div class="dash-empty">No dishes match.</div>`}
        </div>
      </div>`;

    bindSectionCardEvents(section);
    bindItemRows(section);
  }

  function itemRow(item) {
    const thumb = item.image ? `<img class="dash-item-thumb" src="${esc(item.image)}" alt="" />` : `<div class="dash-item-thumb-empty">${esc((item.name || '?').charAt(0))}</div>`;
    const tags = [...(item.dietary || [])];
    if (item.badge) tags.unshift(item.badge);
    return `<div class="dash-item-row" draggable="${canEdit && !bulkMode}" data-item="${item.id}">
      <span class="drag-handle" aria-hidden="true">⠿</span>
      <input type="checkbox" class="dash-item-select" data-select="${item.id}" ${selected.has(item.id) ? 'checked' : ''} />
      ${thumb}
      <div class="dash-item-info">
        <strong>${esc(item.name)}${item.featured ? ' ★' : ''}</strong>
        <span>${esc(item.description || '')}</span>
        ${tags.length ? `<div class="dash-item-tags">${tags.slice(0, 3).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      </div>
      <span class="dash-item-price">${esc(item.price)}</span>
      <label class="toggle" title="Available"><input type="checkbox" data-toggle="${item.id}" ${item.available !== false ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /><span class="toggle-track"></span></label>
      <div class="dash-section-actions">
        ${canEdit ? `<button class="icon-btn" type="button" data-edit="${item.id}" title="Edit">✎</button>` : ''}
        ${canCreate ? `<button class="icon-btn" type="button" data-duplicate="${item.id}" title="Duplicate">⧉</button>` : ''}
        ${canDelete ? `<button class="icon-btn icon-btn--danger" type="button" data-delete="${item.id}" title="Delete">✕</button>` : ''}
      </div>
    </div>`;
  }

  function bindSectionCardEvents(section) {
    $('#addItemBtn')?.addEventListener('click', () => openItemDrawer(section.id, null));
    $('#editSectionBtn')?.addEventListener('click', () => openSectionDialog(section));
    $('#deleteSectionBtn')?.addEventListener('click', () => {
      window.MenuFlowShell.confirmDialog({ title: `Delete "${section.name}"?`, message: 'This removes the section and every dish inside it. This cannot be undone.', confirmLabel: 'Delete section', danger: true }).then(ok => {
        if (!ok) return;
        store.deleteSection(menuId, section.id);
        activeSectionId = currentMenu().sections[0]?.id || null;
        renderSectionsNav();
        renderItems();
        window.MenuFlowShell.toast('Section deleted');
      });
    });
  }

  function bindItemRows(section) {
    const list = $('#itemsList');
    $$('[data-toggle]', list).forEach(input => {
      input.addEventListener('change', () => {
        store.updateItem(menuId, section.id, input.dataset.toggle, { available: input.checked });
        window.MenuFlowShell.toast(input.checked ? 'Marked available' : 'Marked unavailable');
        renderSectionsNav();
      });
    });
    $$('[data-edit]', list).forEach(btn => btn.addEventListener('click', () => openItemDrawer(section.id, btn.dataset.edit)));
    $$('[data-duplicate]', list).forEach(btn =>
      btn.addEventListener('click', () => {
        const item = section.items.find(it => it.id === btn.dataset.duplicate);
        const copy = Object.assign({}, item);
        delete copy.id;
        copy.name = `${item.name} (Copy)`;
        store.addItem(menuId, section.id, copy);
        renderSectionsNav();
        renderItems();
        window.MenuFlowShell.toast('Dish duplicated');
      })
    );
    $$('[data-delete]', list).forEach(btn =>
      btn.addEventListener('click', () => {
        const item = section.items.find(it => it.id === btn.dataset.delete);
        window.MenuFlowShell.confirmDialog({ title: `Delete "${item.name}"?`, message: 'This cannot be undone.', confirmLabel: 'Delete dish', danger: true }).then(ok => {
          if (!ok) return;
          store.deleteItem(menuId, section.id, item.id);
          selected.delete(item.id);
          renderSectionsNav();
          renderItems();
          window.MenuFlowShell.toast('Dish deleted');
        });
      })
    );
    $$('[data-select]', list).forEach(cb =>
      cb.addEventListener('change', () => {
        cb.checked ? selected.add(cb.dataset.select) : selected.delete(cb.dataset.select);
        updateBulkBar();
      })
    );
    if (canEdit) bindItemDrag(list, section);
  }

  function bindItemDrag(list, section) {
    let draggingId = null;
    $$('.dash-item-row', list).forEach(row => {
      row.addEventListener('dragstart', () => { draggingId = row.dataset.item; row.classList.add('dragging'); });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', event => { event.preventDefault(); row.classList.add('drag-over'); });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', event => {
        event.preventDefault();
        row.classList.remove('drag-over');
        if (!draggingId || draggingId === row.dataset.item) return;
        const ids = section.items.map(it => it.id);
        const from = ids.indexOf(draggingId);
        const to = ids.indexOf(row.dataset.item);
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        store.reorderItems(menuId, section.id, ids);
        renderItems();
      });
    });
  }

  // ---- Bulk actions ----
  function updateBulkBar() {
    $('#bulkCount').textContent = `${selected.size} selected`;
    $('#bulkBar').classList.toggle('show', selected.size > 0);
  }

  // ---- Top bar (search/filter/publish) ----
  function bindTop() {
    $('#itemSearch').addEventListener('input', event => { query.search = event.target.value; renderItems(); });
    $$('.dash-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.dash-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        query.filter = chip.dataset.filter;
        renderItems();
      });
    });
    $('#bulkModeBtn')?.addEventListener('click', () => {
      bulkMode = !bulkMode;
      selected.clear();
      $('#bulkModeBtn').textContent = bulkMode ? 'Cancel selection' : 'Select items';
      $('#bulkModeBtn').classList.toggle('btn--dark', bulkMode);
      renderItems();
      updateBulkBar();
    });
    $$('[data-bulk]').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = currentMenu().sections.find(s => s.id === activeSectionId);
        if (btn.dataset.bulk === 'available') selected.forEach(id => store.updateItem(menuId, section.id, id, { available: true }));
        if (btn.dataset.bulk === 'unavailable') selected.forEach(id => store.updateItem(menuId, section.id, id, { available: false }));
        if (btn.dataset.bulk === 'delete') {
          window.MenuFlowShell.confirmDialog({ title: `Delete ${selected.size} dishes?`, message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }).then(ok => {
            if (!ok) return;
            selected.forEach(id => store.deleteItem(menuId, section.id, id));
            selected.clear();
            renderSectionsNav();
            renderItems();
            updateBulkBar();
          });
          return;
        }
        selected.clear();
        renderSectionsNav();
        renderItems();
        updateBulkBar();
        window.MenuFlowShell.toast('Updated');
      });
    });
    $('#addSectionBtn')?.addEventListener('click', () => openSectionDialog(null));
    $('#publishBtn')?.addEventListener('click', () => {
      store.publishMenu(restaurant.id, menuId);
      window.MenuFlowShell.toast('Menu published');
      init();
    });
  }

  // ---- Section dialog ----
  function openSectionDialog(section) {
    let dialog = $('#sectionDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'sectionDialog';
      dialog.className = 'dash-modal';
      document.body.appendChild(dialog);
    }
    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>${section ? 'Edit section' : 'Add section'}</h2>
      <form id="sectionForm" novalidate>
        <div class="field" data-field="name">
          <label for="sectionName">Section name</label>
          <input id="sectionName" name="name" required value="${section ? esc(section.name) : ''}" />
          <small class="field-error" id="sectionName-error"></small>
        </div>
        <div class="field" style="margin-top:1rem">
          <label for="sectionDescription">Description</label>
          <input id="sectionDescription" name="description" value="${section ? esc(section.description || '') : ''}" placeholder="e.g. Small plates for the table" />
        </div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" id="sectionCancel">Cancel</button>
          <button class="btn btn--dark" type="submit">Save section</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    $('#sectionName').focus();
    $('#sectionCancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#sectionForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#sectionName').value.trim();
      const description = $('#sectionDescription').value.trim();
      if (!name) {
        $('[data-field="name"]').classList.add('has-error');
        $('#sectionName-error').textContent = 'Enter a section name.';
        return;
      }
      if (section) store.updateSection(menuId, section.id, { name, description });
      else store.addSection(menuId, { name, description });
      dialog.close();
      if (!section) activeSectionId = currentMenu().sections[currentMenu().sections.length - 1].id;
      renderSectionsNav();
      renderItems();
      window.MenuFlowShell.toast(section ? 'Section updated' : 'Section added');
    });
  }

  // ---- Item drawer ----
  function bindDialogsAndDrawer() {
    if (!$('#itemDrawerBackdrop')) {
      const backdrop = document.createElement('div');
      backdrop.className = 'dash-drawer-backdrop';
      backdrop.id = 'itemDrawerBackdrop';
      const drawer = document.createElement('div');
      drawer.className = 'dash-drawer';
      drawer.id = 'itemDrawer';
      document.body.append(backdrop, drawer);
      backdrop.addEventListener('click', closeItemDrawer);
    }
  }

  function closeItemDrawer() {
    $('#itemDrawerBackdrop').classList.remove('open');
    $('#itemDrawer').classList.remove('open');
  }

  function openItemDrawer(sectionId, itemId) {
    itemDraft = { sectionId, itemId };
    const section = currentMenu().sections.find(s => s.id === sectionId);
    const item = itemId ? section.items.find(it => it.id === itemId) : null;
    const drawer = $('#itemDrawer');
    drawer.innerHTML = `
      <div class="dash-drawer-header"><h2>${item ? 'Edit dish' : 'Add dish'}</h2><button class="dash-drawer-close" id="drawerClose" aria-label="Close">✕</button></div>
      <div class="dash-drawer-body">
        <form id="itemForm" novalidate>
          <div class="field" data-field="name">
            <label for="itemName">Dish name</label>
            <input id="itemName" name="name" required value="${item ? esc(item.name) : ''}" />
            <small class="field-error" id="itemName-error"></small>
          </div>
          <div class="field" style="margin-top:1rem">
            <label for="itemDescription">Description</label>
            <input id="itemDescription" name="description" value="${item ? esc(item.description || '') : ''}" placeholder="Key ingredients, prepared how" />
          </div>
          <div class="field-row" style="margin-top:1rem">
            <div class="field" data-field="price">
              <label for="itemPrice">Price</label>
              <input id="itemPrice" name="price" required value="${item ? esc(item.price) : ''}" placeholder="e.g. 4.500 KD" />
              <small class="field-error" id="itemPrice-error"></small>
            </div>
            <div class="field">
              <label for="itemBadge">Badge (optional)</label>
              <input id="itemBadge" name="badge" value="${item ? esc(item.badge || '') : ''}" placeholder="e.g. Chef's Choice" />
            </div>
          </div>
          <div class="field" style="margin-top:1rem">
            <label for="itemImage">Photo</label>
            <select id="itemImage" name="image">
              <option value="">No photo</option>
              ${MENU_IMAGES.map(f => `<option value="${imageUrl(f)}" ${item && item.image === imageUrl(f) ? 'selected' : ''}>${imageLabel(f)}</option>`).join('')}
            </select>
          </div>
          <div class="dash-option-group" style="margin-top:1rem">
            <span>Dietary</span>
            <div class="dash-checkbox-row">
              ${['Vegetarian', 'Vegan', 'Gluten Free', 'Spicy'].map(d => `<label><input type="checkbox" name="dietary" value="${d}" ${item && (item.dietary || []).includes(d) ? 'checked' : ''} /> ${d}</label>`).join('')}
            </div>
          </div>
          <div class="dash-checkbox-row">
            <label><input type="checkbox" name="featured" ${item?.featured ? 'checked' : ''} /> Featured</label>
            <label><input type="checkbox" name="available" ${!item || item.available !== false ? 'checked' : ''} /> Available</label>
          </div>
          <span class="dash-advanced-toggle" id="advancedToggle">+ Advanced fields</span>
          <div class="dash-advanced-fields" id="advancedFields">
            <div class="field-row">
              <div class="field"><label for="itemOriginalPrice">Original price</label><input id="itemOriginalPrice" name="originalPrice" value="${item ? esc(item.originalPrice || '') : ''}" placeholder="For showing a discount" /></div>
              <div class="field"><label for="itemCalories">Calories</label><input id="itemCalories" name="calories" value="${item ? esc(item.calories || '') : ''}" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label for="itemAllergens">Allergens</label><input id="itemAllergens" name="allergens" value="${item ? esc(item.allergens || '') : ''}" placeholder="e.g. Nuts, dairy" /></div>
              <div class="field"><label for="itemSku">SKU / internal ref</label><input id="itemSku" name="sku" value="${item ? esc(item.sku || '') : ''}" /></div>
            </div>
          </div>
        </form>
      </div>
      <div class="dash-drawer-footer">
        <button class="btn btn--ghost" type="button" id="drawerCancel">Cancel</button>
        <button class="btn btn--dark" type="button" id="drawerSave">Save dish</button>
      </div>`;

    $('#itemDrawerBackdrop').classList.add('open');
    drawer.classList.add('open');
    $('#itemName').focus();
    $('#drawerClose').addEventListener('click', closeItemDrawer);
    $('#drawerCancel').addEventListener('click', closeItemDrawer);
    $('#advancedToggle').addEventListener('click', () => {
      const fields = $('#advancedFields');
      fields.classList.toggle('open');
      $('#advancedToggle').textContent = fields.classList.contains('open') ? '− Advanced fields' : '+ Advanced fields';
    });
    $('#drawerSave').addEventListener('click', saveItemDrawer);
  }

  function saveItemDrawer() {
    const form = $('#itemForm');
    const name = form.name.value.trim();
    const price = form.price.value.trim();
    let hasError = false;
    const nameWrap = form.querySelector('[data-field="name"]');
    if (!name) { nameWrap.classList.add('has-error'); $('#itemName-error').textContent = 'Enter a dish name.'; hasError = true; }
    else { nameWrap.classList.remove('has-error'); $('#itemName-error').textContent = ''; }
    const priceWrap = form.querySelector('[data-field="price"]');
    if (!price) { priceWrap.classList.add('has-error'); $('#itemPrice-error').textContent = 'Enter a price.'; hasError = true; }
    else { priceWrap.classList.remove('has-error'); $('#itemPrice-error').textContent = ''; }
    if (hasError) return;

    const payload = {
      name,
      price,
      description: form.description.value.trim(),
      badge: form.badge.value.trim(),
      image: form.image.value || null,
      dietary: $$('input[name="dietary"]', form).filter(cb => cb.checked).map(cb => cb.value),
      featured: form.featured.checked,
      available: form.available.checked,
      originalPrice: form.originalPrice.value.trim(),
      calories: form.calories.value.trim(),
      allergens: form.allergens.value.trim(),
      sku: form.sku.value.trim(),
    };

    if (itemDraft.itemId) {
      store.updateItem(menuId, itemDraft.sectionId, itemDraft.itemId, payload);
      window.MenuFlowShell.toast('Dish updated');
    } else {
      store.addItem(menuId, itemDraft.sectionId, payload);
      window.MenuFlowShell.toast('Dish added');
    }
    closeItemDrawer();
    renderSectionsNav();
    renderItems();
  }

  init();
})();
