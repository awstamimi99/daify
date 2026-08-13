(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const store = window.MenuFlowStore;
  const can = store.can;

  // Illustrative demo activity — a real build will source this from the
  // production audit trail (see admin/audit-logs.html for the platform view).
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
    const primary = primaryMenu(restaurant);
    const content = window.MenuFlowShell.render({
      active: 'overview',
      title: `Welcome back, ${restaurant.name}.`,
      subtitle: role === 'manager' ? "Here's today's operations snapshot." : "Here's what's happening with your restaurant.",
      actions: can(window.MenuFlowPermissions.PERMISSIONS.QR_VIEW) && primary
        ? `<a class="btn btn--ghost" href="publish.html?menu=${primary.id}">View live menu ↗</a>`
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
      { label: 'Restaurant created', note: 'Your DAIFY workspace is ready.', done: true },
      { label: 'Add restaurant details', note: 'Story, location, contact, and hours.', done: Boolean(restaurant.info.description) },
      { label: 'Create your first menu', note: 'Name the menu your guests will see.', done: hasMenu },
      { label: 'Build your sections', note: 'Starters, mains, drinks, and more.', done: Boolean(menu && menu.sections.length) },
      { label: 'Add your dishes', note: 'Descriptions, prices, and photography.', done: Boolean(menu && menu.sections.some(section => section.items.length)) },
      { label: 'Choose a template', note: 'Set the visual direction.', done: Boolean(restaurant.flags?.templateChosen) },
      { label: 'Make it yours', note: 'Tune color, type, cards, and layout.', done: Boolean(restaurant.flags?.designVisited) },
      { label: 'Publish your menu', note: 'Put the guest experience live.', done: Boolean(menu && menu.status === 'published') },
      { label: 'Download your QR', note: 'Bring the menu to every table.', done: Boolean(restaurant.flags?.qrVisited) },
    ];
    const doneCount = steps.filter(s => s.done).length;
    const nextIndex = steps.findIndex(step => !step.done);
    const activeIndex = nextIndex < 0 ? steps.length - 1 : nextIndex;
    const progress = Math.round((doneCount / steps.length) * 100);
    const phases = [
      { index: '01', label: 'Foundation', steps: steps.slice(0, 3), offset: 0 },
      { index: '02', label: 'Build the menu', steps: steps.slice(3, 5), offset: 3 },
      { index: '03', label: 'Design & launch', steps: steps.slice(5), offset: 5 },
    ];

    return `
      <section class="onboarding-dashboard">
        <div class="onboarding-hero" style="--onboarding-progress:${progress * 3.6}deg">
          <div class="onboarding-hero-copy">
            <span class="onboarding-kicker">DAIFY / LAUNCH SEQUENCE</span>
            <h2>Bring ${window.MenuFlowShell.esc(restaurant.name)}<br>to every table.</h2>
            <p>Your workspace is ready. Follow one clear path from restaurant details to a live, scannable menu.</p>
            <div class="onboarding-next">
              <span>Next · ${String(activeIndex + 1).padStart(2, '0')}</span>
              <div><strong>${steps[activeIndex].label}</strong><small>${steps[activeIndex].note}</small></div>
              <a class="btn" href="${onboardingHref(activeIndex)}">${onboardingCta(activeIndex)} <i>↗</i></a>
            </div>
          </div>
          <div class="onboarding-meter" aria-label="${doneCount} of ${steps.length} setup steps complete">
            <div><strong>${String(progress).padStart(2, '0')}<small>%</small></strong><span>SETUP<br>COMPLETE</span></div>
            <p><b>${doneCount}</b> of ${steps.length} milestones</p>
          </div>
        </div>
        <div class="onboarding-phase-grid">
          ${phases.map(phase => `<article class="onboarding-phase">
            <header><span>${phase.index}</span><div><small>PHASE</small><h3>${phase.label}</h3></div></header>
            <div class="onboarding-phase-steps">
              ${phase.steps.map((step, localIndex) => {
                const index = phase.offset + localIndex;
                const state = step.done ? 'done' : index === activeIndex ? 'active' : 'pending';
                return `<div class="onboarding-phase-step ${state}">
                  <i>${step.done ? '✓' : String(index + 1).padStart(2, '0')}</i>
                  <div><strong>${step.label}</strong><small>${step.note}</small></div>
                  ${state === 'active' ? `<a href="${onboardingHref(index)}" aria-label="${onboardingCta(index)}">→</a>` : ''}
                </div>`;
              }).join('')}
            </div>
          </article>`).join('')}
        </div>
        <footer class="onboarding-assurance">
          <span><i></i> Changes save automatically</span>
          <p>Need a hand? <a href="help.html">Open the setup guide ↗</a></p>
        </footer>
      </section>`;
  }

  function onboardingHref(stepIndex) {
    const restaurant = store.getActiveRestaurant();
    const menu = primaryMenu(restaurant);
    const menuQuery = menu ? `?menu=${encodeURIComponent(menu.id)}` : '';
    const destinations = [
      'restaurant.html',
      'restaurant.html',
      'menus.html?create=1',
      menu ? `menu-builder.html${menuQuery}&create=section` : 'menus.html?create=1',
      menu ? `menu-builder.html${menuQuery}&create=item` : 'menus.html?create=1',
      menu ? `design.html${menuQuery}&stage=choose` : 'menus.html?create=1',
      menu ? `design.html${menuQuery}&stage=customize` : 'menus.html?create=1',
      menu ? `publish.html${menuQuery}&stage=publish` : 'menus.html?create=1',
      menu ? `publish.html${menuQuery}&stage=qr` : 'menus.html?create=1',
    ];
    return window.MenuFlowShellCommon.guidedUrl(destinations[stepIndex] || 'menus.html?create=1');
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
        href: `publish.html?menu=${menu.id}`,
      },
    ];
    if (can(window.MenuFlowPermissions.PERMISSIONS.ANALYTICS_VIEW)) {
      cards.push({ label: 'Menu views (30d)', value: views === null ? '—' : views.toLocaleString(), note: views === null ? 'No data yet' : 'vs. last period', href: 'analytics.html' });
      cards.push({ label: 'QR scans (30d)', value: scans === null ? '—' : scans.toLocaleString(), note: scans === null ? 'No data yet' : 'vs. last period', href: 'analytics.html' });
    }
    cards.push({ label: 'Total items', value: String(menu.sections.reduce((s, sec) => s + sec.items.length, 0)), note: `${menu.sections.length} sections`, href: `menu-builder.html?menu=${menu.id}` });
    if (can(window.MenuFlowPermissions.PERMISSIONS.BILLING_VIEW)) {
      cards.push({ label: 'Current plan', value: plan ? plan.name : '—', note: sub?.status === 'trial' ? 'Trial' : 'Active', href: 'billing.html' });
    }
    return cards.slice(0, 4);
  }

  function ownerHomeHtml(restaurant) {
    const menu = primaryMenu(restaurant);
    const unpublished = store.hasUnpublishedChanges(menu);

    return `
      <div class="dash-stats">
        ${statCards(restaurant, menu).map(c => `<a class="dash-stat" href="${c.href}"><span>${c.label}</span><strong>${c.value}</strong><small>${c.note}</small></a>`).join('')}
      </div>

      <div class="dash-quick-actions" style="margin-bottom:1.75rem">
        ${quickAction('menu-builder.html?menu=' + menu.id, 'Edit menu', 'Add dishes, update prices.', window.MenuFlowPermissions.PERMISSIONS.MENU_EDIT)}
        ${quickAction('design.html?menu=' + menu.id, 'Customize design', 'Tune colors, layout, and template.', window.MenuFlowPermissions.PERMISSIONS.THEME_EDIT)}
        ${quickAction('publish.html?menu=' + menu.id, unpublished ? 'Publish changes' : 'View QR', unpublished ? `${menu.name} has unpublished edits.` : 'Share your menu link and QR.', window.MenuFlowPermissions.PERMISSIONS.QR_VIEW)}
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
        <a class="dash-stat" href="publish.html"><span>Menu status</span><strong><span class="status-badge status-badge--${menu.status === 'published' ? 'success' : 'neutral'}">${menu.status === 'published' ? 'Published' : 'Draft'}</span></strong></a>
        <a class="dash-stat" href="menu-builder.html?menu=${menu.id}"><span>Unavailable items</span><strong>${unavailable}</strong><small>out of ${items.length}</small></a>
        <a class="dash-stat" href="publish.html"><span>Unpublished changes</span><strong>${unpublished ? 'Yes' : 'No'}</strong><small>${unpublished ? 'Ready to publish' : 'All caught up'}</small></a>
        <a class="dash-stat" href="menu-builder.html?menu=${menu.id}"><span>Total items</span><strong>${items.length}</strong><small>${menu.sections.length} sections</small></a>
      </div>
      <div class="dash-quick-actions">
        ${quickAction(`menu-builder.html?menu=${menu.id}&action=add`, 'Add item', 'Quickly add a new dish.', window.MenuFlowPermissions.PERMISSIONS.MENU_CREATE)}
        ${quickAction(`menu-builder.html?menu=${menu.id}`, 'Edit menu', 'Update dishes and pricing.', window.MenuFlowPermissions.PERMISSIONS.MENU_EDIT)}
        ${quickAction(`menu-builder.html?menu=${menu.id}&filter=unavailable`, 'Update availability', 'Mark sold-out items.', window.MenuFlowPermissions.PERMISSIONS.MENU_EDIT)}
        ${quickAction('publish.html', 'Preview menu', 'See the live guest view.', window.MenuFlowPermissions.PERMISSIONS.QR_VIEW)}
      </div>`;
  }

  function quickAction(href, title, desc, permission) {
    if (permission && !can(permission)) return '';
    return `<a class="dash-quick-action" href="${href}"><strong>${title}</strong><span>${desc}</span></a>`;
  }

  render();
})();
