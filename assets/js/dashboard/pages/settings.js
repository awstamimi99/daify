(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;
  const role = store.getSession().role;
  const isOwner = role === 'owner';

  const TABS = [
    { id: 'account', label: 'Account' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'language', label: 'Language' },
    { id: 'security', label: 'Security' },
    { id: 'danger', label: 'Danger zone' },
  ];

  function render() {
    const restaurant = store.getActiveRestaurant();
    const user = store.currentUser();
    const content = window.MenuFlowShell.render({
      active: 'settings',
      title: 'Settings',
      subtitle: 'Manage your account and preferences.',
    });

    content.innerHTML = `
      <div class="dash-card">
        <div class="dash-tabs">
          ${TABS.map((t, i) => `<div class="dash-tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</div>`).join('')}
        </div>
        <div class="dash-tab-panel active" data-panel="account">${accountPanel(user)}</div>
        <div class="dash-tab-panel" data-panel="notifications">${notificationsPanel()}</div>
        <div class="dash-tab-panel" data-panel="language">${languagePanel()}</div>
        <div class="dash-tab-panel" data-panel="security">${securityPanel()}</div>
        <div class="dash-tab-panel" data-panel="danger">${dangerPanel(restaurant)}</div>
      </div>`;

    bindTabs();
    bindActions(restaurant);
  }

  function accountPanel(user) {
    return `
      <div class="field-row">
        <div class="field"><label for="accName">Name</label><input id="accName" value="${esc(user.name)}" /></div>
        <div class="field"><label for="accEmail">Email</label><input id="accEmail" type="email" value="${esc(user.email)}" /></div>
      </div>
      <button class="btn btn--dark" type="button" id="saveAccountBtn">Save changes</button>
      <div class="dash-hint">Password changes are handled under the Security tab.</div>`;
  }

  function notificationsPanel() {
    const items = [
      ['Menu published', true], ['Manager accepted invitation', true], ['Subscription expires soon', true],
      ['Plan limit reached', true], ['Security alerts', true], ['Product updates', false],
    ];
    return `<div class="dash-checklist">${items.map(([label, on]) => `<li><span style="flex:1">${label}</span><label class="toggle"><input type="checkbox" ${on ? 'checked' : ''} /><span class="toggle-track"></span></label></li>`).join('')}</div>`;
  }

  function languagePanel() {
    return `<div class="field" style="max-width:20rem">
      <label for="langSelect">Dashboard language</label>
      <select id="langSelect"><option>English</option><option>Arabic (بالعربية)</option></select>
    </div>
    <div class="dash-hint">This controls the dashboard interface only — your public menu's language is set per-menu on the Design page.</div>`;
  }

  function securityPanel() {
    return `
      <div class="dash-card-header" style="margin-bottom:1rem"><div><h2 style="font-size:1.1rem">Password</h2></div></div>
      <button class="btn btn--ghost" type="button" id="changePasswordBtn">Change password</button>
      <div class="dash-card-header" style="margin:1.75rem 0 1rem"><div><h2 style="font-size:1.1rem">Sessions</h2><p>Devices currently signed in to your account.</p></div></div>
      <div class="dash-table-wrap"><table class="dash-table"><tbody>
        <tr><td data-label="Device" class="cell-primary">This device — Chrome on macOS</td><td data-label="" class="cell-muted">Active now</td></tr>
        <tr><td data-label="Device" class="cell-primary">iPhone — MenuFlow (Safari)</td><td data-label="" class="cell-actions"><span class="cell-muted">2 days ago</span><button class="btn btn--ghost" type="button" style="padding:.4rem .8rem;font-size:.72rem">Sign out</button></td></tr>
      </tbody></table></div>`;
  }

  function dangerPanel(restaurant) {
    return `
      <div class="dash-card" style="border-color:var(--dash-danger-bg);background:var(--dash-danger-bg)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
          <div><strong style="display:block;color:var(--dash-danger)">Delete ${esc(restaurant.name)}</strong><span style="font-size:.8rem;color:var(--dash-danger)">Permanently deletes this restaurant, its menus, and team access. This cannot be undone.</span></div>
          ${isOwner ? `<button class="btn btn--danger" type="button" id="deleteRestaurantBtn">Delete restaurant</button>` : `<span class="status-badge status-badge--neutral">Owner only</span>`}
        </div>
      </div>
      <div class="dash-card" style="border-color:var(--dash-danger-bg);background:var(--dash-danger-bg);margin-top:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
          <div><strong style="display:block;color:var(--dash-danger)">Delete account</strong><span style="font-size:.8rem;color:var(--dash-danger)">Permanently deletes your MenuFlow account.</span></div>
          <button class="btn btn--danger" type="button" id="deleteAccountBtn">Delete account</button>
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

  function bindActions(restaurant) {
    $('#saveAccountBtn')?.addEventListener('click', () => window.MenuFlowShell.toast('Account details saved'));
    $('#changePasswordBtn')?.addEventListener('click', () => window.MenuFlowShell.toast('Password change will be available once accounts connect to Drupal.'));
    $('#deleteRestaurantBtn')?.addEventListener('click', () => {
      window.MenuFlowShell.confirmDialog({
        title: `Delete ${restaurant.name}?`,
        message: 'This permanently deletes every menu, dish, and team member for this restaurant. This cannot be undone.',
        confirmLabel: 'Delete restaurant',
        danger: true,
      }).then(ok => {
        if (ok) window.MenuFlowShell.toast('This is a prototype — restaurant deletion isn\'t enabled yet.', 'error');
      });
    });
    $('#deleteAccountBtn')?.addEventListener('click', () => {
      window.MenuFlowShell.confirmDialog({
        title: 'Delete your account?',
        message: 'This permanently deletes your MenuFlow account and removes your access to every restaurant.',
        confirmLabel: 'Delete account',
        danger: true,
      }).then(ok => {
        if (ok) window.MenuFlowShell.toast('This is a prototype — account deletion isn\'t enabled yet.', 'error');
      });
    });
  }

  render();
})();
