/**
 * Seed menus per restaurant. "Main Menu" for Oliva Kuwait reuses the
 * existing demo content from assets/js/menu/menu-data.js so the dashboard
 * and the public templates start from one consistent dataset.
 */
(function () {
  function mainMenuSections() {
    const demo = window.MenuFlowMenuData;
    return demo ? JSON.parse(JSON.stringify(demo.sections)) : [];
  }

  window.MenuFlowMenusSeed = {
    'oliva-kuwait': [
      {
        id: 'main-menu',
        name: 'Main Menu',
        status: 'published',
        template: 'atelier',
        theme: {},
        sections: mainMenuSections(),
        publishedSnapshot: {
          template: 'atelier',
          theme: {},
          sections: mainMenuSections(),
          publishedAt: '2026-08-05T10:00:00.000Z',
        },
        createdAt: '2026-05-12',
        updatedAt: '2026-08-05',
      },
      {
        id: 'ramadan-menu',
        name: 'Ramadan Menu',
        status: 'draft',
        template: 'souk',
        theme: {},
        sections: [
          {
            id: 'iftar',
            name: 'Iftar Set',
            description: 'Shared plates to open the fast.',
            order: 1,
            items: [],
          },
        ],
        publishedSnapshot: null,
        createdAt: '2026-08-01',
        updatedAt: '2026-08-08',
      },
    ],
    'oliva-salmiya': [
      {
        id: 'main-menu',
        name: 'Main Menu',
        status: 'draft',
        template: 'amalfi',
        theme: {},
        sections: [],
        publishedSnapshot: null,
        createdAt: '2026-07-30',
        updatedAt: '2026-07-30',
      },
    ],
  };
})();
