(function () {
  const data = window.MenuFlowAdminSeed.platformAnalytics;
  const content = window.MenuFlowAdminShell.render({ active: 'analytics', title: 'Platform Analytics', subtitle: 'Growth and usage across MenuFlow.' });

  const maxSignups = Math.max(...data.signupsOverTime, 1);
  const maxTemplate = Math.max(...data.templatePopularity.map(t => t.value), 1);
  const planTotal = data.planDistribution.reduce((a, b) => a + b.value, 0);
  const planColors = ['var(--dash-chart-1)', 'var(--dash-chart-2)', 'var(--dash-chart-3)'];

  content.innerHTML = `
    <div class="dash-stats">
      <div class="dash-stat"><span>Active restaurants</span><strong>${data.activeRestaurants}</strong></div>
      <div class="dash-stat"><span>Published menus</span><strong>${data.publishedMenus}</strong></div>
      <div class="dash-stat"><span>New this month</span><strong>${data.newRestaurants.slice(-1)[0]}</strong></div>
      <div class="dash-stat"><span>Signups this week</span><strong>${data.signupsOverTime.slice(-1)[0]}</strong></div>
    </div>

    <div class="dash-card" style="margin-bottom:1.75rem">
      <div class="dash-card-header"><div><h2>Signups over time</h2><p>Last 12 weeks</p></div></div>
      <div class="chart-bars">${data.signupsOverTime.map(v => `<div class="chart-bar" style="height:${Math.max(4, (v / maxSignups) * 140)}px" title="${v}"></div>`).join('')}</div>
    </div>

    <div class="dash-design-grid">
      <div class="dash-card">
        <div class="dash-card-header"><div><h2>Template popularity</h2></div></div>
        <div class="chart-legend-list">
          ${data.templatePopularity.map(t => `<div class="chart-legend-row"><span>${t.name}</span><div class="bar-track"><div class="bar-fill" style="width:${(t.value / maxTemplate) * 100}%"></div></div><strong>${t.value}</strong></div>`).join('')}
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-card-header"><div><h2>Plan distribution</h2></div></div>
        <div class="donut-legend">
          ${data.planDistribution.map((p, i) => `<div class="donut-legend-row"><span class="donut-swatch" style="background:${planColors[i]}"></span><span style="flex:1">${p.name}</span><strong>${Math.round((p.value / planTotal) * 100)}%</strong></div>`).join('')}
        </div>
      </div>
    </div>`;
})();
