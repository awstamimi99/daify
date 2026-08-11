(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;

  let range = 30;

  function init() {
    const restaurant = store.getActiveRestaurant();
    const content = window.MenuFlowShell.render({
      active: 'analytics',
      title: 'Analytics',
      breadcrumb: esc(restaurant.name),
      subtitle: 'How guests are discovering and browsing your menu.',
      actions: `<div class="segmented" id="rangeToggle">
        <button type="button" data-range="7">7 days</button>
        <button type="button" data-range="30" class="active">30 days</button>
        <button type="button" data-range="90">90 days</button>
      </div>`,
    });
    content.innerHTML = `<div id="analyticsBody"></div>`;
    renderBody(restaurant);

    $$('#rangeToggle button').forEach(btn =>
      btn.addEventListener('click', () => {
        $$('#rangeToggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        range = Number(btn.dataset.range);
        renderBody(restaurant);
      })
    );
  }

  function sum(series, days) {
    return series.slice(-days).reduce((a, b) => a + b.value, 0);
  }

  function renderBody(restaurant) {
    const data = (window.MenuFlowAnalyticsSeed || {})[restaurant.id];
    const host = $('#analyticsBody');

    if (!data || !data.hasData) {
      host.innerHTML = `<div class="dash-card"><div class="dash-empty-state">
        <div class="dash-empty-state-icon">◔</div>
        <h3>No analytics yet.</h3>
        <p>Analytics will appear here once guests start opening your published menu — publish a menu and share your QR code to start collecting data.</p>
        <a class="btn btn--dark" href="publish.html">Go to QR &amp; Publish</a>
      </div></div>`;
      return;
    }

    const views = sum(data.views, range);
    const scans = sum(data.scans, range);
    const unique = sum(data.uniqueVisitors, range);
    const viewSeries = data.views.slice(-range);
    const maxView = Math.max(...viewSeries.map(v => v.value), 1);
    const maxSectionViews = Math.max(...data.popularSections.map(s => s.views), 1);
    const maxItemViews = Math.max(...data.popularItems.map(s => s.views), 1);
    const deviceTotal = data.devices.reduce((a, b) => a + b.value, 0);
    const deviceColors = ['var(--dash-chart-1)', 'var(--dash-chart-2)', 'var(--dash-chart-3)'];

    host.innerHTML = `
      <div class="dash-stats">
        <div class="dash-stat"><span>Menu views</span><strong>${views.toLocaleString()}</strong><small>last ${range} days</small></div>
        <div class="dash-stat"><span>QR scans</span><strong>${scans.toLocaleString()}</strong><small>last ${range} days</small></div>
        <div class="dash-stat"><span>Unique visitors</span><strong>${unique.toLocaleString()}</strong><small>last ${range} days</small></div>
        <div class="dash-stat"><span>Avg. views / day</span><strong>${Math.round(views / range)}</strong><small>last ${range} days</small></div>
      </div>

      <div class="dash-card" style="margin-bottom:1.75rem">
        <div class="dash-card-header"><div><h2>Menu views over time</h2><p>Last ${range} days</p></div></div>
        <div class="chart-bars">
          ${viewSeries.map(v => `<div class="chart-bar" style="height:${Math.max(4, (v.value / maxView) * 140)}px" title="${v.date}: ${v.value}"></div>`).join('')}
        </div>
      </div>

      <div class="dash-design-grid">
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Popular sections</h2></div></div>
          <div class="chart-legend-list">
            ${data.popularSections.map(s => `<div class="chart-legend-row"><span>${esc(s.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${(s.views / maxSectionViews) * 100}%"></div></div><strong>${s.views}</strong></div>`).join('')}
          </div>
        </div>
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Popular items</h2></div></div>
          <div class="chart-legend-list">
            ${data.popularItems.map(s => `<div class="chart-legend-row"><span>${esc(s.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${(s.views / maxItemViews) * 100}%"></div></div><strong>${s.views}</strong></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="dash-card" style="margin-top:1.75rem;max-width:26rem">
        <div class="dash-card-header"><div><h2>Device type</h2></div></div>
        <div class="donut-legend">
          ${data.devices.map((d, i) => `<div class="donut-legend-row"><span class="donut-swatch" style="background:${deviceColors[i]}"></span><span style="flex:1">${esc(d.name)}</span><strong>${Math.round((d.value / deviceTotal) * 100)}%</strong></div>`).join('')}
        </div>
      </div>`;
  }

  init();
})();
