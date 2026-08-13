/**
 * Renders the shell for the Platform Admin area (/admin/*). Deliberately a
 * separate component from shell.js (owner/manager) — an admin manages
 * DAIFY itself, not one restaurant, and should never be visually
 * confused with a restaurant's dashboard.
 */
(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

  const NAV = [
    { group: 'Overview', items: [{ id: 'overview', label: 'Platform Overview', icon: '⌂', href: 'index.html' }] },
    {
      group: 'Management',
      items: [
        { id: 'restaurants', label: 'Restaurants', icon: '◉', href: 'restaurants.html' },
        { id: 'users', label: 'Users', icon: '☺', href: 'users.html' },
        { id: 'subscriptions', label: 'Subscriptions', icon: '◈', href: 'subscriptions.html' },
        { id: 'plans', label: 'Plans', icon: '▤', href: 'plans.html' },
        { id: 'templates', label: 'Templates', icon: '✎', href: 'templates.html' },
      ],
    },
    { group: 'Insights', items: [{ id: 'analytics', label: 'Analytics', icon: '◔', href: 'analytics.html' }] },
    {
      group: 'Operations',
      items: [
        { id: 'support', label: 'Support', icon: '?', href: 'support.html' },
        { id: 'notifications', label: 'Notifications', icon: '🔔', href: 'notifications.html' },
        { id: 'security', label: 'Security', icon: '⛊', href: 'security.html' },
        { id: 'audit-logs', label: 'Audit Logs', icon: '▦', href: 'audit-logs.html' },
      ],
    },
    { group: 'System', items: [{ id: 'settings', label: 'Settings', icon: '⚙', href: 'settings.html' }] },
  ];

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function sidebarHtml(activeId) {
    const groups = NAV.map(
      group => `<div class="dash-nav-group"><div class="dash-nav-label">${group.group}</div><nav class="dash-nav" aria-label="${group.group}">${group.items
        .map(item => `<a href="${item.href}" class="${item.id === activeId ? 'active' : ''}"><span class="dash-nav-icon">${item.icon}</span> ${item.label}</a>`)
        .join('')}</nav></div>`
    ).join('');
    return `
      <a class="admin-back-link" href="../dashboard/index.html">← Back to restaurant dashboards</a>
      <a class="brand" href="index.html" aria-label="Go to Platform Overview"><img class="brand-logo" src="../assets/branding/daify-logo-light.png" alt="DAIFY" /></a>
      <span class="admin-badge">Platform Admin</span>
      ${groups}
      <div class="dash-sidebar-footer">
        <button type="button" id="dashLogoutLink">Log out</button>
      </div>`;
  }

  function iconFor(type) {
    return { success: '✓', warning: '!', error: '✕', info: 'i' }[type] || 'i';
  }

  function notifBellHtml() {
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
            ${notifications.length
              ? notifications.map(n => `<div class="dash-notif-item ${n.read ? '' : 'unread'}"><span class="dash-notif-icon ${n.type}">${iconFor(n.type)}</span><div><div>${esc(n.text)}</div><time>${esc(n.time)}</time></div></div>`).join('')
              : `<div class="dash-empty">No notifications yet.</div>`}
          </div>
        </div>
      </div>`;
  }

  function render(options) {
    const shellRoot = $('#dashShell');
    if (!shellRoot) return;
    const user = window.MenuFlowUsers.admin;

    shellRoot.innerHTML = `
      <div class="dash-shell">
        <aside class="dash-sidebar admin-sidebar" id="dashSidebar">${sidebarHtml(options.active)}</aside>
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
              <div class="dash-topbar-utils">
                ${notifBellHtml()}
                <div class="dash-popover">
                  <button type="button" class="dash-avatar-btn" id="userMenuBtn" aria-haspopup="true">${esc(user.avatarInitial)}</button>
                  <div class="dash-popover-panel" id="userMenuPanel">
                    <div style="padding:.55rem .7rem"><strong style="display:block;font-size:.82rem">${esc(user.name)}</strong><span style="font-size:.72rem;color:var(--dash-text-muted)">Platform Admin</span></div>
                    <button type="button" id="userMenuLogout">Log out</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div id="dashContent"></div>
        </main>
      </div>
      <div class="dash-devtools" id="dashDevtools">
        <button type="button" class="dash-devtools-toggle" id="devtoolsToggle" aria-label="Toggle prototype role switcher" aria-expanded="false">⚙</button>
        <span class="dash-devtools-label">Prototype role</span>
        <button type="button" data-role="owner">Owner</button>
        <button type="button" data-role="manager">Manager</button>
        <button type="button" data-role="admin" class="active">Admin</button>
      </div>`;

    bindChrome();
    return $('#dashContent');
  }

  function bindChrome() {
    const sidebar = $('#dashSidebar');
    $('#dashMenuToggle')?.addEventListener('click', () => sidebar.classList.toggle('open'));
    $('#userMenuBtn')?.addEventListener('click', () => {
      $('#userMenuPanel').classList.toggle('open');
    });
    $('#notifBtn')?.addEventListener('click', () => {
      $('#notifPanel').classList.toggle('open');
      window.MenuFlowStore.markNotificationsRead();
      $('.dash-notif-dot')?.classList.remove('show');
    });
    $('#notifMarkRead')?.addEventListener('click', () => {
      window.MenuFlowStore.markNotificationsRead();
      $$('.dash-notif-item').forEach(el => el.classList.remove('unread'));
    });
    document.addEventListener('click', event => {
      $$('.dash-notif-panel.open, .dash-popover-panel.open').forEach(panel => {
        if (!panel.contains(event.target) && !event.target.closest('.dash-notif-btn, .dash-avatar-btn')) panel.classList.remove('open');
      });
    });
    $('#userMenuLogout')?.addEventListener('click', doLogout);
    $('#dashLogoutLink')?.addEventListener('click', doLogout);

    const devtools = $('#dashDevtools');
    const currentRole = window.MenuFlowStore.getSession().role;
    $$('button[data-role]', devtools).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.role === currentRole);
      btn.addEventListener('click', () => {
        if (btn.dataset.role === 'admin') return;
        window.MenuFlowStore.switchRole(btn.dataset.role);
        location.href = '../dashboard/index.html';
      });
    });
    $('#devtoolsToggle')?.addEventListener('click', () => {
      const open = devtools.classList.toggle('open');
      $('#devtoolsToggle').setAttribute('aria-expanded', String(open));
    });
  }

  function doLogout() {
    window.MenuFlowShellCommon.confirmDialog({ title: 'Log out?', message: 'You can log back in any time.', confirmLabel: 'Log out' }).then(ok => {
      if (ok) location.href = '../login.html';
    });
  }

  window.MenuFlowAdminShell = { render, esc };
})();
