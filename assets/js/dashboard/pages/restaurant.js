(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;
  const canEdit = store.can(window.MenuFlowPermissions.PERMISSIONS.RESTAURANT_EDIT);

  const TABS = [
    { id: 'general', label: 'General' },
    { id: 'contact', label: 'Contact' },
    { id: 'location', label: 'Location' },
    { id: 'hours', label: 'Hours' },
    { id: 'social', label: 'Social' },
    { id: 'localization', label: 'Localization' },
  ];

  let hoursDraft = [];

  function render() {
    const restaurant = store.getActiveRestaurant();
    hoursDraft = (restaurant.info.hours || []).map(h => Object.assign({}, h));

    const content = window.MenuFlowShell.render({
      active: 'restaurant',
      title: 'Restaurant',
      breadcrumb: esc(restaurant.name),
      subtitle: 'Everything guests and DAIFY need to know about your restaurant.',
      actions: canEdit ? `<span class="save-state" id="saveState" data-state="idle">All changes saved</span><button class="btn btn--dark" type="button" id="saveBtn">Save changes</button>` : `<span class="status-badge status-badge--neutral">View only</span>`,
    });
    if (!window.MenuFlowShell.requirePermission(window.MenuFlowPermissions.PERMISSIONS.RESTAURANT_VIEW, content)) return;

    content.innerHTML = `
      <div class="dash-card">
        <div class="dash-tabs" id="tabs">
          ${TABS.map((t, i) => `<div class="dash-tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</div>`).join('')}
        </div>
        <form id="restaurantForm" novalidate>
          <div class="dash-tab-panel active" data-panel="general">${generalPanel(restaurant)}</div>
          <div class="dash-tab-panel" data-panel="contact">${contactPanel(restaurant)}</div>
          <div class="dash-tab-panel" data-panel="location">${locationPanel(restaurant)}</div>
          <div class="dash-tab-panel" data-panel="hours">${hoursPanel()}</div>
          <div class="dash-tab-panel" data-panel="social">${socialPanel(restaurant)}</div>
          <div class="dash-tab-panel" data-panel="localization">${localizationPanel(restaurant)}</div>
        </form>
      </div>`;

    bindTabs();
    bindForm(restaurant);
  }

  function field(id, label, value, opts = {}) {
    const tag = opts.textarea ? 'textarea' : 'input';
    const attrs = opts.textarea ? '' : `type="${opts.type || 'text'}"`;
    return `<div class="field" style="margin-bottom:1rem">
      <label for="${id}">${label}</label>
      ${tag === 'textarea'
        ? `<textarea id="${id}" name="${id}" ${canEdit ? '' : 'disabled'} placeholder="${opts.placeholder || ''}">${esc(value || '')}</textarea>`
        : `<input id="${id}" ${attrs} name="${id}" value="${esc(value || '')}" ${canEdit ? '' : 'disabled'} placeholder="${opts.placeholder || ''}" />`}
    </div>`;
  }

  function generalPanel(r) {
    return `
      <div class="field-row">
        ${field('name', 'Restaurant name', r.name)}
        ${field('cuisineType', 'Cuisine type', r.info.cuisineType, { placeholder: 'e.g. Modern Mediterranean' })}
      </div>
      ${field('description', 'Description', r.info.description, { textarea: true, placeholder: 'A short description guests will see on your menu.' })}
      <div class="dash-hint">Logo and cover image uploads will be available once storage is connected — for now these use the template's default imagery.</div>`;
  }

  function contactPanel(r) {
    return `
      <div class="field-row">
        ${field('phone', 'Phone', r.info.phone, { type: 'tel' })}
        ${field('whatsapp', 'WhatsApp', r.info.whatsapp, { type: 'tel' })}
      </div>
      <div class="field-row">
        ${field('email', 'Email', r.info.email, { type: 'email' })}
        ${field('website', 'Website', r.info.website, { type: 'url', placeholder: 'https://' })}
      </div>`;
  }

  function locationPanel(r) {
    return `
      ${field('address', 'Address', r.info.address)}
      ${field('mapsUrl', 'Google Maps URL', r.info.mapsUrl, { type: 'url', placeholder: 'https://maps.google.com/…' })}
      <div class="dash-hint">Adding a Maps link lets guests tap "Get directions" from your public menu.</div>`;
  }

  function hoursPanel() {
    return `
      <div id="hoursRows">${hoursDraft.map((h, i) => hoursRow(h, i)).join('') || '<p class="dash-empty">No hours set yet.</p>'}</div>
      ${canEdit ? `<button class="btn btn--ghost" type="button" id="addHoursRow" style="margin-top:.5rem">+ Add hours row</button>` : ''}`;
  }

  function hoursRow(h, i) {
    return `<div class="field-row" data-hours-row="${i}" style="align-items:end">
      ${field(`hoursDays${i}`, 'Days', h.days, { placeholder: 'e.g. Sunday — Thursday' })}
      <div style="display:flex;gap:.5rem;align-items:end">
        <div style="flex:1">${field(`hoursTime${i}`, 'Time', h.time, { placeholder: 'e.g. 12:00 PM — 11:00 PM' })}</div>
        ${canEdit ? `<button class="icon-btn icon-btn--danger" type="button" data-remove-hours="${i}" style="margin-bottom:1rem" title="Remove">✕</button>` : ''}
      </div>
    </div>`;
  }

  function socialPanel(r) {
    return `
      ${field('instagram', 'Instagram', r.info.instagram, { placeholder: '@yourrestaurant' })}
      ${field('facebook', 'Facebook', r.info.facebook, { placeholder: 'facebook.com/…' })}
      ${field('tiktok', 'TikTok', r.info.tiktok, { placeholder: '@yourrestaurant' })}`;
  }

  function localizationPanel(r) {
    const timezones = ['Asia/Kuwait', 'Asia/Dubai', 'Asia/Riyadh', 'Europe/London', 'America/New_York'];
    const currencies = ['KWD', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];
    const languages = ['English', 'Arabic', 'French'];
    return `
      <div class="field-row">
        <div class="field">
          <label for="timezone">Timezone</label>
          <select id="timezone" name="timezone" ${canEdit ? '' : 'disabled'}>
            ${timezones.map(tz => `<option ${tz === r.info.timezone ? 'selected' : ''}>${tz}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="currency">Currency</label>
          <select id="currency" name="currency" ${canEdit ? '' : 'disabled'}>
            ${currencies.map(c => `<option ${c === r.info.currency ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="dash-option-group">
        <span>Menu languages</span>
        <div class="dash-checkbox-row">
          ${languages.map(l => `<label><input type="checkbox" name="languages" value="${l}" ${(r.info.languages || []).includes(l) ? 'checked' : ''} ${canEdit ? '' : 'disabled'} /> ${l}</label>`).join('')}
        </div>
      </div>`;
  }

  function bindTabs() {
    $$('.dash-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.dash-tab').forEach(t => t.classList.remove('active'));
        $$('.dash-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        $(`[data-panel="${tab.dataset.tab}"]`).classList.add('active');
      });
    });
  }

  function bindForm(restaurant) {
    if (!canEdit) return;
    const form = $('#restaurantForm');
    const saveState = $('#saveState');

    $('#addHoursRow')?.addEventListener('click', () => {
      hoursDraft.push({ days: '', time: '' });
      $('#hoursRows').innerHTML = hoursDraft.map((h, i) => hoursRow(h, i)).join('');
      bindHoursRemove();
      markDirty();
    });
    bindHoursRemove();

    function bindHoursRemove() {
      $$('[data-remove-hours]').forEach(btn => {
        btn.addEventListener('click', () => {
          hoursDraft.splice(Number(btn.dataset.removeHours), 1);
          $('#hoursRows').innerHTML = hoursDraft.map((h, i) => hoursRow(h, i)).join('') || '<p class="dash-empty">No hours set yet.</p>';
          bindHoursRemove();
          markDirty();
        });
      });
    }

    function markDirty() {
      saveState.dataset.state = 'idle';
      saveState.textContent = 'Unsaved changes';
    }
    form.addEventListener('input', markDirty);

    $('#saveBtn').addEventListener('click', () => {
      saveState.dataset.state = 'saving';
      saveState.textContent = 'Saving…';
      const data = Object.fromEntries(new FormData(form).entries());
      hoursDraft = hoursDraft.map((h, i) => ({ days: form[`hoursDays${i}`]?.value || '', time: form[`hoursTime${i}`]?.value || '' }));
      const languages = $$('input[name="languages"]:checked', form).map(el => el.value);

      setTimeout(() => {
        store.updateRestaurant(restaurant.id, { name: data.name });
        store.updateRestaurantInfo(restaurant.id, {
          cuisineType: data.cuisineType,
          description: data.description,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          website: data.website,
          address: data.address,
          mapsUrl: data.mapsUrl,
          instagram: data.instagram,
          facebook: data.facebook,
          tiktok: data.tiktok,
          timezone: data.timezone,
          currency: data.currency,
          languages,
          hours: hoursDraft,
        });
        saveState.dataset.state = 'saved';
        saveState.textContent = 'All changes saved';
        window.MenuFlowShell.toast('Restaurant details saved');
      }, 450);
    });
  }

  render();
})();
