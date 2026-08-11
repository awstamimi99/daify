/**
 * Seed data for restaurants an owner/manager can access. Real data will
 * come from Drupal Restaurant entities. Kept separate from menu content
 * (menus.js) so the two can be swapped independently later.
 */
(function () {
  window.MenuFlowRestaurantsSeed = [
    {
      id: 'oliva-kuwait',
      name: 'Oliva',
      location: 'Kuwait City',
      plan: 'pro',
      status: 'active',
      createdAt: '2026-05-12',
      info: {
        description:
          'Season-led Mediterranean cooking shaped by the coast, the garden, and the generous tables we grew up around.',
        cuisineType: 'Modern Mediterranean',
        phone: '+965 2200 1840',
        whatsapp: '+965 5000 1840',
        email: 'hello@oliva.rest',
        website: 'https://oliva.rest',
        address: 'Al Shaheed District, Kuwait City',
        mapsUrl: '',
        instagram: '@oliva.table',
        facebook: '',
        tiktok: '',
        timezone: 'Asia/Kuwait',
        currency: 'KWD',
        languages: ['English', 'Arabic'],
        hours: [
          { days: 'Sunday — Thursday', time: '12:00 PM — 11:00 PM' },
          { days: 'Friday — Saturday', time: '12:00 PM — 12:00 AM' },
        ],
      },
    },
    {
      id: 'oliva-salmiya',
      name: 'Oliva',
      location: 'Salmiya',
      plan: 'pro',
      status: 'trial',
      createdAt: '2026-07-30',
      info: {
        description: 'Our second location — same kitchen philosophy, a shorter, all-day menu.',
        cuisineType: 'Modern Mediterranean',
        phone: '+965 2200 5521',
        whatsapp: '',
        email: '',
        website: '',
        address: 'Salem Al Mubarak Street, Salmiya',
        mapsUrl: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        timezone: 'Asia/Kuwait',
        currency: 'KWD',
        languages: ['English'],
        hours: [{ days: 'Daily', time: '9:00 AM — 11:00 PM' }],
      },
    },
  ];
})();
