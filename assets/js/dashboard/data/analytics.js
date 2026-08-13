/**
 * Demo analytics. Numbers are illustrative only — real analytics will be
 * fed by the production event pipeline (page views / QR scan events) once the
 * backend exists.
 */
(function () {
  function series(days, base, variance) {
    const out = [];
    const now = new Date('2026-08-10T00:00:00.000Z');
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const wobble = Math.round(Math.sin(i / 3) * variance + (Math.random() - 0.5) * variance * 0.6);
      out.push({ date: d.toISOString().slice(0, 10), value: Math.max(0, base + wobble) });
    }
    return out;
  }

  window.MenuFlowAnalyticsSeed = {
    'oliva-kuwait': {
      hasData: true,
      views: series(90, 62, 22),
      scans: series(90, 41, 16),
      uniqueVisitors: series(90, 38, 14),
      popularSections: [
        { name: 'Mains', views: 812 },
        { name: 'Desserts', views: 605 },
        { name: 'Starters', views: 540 },
        { name: 'Drinks', views: 398 },
        { name: 'Pasta', views: 351 },
        { name: 'Salads', views: 289 },
      ],
      popularItems: [
        { name: 'Truffle Rigatoni', views: 244 },
        { name: 'Lemon Sea Bass', views: 211 },
        { name: 'Whipped Feta', views: 198 },
        { name: 'Olive Oil Cake', views: 176 },
        { name: 'Fire-Grilled Lamb Kofta', views: 163 },
      ],
      devices: [
        { name: 'Mobile', value: 84 },
        { name: 'Tablet', value: 9 },
        { name: 'Desktop', value: 7 },
      ],
    },
    'oliva-salmiya': {
      hasData: false,
      views: [],
      scans: [],
      uniqueVisitors: [],
      popularSections: [],
      popularItems: [],
      devices: [],
    },
  };
})();
