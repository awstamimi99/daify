/**
 * Platform-wide demo data for the Admin area. Entirely separate from the
 * restaurant-scoped data in restaurants.js/menus.js/etc. — an admin manages
 * MenuFlow itself, not one restaurant's content.
 */
(function () {
  window.MenuFlowAdminSeed = {
    platformRestaurants: [
      { id: 'oliva-kuwait', name: 'Oliva — Kuwait City', owner: 'Adam Kareem', plan: 'Pro', status: 'active', menus: 2, created: '2026-05-12', lastActive: '2026-08-10' },
      { id: 'oliva-salmiya', name: 'Oliva — Salmiya', owner: 'Adam Kareem', plan: 'Pro', status: 'trial', menus: 1, created: '2026-07-30', lastActive: '2026-08-09' },
      { id: 'r-souk-house', name: 'Souk House', owner: 'Fatima Al-Rashid', plan: 'Starter', status: 'active', menus: 1, created: '2026-03-02', lastActive: '2026-08-08' },
      { id: 'r-verde-cafe', name: 'Verde Café', owner: 'Michael Chen', plan: 'Pro', status: 'active', menus: 3, created: '2026-01-19', lastActive: '2026-08-10' },
      { id: 'r-noir-lounge', name: 'Noir Lounge', owner: 'Layla Haddad', plan: 'Business', status: 'suspended', menus: 4, created: '2025-11-04', lastActive: '2026-06-22' },
      { id: 'r-ember-grill', name: 'Ember Grill House', owner: 'Omar Youssef', plan: 'Starter', status: 'expired', menus: 1, created: '2025-09-14', lastActive: '2026-04-01' },
    ],
    platformUsers: [
      { id: 'u1', name: 'Adam Kareem', email: 'adam@oliva.rest', role: 'Owner', restaurants: 2, status: 'active', lastLogin: '2026-08-10', joined: '2026-05-12' },
      { id: 'u2', name: 'Sara Hassan', email: 'sara@oliva.rest', role: 'Manager', restaurants: 1, status: 'active', lastLogin: '2026-08-10', joined: '2026-05-20' },
      { id: 'u3', name: 'Fatima Al-Rashid', email: 'fatima@soukhouse.com', role: 'Owner', restaurants: 1, status: 'active', lastLogin: '2026-08-08', joined: '2026-03-02' },
      { id: 'u4', name: 'Michael Chen', email: 'michael@verdecafe.com', role: 'Owner', restaurants: 1, status: 'active', lastLogin: '2026-08-10', joined: '2026-01-19' },
      { id: 'u5', name: 'Layla Haddad', email: 'layla@noirlounge.com', role: 'Owner', restaurants: 1, status: 'disabled', lastLogin: '2026-06-22', joined: '2025-11-04' },
      { id: 'u6', name: 'Omar Youssef', email: 'omar@embergrill.com', role: 'Owner', restaurants: 1, status: 'active', lastLogin: '2026-04-01', joined: '2025-09-14' },
      { id: 'u7', name: 'MenuFlow Admin', email: 'admin@menuflow.app', role: 'Admin', restaurants: 0, status: 'active', lastLogin: '2026-08-10', joined: '2025-06-01' },
    ],
    subscriptions: [
      { restaurant: 'Oliva — Kuwait City', plan: 'Pro', cycle: 'Monthly', status: 'Active', started: '2026-05-12', renews: '2026-09-05' },
      { restaurant: 'Oliva — Salmiya', plan: 'Pro', cycle: 'Monthly', status: 'Trial', started: '2026-07-30', renews: '2026-08-13' },
      { restaurant: 'Souk House', plan: 'Starter', cycle: 'Monthly', status: 'Active', started: '2026-03-02', renews: '2026-09-02' },
      { restaurant: 'Verde Café', plan: 'Pro', cycle: 'Yearly', status: 'Active', started: '2026-01-19', renews: '2027-01-19' },
      { restaurant: 'Noir Lounge', plan: 'Business', cycle: 'Monthly', status: 'Past Due', started: '2025-11-04', renews: '2026-08-04' },
      { restaurant: 'Ember Grill House', plan: 'Starter', cycle: 'Monthly', status: 'Expired', started: '2025-09-14', renews: '2026-04-14' },
    ],
    platformAnalytics: {
      newRestaurants: [3, 5, 4, 7, 6, 9, 8, 11, 9, 12, 10, 14],
      activeRestaurants: 214,
      publishedMenus: 187,
      templatePopularity: [
        { name: 'Atelier', value: 61 },
        { name: 'Noir', value: 44 },
        { name: 'Amalfi', value: 38 },
        { name: 'Souk', value: 33 },
        { name: 'Verde', value: 29 },
        { name: 'Sora', value: 22 },
        { name: 'Ember', value: 19 },
        { name: 'Mellow', value: 14 },
      ],
      planDistribution: [
        { name: 'Starter', value: 96 },
        { name: 'Pro', value: 88 },
        { name: 'Business', value: 30 },
      ],
      signupsOverTime: [8, 11, 9, 14, 12, 17, 15, 19, 16, 21, 18, 24],
    },
    supportTickets: [
      { id: 'T-1042', client: 'Layla Haddad — Noir Lounge', subject: 'QR code not loading on iOS', priority: 'High', status: 'Open', created: '2026-08-09' },
      { id: 'T-1041', client: 'Omar Youssef — Ember Grill House', subject: 'Subscription renewal failed', priority: 'High', status: 'In Progress', created: '2026-08-07' },
      { id: 'T-1039', client: 'Fatima Al-Rashid — Souk House', subject: 'Arabic text alignment on Souk template', priority: 'Medium', status: 'In Progress', created: '2026-08-05' },
      { id: 'T-1035', client: 'Michael Chen — Verde Café', subject: 'Request: add second location', priority: 'Low', status: 'Resolved', created: '2026-07-29' },
      { id: 'T-1028', client: 'Adam Kareem — Oliva', subject: 'How do I invite a manager?', priority: 'Low', status: 'Resolved', created: '2026-07-18' },
    ],
    securityEvents: {
      failedLogins24h: 14,
      suspiciousActivity: 2,
      disabledAccounts: 1,
      recentPasswordResets: 3,
      events: [
        { type: 'Suspicious activity', detail: '5 failed logins from new location', user: 'layla@noirlounge.com', time: '2026-08-10 03:14' },
        { type: 'Password reset', detail: 'Password reset completed', user: 'sara@oliva.rest', time: '2026-08-09 16:02' },
        { type: 'Account disabled', detail: 'Disabled after repeated failed billing', user: 'layla@noirlounge.com', time: '2026-08-08 09:40' },
        { type: 'Failed login', detail: '3 consecutive failed attempts', user: 'omar@embergrill.com', time: '2026-08-07 21:55' },
      ],
    },
    auditLogs: [
      { user: 'Adam Kareem', action: 'Published menu', resource: 'Oliva — Main Menu', time: '2026-08-10 09:12' },
      { user: 'Sara Hassan', action: 'Changed item price', resource: 'Truffle Rigatoni → 8.750 KD', time: '2026-08-10 08:47' },
      { user: 'Adam Kareem', action: 'Invited manager', resource: 'sara@oliva.rest', time: '2026-05-20 14:30' },
      { user: 'MenuFlow Admin', action: 'Changed restaurant plan', resource: 'Souk House → Starter', time: '2026-08-06 11:05' },
      { user: 'MenuFlow Admin', action: 'Suspended restaurant', resource: 'Noir Lounge', time: '2026-08-04 10:00' },
      { user: 'Adam Kareem', action: 'Changed template', resource: 'Oliva — Main Menu → Atelier', time: '2026-08-01 17:22' },
    ],
    templatesAdmin: [
      { id: 'atelier', status: 'enabled', featured: true, planAvailability: 'all', order: 1 },
      { id: 'verde', status: 'enabled', featured: false, planAvailability: 'all', order: 2 },
      { id: 'noir', status: 'enabled', featured: true, planAvailability: 'pro+', order: 3 },
      { id: 'amalfi', status: 'enabled', featured: false, planAvailability: 'all', order: 4 },
      { id: 'sora', status: 'enabled', featured: false, planAvailability: 'pro+', order: 5 },
      { id: 'ember', status: 'enabled', featured: false, planAvailability: 'all', order: 6 },
      { id: 'souk', status: 'enabled', featured: true, planAvailability: 'all', order: 7 },
      { id: 'mellow', status: 'disabled', featured: false, planAvailability: 'pro+', order: 8 },
    ],
  };
})();
