/**
 * Renders the shell for the Platform Admin area (/admin/*). Deliberately a
 * separate component from shell.js (owner/manager) — an admin manages
 * MenuFlow itself, not one restaurant, and should never be visually
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
      <a class="brand" href="../index.html" aria-label="MenuFlow home"><img class="brand-logo" src="../assets/icons/menuflow-logo-dark.svg" alt="MenuFlow" /></a>
      <span class="admin-badge">Platform Admin</span>
      ${groups}
      <div class="dash-sidebar-footer">
        <a href="#" id="dashLogoutLink">Log out</a>
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
    document.addEventListener('click', event => {
      const panel = $('#userMenuPanel');
      if (panel && !panel.contains(event.target) && !event.target.closest('#userMenuBtn')) panel.classList.remove('open');
    });
    $('#userMenuLogout')?.addEventListener('click', doLogout);
    $('#dashLogoutLink')?.addEventListener('click', event => {
      event.preventDefault();
      doLogout();
    });

    $$('#dashDevtools button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.role === 'admin') return;
        window.MenuFlowStore.switchRole(btn.dataset.role);
        location.href = '../dashboard/index.html';
      });
    });
  }

  function doLogout() {
    window.MenuFlowShellCommon.confirmDialog({ title: 'Log out?', message: 'You can log back in any time.', confirmLabel: 'Log out' }).then(ok => {
      if (ok) location.href = '../login.html';
    });
  }

  window.MenuFlowAdminShell = { render, esc };
})();
