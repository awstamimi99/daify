(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MENU_IMAGES = [
    'burrata-tomato.jpg', 'charred-lemon-chicken.jpg', 'charred-octopus.jpg', 'fig-panna-cotta.jpg',
    'garden-fattoush.jpg', 'green-herb-hummus.jpg', 'hibiscus-cooler.jpg', 'lamb-kibbeh.jpg', 'lamb-kofta.jpg',
    'lemon-linguine.jpg', 'olive-oil-cake.jpg', 'orange-blossom-cold-brew.jpg', 'peach-halloumi.jpg',
    'pistachio-baklava.jpg', 'roasted-aubergine.jpg', 'rosemary-lemonade.jpg', 'sparkling-water.jpg',
    'tahini-chocolate-tart.jpg', 'truffle-rigatoni.jpg', 'warm-lentil-salad.jpg', 'whipped-feta.jpg',
  ];

  const imageLabel = file => file.replace(/\.(jpg|png)$/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const imageUrl = file => `../assets/images/menu/${file}`;

  let sectionEditingId = null;
  let itemContext = { sectionId: null, itemId: null };

  function renderSections() {
    const state = window.MenuFlowStore.getState();
    const container = $('#sectionsList');
    if (!state.sections.length) {
      container.innerHTML = `<div class="dash-card"><div class="dash-empty">No sections yet. Add your first section to start building your menu.</div></div>`;
      return;
    }
    container.innerHTML = state.sections.map(sectionMarkup).join('');
  }

  function sectionMarkup(section) {
    const items = section.items || [];
    const itemsHtml = items.length
      ? items.map(item => itemRowMarkup(item)).join('')
      : `<div class="dash-empty">No dishes in this section yet.</div>`;
    return `
      <div class="dash-section-card" data-section-id="${section.id}">
        <div class="dash-section-head">
          <div>
            <h3>${esc(section.name)}</h3>
            ${section.description ? `<p>${esc(section.description)}</p>` : ''}
          </div>
          <div class="dash-section-actions">
            <button class="icon-btn" type="button" data-action="add-item" title="Add dish">+</button>
            <button class="icon-btn" type="button" data-action="edit-section" title="Edit section">✎</button>
            <button class="icon-btn icon-btn--danger" type="button" data-action="delete-section" title="Delete section">✕</button>
          </div>
        </div>
        <div class="dash-section-items">${itemsHtml}</div>
      </div>`;
  }

  function itemRowMarkup(item) {
    const thumb = item.image
      ? `<img class="dash-item-thumb" src="${esc(item.image)}" alt="" />`
      : `<div class="dash-item-thumb-empty">${esc((item.name || '?').charAt(0))}</div>`;
    const tags = [...(item.dietary || [])];
    if (item.badge) tags.unshift(item.badge);
    return `
      <div class="dash-item-row" data-item-id="${item.id}">
        ${thumb}
        <div class="dash-item-info">
          <strong>${esc(item.name)}${item.featured ? ' ★' : ''}</strong>
          <span>${esc(item.description || '')}</span>
          ${tags.length ? `<div class="dash-item-tags">${tags.slice(0, 3).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
        <span class="dash-item-price">${esc(item.price)}</span>
        <label class="toggle" title="Available on menu">
          <input type="checkbox" data-action="toggle-available" ${item.available !== false ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </label>
        <div class="dash-section-actions">
          <button class="icon-btn" type="button" data-action="edit-item" title="Edit dish">✎</button>
          <button class="icon-btn icon-btn--danger" type="button" data-action="delete-item" title="Delete dish">✕</button>
        </div>
      </div>`;
  }

  function populateImageOptions(select, selected) {
    const options = ['<option value="">No photo</option>'].concat(
      MENU_IMAGES.map(file => {
        const url = imageUrl(file);
        return `<option value="${url}" ${selected === url ? 'selected' : ''}>${imageLabel(file)}</option>`;
      })
    );
    select.innerHTML = options.join('');
  }

  function openSectionDialog(id) {
    sectionEditingId = id || null;
    const dialog = $('#sectionDialog');
    const form = $('#sectionForm');
    form.reset();
    form.querySelector('[data-field="name"]').classList.remove('has-error');
    $('#sectionName-error').textContent = '';

    if (id) {
      const section = window.MenuFlowStore.getState().sections.find(s => s.id === id);
      $('#sectionDialogTitle').textContent = 'Edit section';
      form.name.value = section.name || '';
      form.description.value = section.description || '';
    } else {
      $('#sectionDialogTitle').textContent = 'Add section';
    }
    dialog.showModal();
    form.name.focus();
  }

  function openItemDialog(sectionId, itemId) {
    itemContext = { sectionId, itemId: itemId || null };
    const dialog = $('#itemDialog');
    const form = $('#itemForm');
    form.reset();
    ['name', 'price'].forEach(field => {
      form.querySelector(`[data-field="${field}"]`).classList.remove('has-error');
    });
    $('#itemName-error').textContent = '';
    $('#itemPrice-error').textContent = '';
    populateImageOptions(form.image, null);

    if (itemId) {
      const section = window.MenuFlowStore.getState().sections.find(s => s.id === sectionId);
      const item = section.items.find(it => it.id === itemId);
      $('#itemDialogTitle').textContent = 'Edit dish';
      form.name.value = item.name || '';
      form.description.value = item.description || '';
      form.price.value = item.price || '';
      form.badge.value = item.badge || '';
      populateImageOptions(form.image, item.image || null);
      $$('input[name="dietary"]', form).forEach(cb => { cb.checked = (item.dietary || []).includes(cb.value); });
      form.featured.checked = Boolean(item.featured);
      form.available.checked = item.available !== false;
    } else {
      $('#itemDialogTitle').textContent = 'Add dish';
      form.available.checked = true;
    }
    dialog.showModal();
    form.name.focus();
  }

  function bindListDelegation() {
    const container = $('#sectionsList');

    container.addEventListener('click', event => {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;
      const sectionCard = event.target.closest('[data-section-id]');
      const sectionId = sectionCard?.dataset.sectionId;
      const itemRow = event.target.closest('[data-item-id]');
      const itemId = itemRow?.dataset.itemId;

      if (btn.dataset.action === 'add-item') openItemDialog(sectionId, null);
      if (btn.dataset.action === 'edit-section') openSectionDialog(sectionId);
      if (btn.dataset.action === 'edit-item') openItemDialog(sectionId, itemId);

      if (btn.dataset.action === 'delete-section') {
        const section = window.MenuFlowStore.getState().sections.find(s => s.id === sectionId);
        if (confirm(`Delete "${section?.name}" and all its dishes? This can't be undone.`)) {
          window.MenuFlowStore.deleteSection(sectionId);
          renderSections();
          window.MenuFlowDashShell.showToast('Section deleted');
        }
      }
      if (btn.dataset.action === 'delete-item') {
        const section = window.MenuFlowStore.getState().sections.find(s => s.id === sectionId);
        const item = section?.items.find(it => it.id === itemId);
        if (confirm(`Delete "${item?.name}"? This can't be undone.`)) {
          window.MenuFlowStore.deleteItem(sectionId, itemId);
          renderSections();
          window.MenuFlowDashShell.showToast('Dish deleted');
        }
      }
    });

    container.addEventListener('change', event => {
      const toggle = event.target.closest('[data-action="toggle-available"]');
      if (!toggle) return;
      const sectionId = event.target.closest('[data-section-id]').dataset.sectionId;
      const itemId = event.target.closest('[data-item-id]').dataset.itemId;
      window.MenuFlowStore.updateItem(sectionId, itemId, { available: toggle.checked });
      window.MenuFlowDashShell.showToast(toggle.checked ? 'Marked available' : 'Marked unavailable');
    });
  }

  function bindDialogs() {
    $('#addSectionBtn').addEventListener('click', () => openSectionDialog(null));
    $('#sectionCancelBtn').addEventListener('click', () => $('#sectionDialog').close());
    $('#itemCancelBtn').addEventListener('click', () => $('#itemDialog').close());

    [$('#sectionDialog'), $('#itemDialog')].forEach(dialog => {
      dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
      });
    });

    $('#sectionForm').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.target;
      const name = form.name.value.trim();
      const description = form.description.value.trim();
      const wrap = form.querySelector('[data-field="name"]');
      const errorEl = $('#sectionName-error');

      if (!name) {
        wrap.classList.add('has-error');
        errorEl.textContent = 'Enter a section name.';
        form.name.focus();
        return;
      }
      wrap.classList.remove('has-error');
      errorEl.textContent = '';

      if (sectionEditingId) {
        window.MenuFlowStore.updateSection(sectionEditingId, { name, description });
        window.MenuFlowDashShell.showToast('Section updated');
      } else {
        window.MenuFlowStore.addSection({ name, description });
        window.MenuFlowDashShell.showToast('Section added');
      }
      $('#sectionDialog').close();
      renderSections();
    });

    $('#itemForm').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.target;
      const name = form.name.value.trim();
      const description = form.description.value.trim();
      const price = form.price.value.trim();
      const badge = form.badge.value.trim();
      const image = form.image.value || null;
      const dietary = $$('input[name="dietary"]', form).filter(cb => cb.checked).map(cb => cb.value);
      const featured = form.featured.checked;
      const available = form.available.checked;

      let hasError = false;
      const nameWrap = form.querySelector('[data-field="name"]');
      const nameError = $('#itemName-error');
      if (!name) {
        nameWrap.classList.add('has-error');
        nameError.textContent = 'Enter a dish name.';
        hasError = true;
      } else {
        nameWrap.classList.remove('has-error');
        nameError.textContent = '';
      }

      const priceWrap = form.querySelector('[data-field="price"]');
      const priceError = $('#itemPrice-error');
      if (!price) {
        priceWrap.classList.add('has-error');
        priceError.textContent = 'Enter a price.';
        hasError = true;
      } else {
        priceWrap.classList.remove('has-error');
        priceError.textContent = '';
      }

      if (hasError) {
        (name ? form.price : form.name).focus();
        return;
      }

      const payload = { name, description, price, badge, image, dietary, featured, available };

      if (itemContext.itemId) {
        window.MenuFlowStore.updateItem(itemContext.sectionId, itemContext.itemId, payload);
        window.MenuFlowDashShell.showToast('Dish updated');
      } else {
        window.MenuFlowStore.addItem(itemContext.sectionId, payload);
        window.MenuFlowDashShell.showToast('Dish added');
      }
      $('#itemDialog').close();
      renderSections();
    });
  }

  function init() {
    renderSections();
    bindListDelegation();
    bindDialogs();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
