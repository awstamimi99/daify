/**
 * Renders the sidebar + topbar shell for every owner/manager dashboard page,
 * filtered by the current role's permissions (see permissions.js). Pages
 * call MenuFlowShell.render({...}) into a <div id="dashShell"> and get a
 * fully wired app frame back — this is the one place nav/permission logic
 * lives, so it can't drift page to page.
 */
(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const P = () => window.MenuFlowPermissions.PERMISSIONS;

  const NAV = () => [
    {
      group: 'Overview',
      items: [{ id: 'overview', label: 'Dashboard', icon: '⌂', href: 'index.html', permission: null }],
    },
    {
      group: 'Restaurant',
      items: [
        { id: 'restaurant', label: 'Restaurant', icon: '◉', href: 'restaurant.html', permission: P().RESTAURANT_VIEW },
        { id: 'menus', label: 'Menus', icon: '▤', href: 'menus.html', permission: P().MENU_VIEW },
        { id: 'design', label: 'Design', icon: '✎', href: 'design.html', permission: P().THEME_VIEW },
        { id: 'publish', label: 'QR & Publish', icon: '▦', href: 'publish.html', permission: P().QR_VIEW },
        { id: 'analytics', label: 'Analytics', icon: '◔', href: 'analytics.html', permission: P().ANALYTICS_VIEW },
      ],
    },
    {
      group: 'Management',
      items: [
        { id: 'team', label: 'Team', icon: '☺', href: 'team.html', permission: P().TEAM_VIEW },
        { id: 'billing', label: 'Billing', icon: '◈', href: 'billing.html', permission: P().BILLING_VIEW },
      ],
    },
    {
      group: 'Account',
      items: [
        { id: 'settings', label: 'Settings', icon: '⚙', href: 'settings.html', permission: null },
        { id: 'help', label: 'Help', icon: '?', href: 'help.html', permission: null },
      ],
    },
  ];

  const { esc } = window.MenuFlowShellCommon;

  function sidebarHtml(activeId) {
    const can = window.MenuFlowStore.can;
    const restaurant = window.MenuFlowStore.getActiveRestaurant();
    const groups = NAV()
      .map(group => {
        const items = group.items.filter(item => !item.permission || can(item.permission));
        if (!items.length) return '';
        return `<div class="dash-nav-group"><div class="dash-nav-label">${group.group}</div><nav class="dash-nav" aria-label="${group.group}">${items
          .map(item => `<a href="${item.href}" class="${item.id === activeId ? 'active' : ''}"><span class="dash-nav-icon">${item.icon}</span> ${item.label}</a>`)
          .join('')}</nav></div>`;
      })
      .join('');

    return `
      <a class="brand" href="index.html" aria-label="Go to your dashboard"><img class="brand-logo" src="../assets/icons/menuflow-logo.svg" alt="DAIFY" /></a>
      ${restaurantSwitcherHtml(restaurant)}
      ${groups}
      <div class="dash-sidebar-footer">
        <a href="#" id="dashResetLink">Reset demo data</a>
        <a href="#" id="dashLogoutLink">Log out</a>
      </div>`;
  }

  function restaurantSwitcherHtml(active) {
    const role = window.MenuFlowStore.getSession().role;
    const user = window.MenuFlowStore.currentUser();
    const all = window.MenuFlowStore.listRestaurants();
    const visible = role === 'manager' ? all.filter(r => r.team.some(t => t.id === user.id)) : all;
    return `
      <div class="dash-switcher">
        <button type="button" class="dash-switcher-trigger" id="switcherTrigger" aria-haspopup="true" aria-expanded="false">
          <span class="dash-switcher-avatar">${esc((active?.name || '?').charAt(0))}</span>
          <span>
            <strong>${esc(active?.name || 'Select restaurant')}</strong>
            <span>${esc(active?.location || '')}</span>
          </span>
          <span class="dash-switcher-caret">▾</span>
        </button>
        <div class="dash-switcher-panel" id="switcherPanel">
          ${visible
            .map(
              r => `<button type="button" class="dash-switcher-option ${r.id === active?.id ? 'active' : ''}" data-restaurant="${r.id}">
                <span class="dash-switcher-avatar" style="width:1.7rem;height:1.7rem;font-size:.8rem">${esc(r.name.charAt(0))}</span>
                <span><strong>${esc(r.name)}</strong><small>${esc(r.location)}</small></span>
              </button>`
            )
            .join('')}
          ${role === 'owner' ? `<div class="dash-switcher-divider"></div><button type="button" class="dash-switcher-add" id="switcherAdd">+ Add restaurant</button>` : ''}
        </div>
      </div>`;
  }

  function topbarUtilsHtml() {
    const user = window.MenuFlowStore.currentUser();
    const notifications = window.MenuFlowStore.listNotifications();
    const unread = notifications.filter(n => !n.read).length;
    return `
      <div class="dash-popover">
        <button type="button" class="dash-topbar-icon-btn dash-notif-btn" id="notifBtn" aria-haspopup="true" aria-label="Notifications">
          🔔<span class="dash-notif-dot ${unread ? 'show' : ''}"></span>
        </button>
        <div class="dash-notif-panel" id="notifPanel">
          <div class="dash-notif-panel-header"><strong>Notifications</strong><button type="button" id="notifMarkRead">Mark all read</button></div>
          <div class="dash-notif-list">
            ${
              notifications.length
                ? notifications
                    .map(
                      n => `<div class="dash-notif-item ${n.read ? '' : 'unread'}"><span class="dash-notif-icon ${n.type}">${iconFor(n.type)}</span><div><div>${esc(n.text)}</div><time>${esc(n.time)}</time></div></div>`
                    )
                    .join('')
                : `<div class="dash-empty">No notifications yet.</div>`
            }
          </div>
        </div>
      </div>
      <a class="dash-topbar-icon-btn" href="help.html" aria-label="Help">?</a>
      <div class="dash-popover">
        <button type="button" class="dash-avatar-btn" id="userMenuBtn" aria-haspopup="true">${esc(user.avatarInitial)}</button>
        <div class="dash-popover-panel" id="userMenuPanel">
          <div style="padding:.55rem .7rem"><strong style="display:block;font-size:.82rem">${esc(user.name)}</strong><span style="font-size:.72rem;color:var(--dash-text-muted);text-transform:capitalize">${esc(user.role)}</span></div>
          <a href="settings.html">Settings</a>
          <a href="help.html">Help</a>
          <button type="button" id="userMenuLogout">Log out</button>
        </div>
      </div>`;
  }

  function iconFor(type) {
    return { success: '✓', warning: '!', error: '✕', info: 'i' }[type] || 'i';
  }

  function render(options) {
    const shellRoot = $('#dashShell');
    if (!shellRoot) return;
    const activeId = options.active;

    shellRoot.innerHTML = `
      <div class="dash-shell">
        <aside class="dash-sidebar" id="dashSidebar">${sidebarHtml(activeId)}</aside>
        <main class="dash-main">
          <div class="dash-topbar">
            <button class="dash-menu-toggle" aria-label="Toggle menu" id="dashMenuToggle">☰</button>
            <div>
              ${options.breadcrumb ? `<div class="dash-breadcrumb">${options.breadcrumb}</div>` : ''}
              <h1>${esc(options.title)}</h1>
              ${options.subtitle ? `<p class="dash-topbar-meta">${esc(options.subtitle)}</p>` : ''}
            </div>
            <div class="dash-topbar-actions">
              ${options.actions || ''}
              <div class="dash-topbar-utils">${topbarUtilsHtml()}</div>
            </div>
          </div>
          ${options.workspaceTabs ? `<div class="dash-workspace-tabs">${options.workspaceTabs.map(tab => `<a href="${tab.href}" class="${tab.active ? 'active' : ''}">${tab.label}</a>`).join('')}</div>` : ''}
          <div id="dashContent"></div>
        </main>
      </div>
      <div class="dash-devtools" id="dashDevtools">
        <span class="dash-devtools-label">Prototype role</span>
        <button type="button" data-role="owner">Owner</button>
        <button type="button" data-role="manager">Manager</button>
        <button type="button" data-role="admin">Admin</button>
      </div>`;

    bindChrome();
    return $('#dashContent');
  }

  function bindChrome() {
    const sidebar = $('#dashSidebar');
    $('#dashMenuToggle')?.addEventListener('click', () => sidebar.classList.toggle('open'));

    $('#switcherTrigger')?.addEventListener('click', () => togglePanel('#switcherPanel', '#switcherTrigger'));
    $$('#switcherPanel [data-restaurant]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.MenuFlowStore.switchRestaurant(btn.dataset.restaurant);
        location.reload();
      });
    });
    $('#switcherAdd')?.addEventListener('click', openAddRestaurantDialog);

    $('#notifBtn')?.addEventListener('click', () => {
      togglePanel('#notifPanel', '#notifBtn');
      window.MenuFlowStore.markNotificationsRead();
      $('.dash-notif-dot')?.classList.remove('show');
    });
    $('#notifMarkRead')?.addEventListener('click', () => {
      window.MenuFlowStore.markNotificationsRead();
      $$('.dash-notif-item').forEach(el => el.classList.remove('unread'));
    });

    $('#userMenuBtn')?.addEventListener('click', () => togglePanel('#userMenuPanel', '#userMenuBtn'));
    $('#userMenuLogout')?.addEventListener('click', doLogout);
    $('#dashLogoutLink')?.addEventListener('click', event => {
      event.preventDefault();
      doLogout();
    });
    $('#dashResetLink')?.addEventListener('click', event => {
      event.preventDefault();
      confirmDialog({
        title: 'Reset demo data?',
        message: 'This clears every change made across the whole dashboard and restores the original Oliva demo. This cannot be undone.',
        confirmLabel: 'Reset',
        danger: true,
      }).then(ok => {
        if (ok) {
          window.MenuFlowStore.resetAll();
          location.href = 'index.html';
        }
      });
    });

    document.addEventListener('click', event => {
      $$('.dash-switcher-panel.open, .dash-notif-panel.open, .dash-popover-panel.open').forEach(panel => {
        if (!panel.contains(event.target) && !event.target.closest('.dash-switcher-trigger, .dash-notif-btn, .dash-avatar-btn')) {
          panel.classList.remove('open');
        }
      });
    });

    // Prototype role switcher
    const devtools = $('#dashDevtools');
    const currentRole = window.MenuFlowStore.getSession().role;
    $$('button', devtools).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.role === currentRole);
      btn.addEventListener('click', () => {
        if (btn.dataset.role === 'admin') {
          window.MenuFlowStore.switchRole('admin');
          location.href = '../admin/index.html';
          return;
        }
        window.MenuFlowStore.switchRole(btn.dataset.role);
        location.href = 'index.html';
      });
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

  function openAddRestaurantDialog() {
    const store = window.MenuFlowStore;
    const gate = store.checkLimit('restaurants');
    const dialog = ensureDialog('addRestaurantDialog');

    if (!gate.allowed) {
      dialog.innerHTML = `<div class="dash-modal-body">
        <h2>Add another location</h2>
        <p>Your ${esc(gate.plan?.name || 'current')} plan supports ${gate.limit} restaurant${gate.limit === 1 ? '' : 's'}. Multi-location accounts are part of Business — upgrade to add more.</p>
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
      <h2>Add a restaurant location</h2>
      <form id="addRestaurantForm" novalidate>
        <div class="field"><label for="newRestName">Restaurant name</label><input id="newRestName" required /></div>
        <div class="field" style="margin-top:1rem"><label for="newRestLocation">Location</label><input id="newRestLocation" placeholder="City or neighborhood" /></div>
        <div class="field" style="margin-top:1rem"><label for="newRestCuisine">Cuisine type</label><input id="newRestCuisine" /></div>
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
      const name = $('#newRestName', dialog).value.trim();
      if (!name) return;
      const result = store.createRestaurant(store.getActiveRestaurant().id, {
        name,
        location: $('#newRestLocation', dialog).value.trim(),
        cuisineType: $('#newRestCuisine', dialog).value.trim(),
      });
      if (result.ok) {
        store.switchRestaurant(result.id);
        location.href = 'index.html';
      } else {
        toast("Couldn't add that restaurant — plan limit reached.", 'error');
      }
    });
  }

  function togglePanel(panelSelector, triggerSelector) {
    const panel = $(panelSelector);
    const trigger = $(triggerSelector);
    const willOpen = !panel.classList.contains('open');
    $$('.dash-switcher-panel, .dash-notif-panel, .dash-popover-panel').forEach(p => p.classList.remove('open'));
    panel.classList.toggle('open', willOpen);
    trigger?.setAttribute('aria-expanded', String(willOpen));
  }

  function doLogout() {
    confirmDialog({
      title: 'Log out?',
      message: 'You can log back in any time — your data stays saved on this device.',
      confirmLabel: 'Log out',
    }).then(ok => {
      if (ok) location.href = '../login.html';
    });
  }

  const { toast, confirmDialog } = window.MenuFlowShellCommon;

  /**
   * Guards a page against direct-URL access when the current role lacks the
   * required permission — nav already hides the link, but a manager (or
   * anyone) could still type the URL. Renders a clean "permission denied"
   * state and returns false so the calling page can bail out early instead
   * of building content the visitor shouldn't see.
   */
  function requirePermission(permission, contentEl) {
    if (!permission || window.MenuFlowStore.can(permission)) return true;
    const host = contentEl || $('#dashContent');
    if (host) {
      host.innerHTML = `<div class="dash-card"><div class="dash-empty-state">
        <div class="dash-empty-state-icon">⛊</div>
        <h3>You don't have permission to view this page.</h3>
        <p>Ask the restaurant owner to grant you access from Team settings.</p>
        <a class="btn btn--dark" href="index.html">Back to dashboard</a>
      </div></div>`;
    }
    return false;
  }

  window.MenuFlowShell = { render, toast, confirmDialog, esc, requirePermission };
})();
