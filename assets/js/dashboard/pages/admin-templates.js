(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const admin = window.MenuFlowAdminSeed.templatesAdmin;
  const configs = window.MenuFlowTemplateConfigs;

  function render() {
    const content = window.MenuFlowAdminShell.render({ active: 'templates', title: 'Templates', subtitle: 'Control which templates are available, and to which plans.' });
    content.innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr>
      <th>Template</th><th>Category</th><th>Status</th><th>Featured</th><th>Plan availability</th><th>Order</th><th></th>
    </tr></thead><tbody id="rows"></tbody></table></div>
    <div class="dash-hint" style="margin-top:1rem">Template design/markup is edited in code, not here — this page only controls availability and merchandising.</div>`;
    renderRows();
  }

  function renderRows() {
    const sorted = [...admin].sort((a, b) => a.order - b.order);
    $('#rows').innerHTML = sorted
      .map(t => {
        const config = configs[t.id];
        return `<tr data-id="${t.id}">
        <td data-label="Template" class="cell-primary">${config?.name || t.id}</td>
        <td data-label="Category" class="cell-muted">${config?.category || ''}</td>
        <td data-label="Status"><label class="toggle"><input type="checkbox" data-action="status" ${t.status === 'enabled' ? 'checked' : ''} /><span class="toggle-track"></span></label></td>
        <td data-label="Featured"><label class="toggle"><input type="checkbox" data-action="featured" ${t.featured ? 'checked' : ''} /><span class="toggle-track"></span></label></td>
        <td data-label="Plan availability">
          <select data-action="plan">
            <option value="all" ${t.planAvailability === 'all' ? 'selected' : ''}>All plans</option>
            <option value="pro+" ${t.planAvailability === 'pro+' ? 'selected' : ''}>Pro and above</option>
          </select>
        </td>
        <td data-label="Order" class="cell-muted">${t.order}</td>
        <td data-label="" class="cell-actions"><a class="btn btn--ghost" style="padding:.5rem .85rem;font-size:.76rem" href="../templates/${t.id}.html?preview=1" target="_blank" rel="noopener">Preview</a></td>
      </tr>`;
      })
      .join('');

    $$('#rows tr').forEach(row => {
      const t = admin.find(x => x.id === row.dataset.id);
      row.querySelector('[data-action="status"]').addEventListener('change', e => {
        t.status = e.target.checked ? 'enabled' : 'disabled';
        window.MenuFlowShellCommon.toast(`${configs[t.id]?.name} ${t.status}`);
      });
      row.querySelector('[data-action="featured"]').addEventListener('change', e => {
        t.featured = e.target.checked;
        window.MenuFlowShellCommon.toast('Updated');
      });
      row.querySelector('[data-action="plan"]').addEventListener('change', e => {
        t.planAvailability = e.target.value;
        window.MenuFlowShellCommon.toast('Plan availability updated');
      });
    });
  }

  render();
})();
