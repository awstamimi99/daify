(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const store = window.MenuFlowStore;
  const can = store.can;

  // Illustrative demo activity — a real build would source this from Drupal's
  // audit trail (see admin/audit-logs.html for the platform-wide version).
  const DEMO_ACTIVITY = [
    { text: 'Menu published', who: 'Adam Kareem', time: '2 hours ago' },
    { text: 'Updated Truffle Rigatoni price to 8.750 KD', who: 'Sara Hassan', time: 'Yesterday' },
    { text: 'Added "Fig Panna Cotta" to Desserts', who: 'Adam Kareem', time: '3 days ago' },
    { text: 'Changed template to Atelier', who: 'Adam Kareem', time: '5 days ago' },
    { text: 'Invited Sara Hassan as manager', who: 'Adam Kareem', time: '3 months ago' },
  ];

  function primaryMenu(restaurant) {
    const menus = Object.values(restaurant.menus);
    return menus.find(m => m.id === 'main-menu') || menus[0] || null;
  }

  function render() {
    const restaurant = store.getActiveRestaurant();
    const role = store.getSession().role;
    const content = window.MenuFlowShell.render({
      active: 'overview',
      title: `Welcome back, ${restaurant.name}.`,
      subtitle: role === 'manager' ? "Here's today's operations snapshot." : "Here's what's happening with your restaurant.",
      actions: can(window.MenuFlowPermissions.PERMISSIONS.QR_VIEW)
        ? `<a class="btn btn--ghost" href="publish.html">View live menu ↗</a>`
        : '',
    });

    const menus = Object.values(restaurant.menus);
    const totalItems = menus.reduce((sum, m) => sum + m.sections.reduce((s2, sec) => s2 + sec.items.length, 0), 0);

    if (totalItems === 0) {
      content.innerHTML = onboardingHtml(restaurant, menus);
      bindOnboarding(restaurant);
      return;
    }

    content.innerHTML = role === 'manager' ? managerHomeHtml(restaurant) : ownerHomeHtml(restaurant);
  }

  function onboardingHtml(restaurant, menus) {
    const hasMenu = menus.length > 0;
    const menu = primaryMenu(restaurant);
    const steps = [
      { label: 'Create restaurant', done: true },
      { label: 'Add restaurant details', done: Boolean(restaurant.info.description) },
      { label: 'Create your first menu', done: hasMenu },
      { label: 'Add sections', done: Boolean(menu && menu.sections.length) },
      { label: 'Add menu items', done: false },
      { label: 'Choose a template', done: Boolean(menu && menu.template) },
      { label: 'Customize design', done: Boolean(restaurant.flags?.designVisited) },
      { label: 'Publish your menu', done: Boolean(menu && menu.status === 'published') },
      { label: 'Generate your QR code', done: Boolean(restaurant.flags?.qrVisited) },
    ];
    const doneCount = steps.filter(s => s.done).length;

    return `
      <div class="dash-card">
        <div class="dash-card-header">
          <div>
            <h2>Let's get ${window.MenuFlowShell.esc(restaurant.name)} live.</h2>
            <p>A few steps and your menu is ready to share with guests.</p>
          </div>
        </div>
        <div class="onboarding-progress">
          <div class="onboarding-progress-track"><div class="onboarding-progress-fill" style="width:${(doneCount / steps.length) * 100}%"></div></div>
          <span class="onboarding-progress-label">${doneCount} of ${steps.length} steps complete</span>
        </div>
        <div class="onboarding-steps">
          ${steps
            .map(
              (step, i) => `<div class="onboarding-step ${step.done ? 'done' : ''}">
                <span class="onboarding-step-num">${step.done ? '✓' : i + 1}</span>
                <div><strong>${step.label}</strong></div>
                ${!step.done && i === doneCount ? `<a class="btn btn--dark" href="${onboardingHref(i)}">${onboardingCta(i)}</a>` : ''}
              </div>`
            )
            .join('')}
        </div>
      </div>`;
  }

  function onboardingHref(stepIndex) {
    return ['restaurant.html', 'restaurant.html', 'menus.html', 'menu-builder.html', 'menu-builder.html', 'design.html', 'design.html', 'publish.html', 'publish.html'][stepIndex] || 'menus.html';
  }
  function onboardingCta(stepIndex) {
    return ['Create restaurant', 'Add details', 'Create menu', 'Add a section', 'Add a dish', 'Choose template', 'Customize', 'Publish', 'Get QR'][stepIndex] || 'Continue';
  }

  function bindOnboarding() {
    /* CTAs are plain links — nothing to bind */
  }

  function statCards(restaurant, menu) {
    const analytics = (window.MenuFlowAnalyticsSeed || {})[restaurant.id];
    const views = analytics?.hasData ? analytics.views.slice(-30).reduce((a, b) => a + b.value, 0) : null;
    const scans = analytics?.hasData ? analytics.scans.slice(-30).reduce((a, b) => a + b.value, 0) : null;
    const sub = (window.MenuFlowSubscriptionsSeed || {})[restaurant.id];
    const plan = window.MenuFlowPlansSeed.find(p => p.id === sub?.planId);
    const unpublished = store.hasUnpublishedChanges(menu);

    const cards = [
      {
        label: 'Menu status',
        value: `<span class="status-badge status-badge--${menu.status === 'published' ? 'success' : 'neutral'}">${menu.status === 'published' ? 'Published' : 'Draft'}</span>`,
        note: unpublished ? 'Unpublished changes' : menu.status === 'published' ? 'Live for guests' : 'Not visible yet',
      },
    ];
    if (can(window.MenuFlowPermissions.PERMISSIONS.ANALYTICS_VIEW)) {
      cards.push({ label: 'Menu views (30d)', value: views === null ? '—' : views.toLocaleString(), note: views === null ? 'No data yet' : 'vs. last period' });
      cards.push({ label: 'QR scans (30d)', value: scans === null ? '—' : scans.toLocaleString(), note: scans === null ? 'No data yet' : 'vs. last period' });
    }
    cards.push({ label: 'Total items', value: String(menu.sections.reduce((s, sec) => s + sec.items.length, 0)), note: `${menu.sections.length} sections` });
    if (can(window.MenuFlowPermissions.PERMISSIONS.BILLING_VIEW)) {
      cards.push({ label: 'Current plan', value: plan ? plan.name : '—', note: sub?.status === 'trial' ? 'Trial' : 'Active' });
    }
    return cards.slice(0, 4);
  }

  function ownerHomeHtml(restaurant) {
    const menu = primaryMenu(restaurant);
    const unpublished = store.hasUnpublishedChanges(menu);

    return `
      <div class="dash-stats">
        ${statCards(restaurant, menu).map(c => `<div class="dash-stat"><span>${c.label}</span><strong>${c.value}</strong><small>${c.note}</small></div>`).join('')}
      </div>

      <div class="dash-quick-actions" style="margin-bottom:1.75rem">
        ${quickAction('menu-builder.html?menu=' + menu.id, 'Edit menu', 'Add dishes, update prices.', window.MenuFlowPermissions.PERMISSIONS.MENU_EDIT)}
        ${quickAction('design.html', 'Customize design', 'Tune colors, layout, and template.', window.MenuFlowPermissions.PERMISSIONS.THEME_EDIT)}
        ${quickAction('publish.html', unpublished ? 'Publish changes' : 'View QR', unpublished ? `${menu.name} has unpublished edits.` : 'Share your menu link and QR.', window.MenuFlowPermissions.PERMISSIONS.QR_VIEW)}
      </div>

      <div class="dash-design-grid">
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Recent activity</h2><p>What's changed lately.</p></div></div>
          <ul class="dash-checklist">
            ${DEMO_ACTIVITY.map(a => `<li><span class="dash-check-icon" style="background:var(--dash-bg);color:var(--mf-ink);border-color:var(--dash-border)">•</span><span style="flex:1"><strong style="font-weight:600">${a.text}</strong><br><small style="color:var(--dash-text-muted)">${a.who} · ${a.time}</small></span></li>`).join('')}
          </ul>
        </div>
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Menu snapshot</h2><p>${window.MenuFlowShell.esc(menu.name)} · ${menu.sections.length} sections</p></div></div>
          ${menu.sections
            .slice(0, 5)
            .map(sec => `<div style="display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--dash-bg);font-size:.84rem"><span>${window.MenuFlowShell.esc(sec.name)}</span><span style="color:var(--dash-text-muted)">${sec.items.length} items</span></div>`)
            .join('')}
        </div>
      </div>`;
  }

  function managerHomeHtml(restaurant) {
    const menu = primaryMenu(restaurant);
    const items = menu.sections.flatMap(s => s.items);
    const unavailable = items.filter(it => it.available === false).length;
    const unpublished = store.hasUnpublishedChanges(menu);

    return `
      <div class="dash-stats">
        <div class="dash-stat"><span>Menu status</span><strong><span class="status-badge status-badge--${menu.status === 'published' ? 'success' : 'neutral'}">${menu.status === 'published' ? 'Published' : 'Draft'}</span></strong></div>
        <div class="dash-stat"><span>Unavailable items</span><strong>${unavailable}</strong><small>out of ${items.length}</small></div>
        <div class="dash-stat"><span>Unpublished changes</span><strong>${unpublished ? 'Yes' : 'No'}</strong><small>${unpublished ? 'Ready to publish' : 'All caught up'}</small></div>
        <div class="dash-stat"><span>Total items</span><strong>${items.length}</strong><small>${menu.sections.length} sections</small></div>
      </div>
      <div class="dash-quick-actions">
        ${quickAction(`menu-builder.html?menu=${menu.id}&action=add`, 'Add item', 'Quickly add a new dish.', window.MenuFlowPermissions.PERMISSIONS.MENU_CREATE)}
        ${quickAction(`menu-builder.html?menu=${menu.id}`, 'Edit menu', 'Update dishes and pricing.', window.MenuFlowPermissions.PERMISSIONS.MENU_EDIT)}
        ${quickAction(`menu-builder.html?menu=${menu.id}`, 'Update availability', 'Mark sold-out items.', window.MenuFlowPermissions.PERMISSIONS.MENU_EDIT)}
        ${quickAction('publish.html', 'Preview menu', 'See the live guest view.', window.MenuFlowPermissions.PERMISSIONS.QR_VIEW)}
      </div>`;
  }

  function quickAction(href, title, desc, permission) {
    if (permission && !can(permission)) return '';
    return `<a class="dash-quick-action" href="${href}"><strong>${title}</strong><span>${desc}</span></a>`;
  }

  render();
})();
