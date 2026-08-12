(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const admin = window.MenuFlowAdminStore.templatesAdmin;
  const configs = window.MenuFlowTemplateConfigs;
  const esc = window.MenuFlowShellCommon.esc;

  function render() {
    const content = window.MenuFlowAdminShell.render({ active: 'templates', title: 'Templates', subtitle: 'Control which templates are available, and to which plans.' });
    content.innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr>
      <th>Template</th><th>Category</th><th>Status</th><th>Featured</th><th>Plan availability</th><th>Order</th><th></th>
    </tr></thead><tbody id="rows"></tbody></table></div>
    <div class="dash-hint" style="margin-top:1rem">Template markup lives in code — this page controls merchandising: display name/description overrides, availability, and plan gating.</div>`;
    renderRows();
  }

  function displayName(t) {
    return t.nameOverride || configs[t.id]?.name || t.id;
  }
  function displayCategory(t) {
    return t.categoryOverride || configs[t.id]?.category || '';
  }

  function renderRows() {
    const sorted = [...admin.list()].sort((a, b) => a.order - b.order);
    $('#rows').innerHTML = sorted
      .map(t => `<tr data-id="${t.id}">
        <td data-label="Template" class="cell-primary">${esc(displayName(t))}</td>
        <td data-label="Category" class="cell-muted">${esc(displayCategory(t))}</td>
        <td data-label="Status"><label class="toggle"><input type="checkbox" data-action="status" ${t.status === 'enabled' ? 'checked' : ''} /><span class="toggle-track"></span></label></td>
        <td data-label="Featured"><label class="toggle"><input type="checkbox" data-action="featured" ${t.featured ? 'checked' : ''} /><span class="toggle-track"></span></label></td>
        <td data-label="Plan availability">
          <select data-action="plan">
            <option value="all" ${t.planAvailability === 'all' ? 'selected' : ''}>All plans</option>
            <option value="pro+" ${t.planAvailability === 'pro+' ? 'selected' : ''}>Pro and above</option>
            <option value="business" ${t.planAvailability === 'business' ? 'selected' : ''}>Business only</option>
          </select>
        </td>
        <td data-label="Order" class="cell-muted">${t.order}</td>
        <td data-label="" class="cell-actions">
          <button class="icon-btn" type="button" data-action="edit" title="Edit details">✎</button>
          <a class="btn btn--ghost" style="padding:.5rem .85rem;font-size:.76rem" href="../template-preview.html?template=${t.id}" target="_blank" rel="noopener">Preview</a>
        </td>
      </tr>`)
      .join('');

    $$('#rows tr').forEach(row => {
      const t = admin.list().find(x => x.id === row.dataset.id);
      row.querySelector('[data-action="status"]').addEventListener('change', e => {
        admin.update(t.id, { status: e.target.checked ? 'enabled' : 'disabled' });
        window.MenuFlowShellCommon.toast(`${displayName(t)} ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
      row.querySelector('[data-action="featured"]').addEventListener('change', e => {
        admin.update(t.id, { featured: e.target.checked });
        window.MenuFlowShellCommon.toast('Updated');
      });
      row.querySelector('[data-action="plan"]').addEventListener('change', e => {
        admin.update(t.id, { planAvailability: e.target.value });
        window.MenuFlowShellCommon.toast('Plan availability updated');
      });
      row.querySelector('[data-action="edit"]').addEventListener('click', () => openEditDialog(t));
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

  function openEditDialog(t) {
    const config = configs[t.id];
    const dialog = ensureDialog('templateDialog');
    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>Edit ${esc(displayName(t))}</h2>
      <p class="dash-hint" style="margin-bottom:1rem">Overrides how this template is merchandised on the marketing site and admin panel. Leave blank to use the code default.</p>
      <form id="templateForm" novalidate>
        <div class="field"><label for="tName">Display name</label><input id="tName" value="${esc(t.nameOverride || '')}" placeholder="${esc(config?.name || '')}" /></div>
        <div class="field" style="margin-top:1rem"><label for="tCategory">Category</label><input id="tCategory" value="${esc(t.categoryOverride || '')}" placeholder="${esc(config?.category || '')}" /></div>
        <div class="field" style="margin-top:1rem"><label for="tDescription">Description</label><textarea id="tDescription" rows="3" placeholder="${esc(config?.description || '')}">${esc(t.descriptionOverride || '')}</textarea></div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
          <button class="btn btn--dark" type="submit">Save changes</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    dialog.querySelector('[data-choice="cancel"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#templateForm', dialog).addEventListener('submit', e => {
      e.preventDefault();
      admin.update(t.id, {
        nameOverride: $('#tName', dialog).value.trim(),
        categoryOverride: $('#tCategory', dialog).value.trim(),
        descriptionOverride: $('#tDescription', dialog).value.trim(),
      });
      window.MenuFlowShellCommon.toast('Template details updated');
      dialog.close();
      renderRows();
    });
  }

  render();
})();
