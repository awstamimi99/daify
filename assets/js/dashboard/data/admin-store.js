/**
 * Platform-wide demo data for the Admin area, persisted to localStorage —
 * previously this lived in admin-data.js as a plain object reassigned on
 * every page load, so every admin edit (suspend a user, resolve a ticket,
 * edit a plan) silently vanished on refresh. Same load/seed/persist pattern
 * as store.js, own key so the two states can evolve independently.
 *
 * Restaurants are NOT duplicated here — admin-restaurants.js reads them
 * straight from window.MenuFlowStore (the same real, persisted restaurant
 * records the owner/manager dashboard uses), so admin actions actually
 * affect the restaurant instead of editing a disconnected illustrative copy.
 */
(function () {
  const STORAGE_KEY = 'menuflow_admin_v1';

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function seed() {
    return {
      platformUsers: [
        { id: 'u1', name: 'Adam Kareem', email: 'adam@oliva.rest', role: 'Owner', restaurants: 2, status: 'active', lastLogin: '2026-08-10', joined: '2026-05-12' },
        { id: 'u2', name: 'Sara Hassan', email: 'sara@oliva.rest', role: 'Manager', restaurants: 1, status: 'active', lastLogin: '2026-08-10', joined: '2026-05-20' },
        { id: 'u3', name: 'Fatima Al-Rashid', email: 'fatima@soukhouse.com', role: 'Owner', restaurants: 1, status: 'active', lastLogin: '2026-08-08', joined: '2026-03-02' },
        { id: 'u4', name: 'Michael Chen', email: 'michael@verdecafe.com', role: 'Owner', restaurants: 1, status: 'active', lastLogin: '2026-08-10', joined: '2026-01-19' },
        { id: 'u5', name: 'Layla Haddad', email: 'layla@noirlounge.com', role: 'Owner', restaurants: 1, status: 'disabled', lastLogin: '2026-06-22', joined: '2025-11-04' },
        { id: 'u6', name: 'Omar Youssef', email: 'omar@embergrill.com', role: 'Owner', restaurants: 1, status: 'active', lastLogin: '2026-04-01', joined: '2025-09-14' },
        { id: 'u7', name: 'DAIFY Admin', email: 'admin@daify.net', role: 'Admin', restaurants: 0, status: 'active', lastLogin: '2026-08-10', joined: '2025-06-01' },
      ],
      platformAnalytics: {
        newRestaurants: [3, 5, 4, 7, 6, 9, 8, 11, 9, 12, 10, 14],
        activeRestaurants: 214,
        publishedMenus: 187,
        templatePopularity: [
          { name: 'Atelier', value: 61 }, { name: 'Noir', value: 44 }, { name: 'Amalfi', value: 38 },
          { name: 'Souk', value: 33 }, { name: 'Verde', value: 29 }, { name: 'Sora', value: 22 },
          { name: 'Ember', value: 19 }, { name: 'Mellow', value: 14 },
        ],
        planDistribution: [{ name: 'Starter', value: 96 }, { name: 'Pro', value: 88 }, { name: 'Business', value: 30 }],
        signupsOverTime: [8, 11, 9, 14, 12, 17, 15, 19, 16, 21, 18, 24],
      },
      supportTickets: [
        { id: 'T-1042', client: 'Layla Haddad — Noir Lounge', userId: null, subject: 'QR code not loading on iOS', priority: 'High', status: 'Open', created: '2026-08-09' },
        { id: 'T-1041', client: 'Omar Youssef — Ember Grill House', userId: null, subject: 'Subscription renewal failed', priority: 'High', status: 'In Progress', created: '2026-08-07' },
        { id: 'T-1039', client: 'Fatima Al-Rashid — Souk House', userId: null, subject: 'Arabic text alignment on Souk template', priority: 'Medium', status: 'In Progress', created: '2026-08-05' },
        { id: 'T-1035', client: 'Michael Chen — Verde Café', userId: null, subject: 'Request: add second location', priority: 'Low', status: 'Resolved', created: '2026-07-29' },
        { id: 'T-1028', client: 'Adam Kareem — Oliva', userId: 'owner-1', subject: 'How do I invite a manager?', priority: 'Low', status: 'Resolved', created: '2026-07-18' },
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
        { user: 'DAIFY Admin', action: 'Changed restaurant plan', resource: 'Souk House → Starter', time: '2026-08-06 11:05' },
        { user: 'DAIFY Admin', action: 'Suspended restaurant', resource: 'Noir Lounge', time: '2026-08-04 10:00' },
        { user: 'Adam Kareem', action: 'Changed template', resource: 'Oliva — Main Menu → Atelier', time: '2026-08-01 17:22' },
      ],
      templatesAdmin: [
        { id: 'atelier', status: 'enabled', featured: true, planAvailability: 'all', order: 1, nameOverride: '', descriptionOverride: '' },
        { id: 'verde', status: 'enabled', featured: false, planAvailability: 'all', order: 2, nameOverride: '', descriptionOverride: '' },
        { id: 'noir', status: 'enabled', featured: true, planAvailability: 'pro+', order: 3, nameOverride: '', descriptionOverride: '' },
        { id: 'amalfi', status: 'enabled', featured: false, planAvailability: 'all', order: 4, nameOverride: '', descriptionOverride: '' },
        { id: 'sora', status: 'enabled', featured: false, planAvailability: 'pro+', order: 5, nameOverride: '', descriptionOverride: '' },
        { id: 'ember', status: 'enabled', featured: false, planAvailability: 'all', order: 6, nameOverride: '', descriptionOverride: '' },
        { id: 'souk', status: 'enabled', featured: true, planAvailability: 'all', order: 7, nameOverride: '', descriptionOverride: '' },
        { id: 'mellow', status: 'disabled', featured: false, planAvailability: 'pro+', order: 8, nameOverride: '', descriptionOverride: '' },
      ],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seed();
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.platformUsers) return seed();
      return parsed;
    } catch (error) {
      return seed();
    }
  }

  let state = load();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* storage unavailable — state still works in-memory for this page view */
    }
  }

  function setState(updater) {
    state = typeof updater === 'function' ? updater(state) : Object.assign({}, state, updater);
    persist();
    return state;
  }

  function resetAll() {
    state = seed();
    persist();
    return state;
  }

  function addAudit(user, action, resource) {
    setState(s => ({ ...s, auditLogs: [{ user, action, resource, time: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...s.auditLogs] }));
  }

  // ---- Users directory ----
  // Illustrative admin-managed directory — this prototype's real session
  // auth is a fixed 3-account role switcher (see data/users.js), so these
  // aren't real logins. Admin CRUD here is genuine and persists, but won't
  // change who you become when you flip the Owner/Manager/Admin switch.
  function addUser(user) {
    const id = uid('u');
    setState(s => ({ ...s, platformUsers: [...s.platformUsers, Object.assign({ id, restaurants: 0, status: 'active', lastLogin: '—', joined: new Date().toISOString().slice(0, 10) }, user)] }));
    return id;
  }
  function updateUser(id, patch) {
    setState(s => ({ ...s, platformUsers: s.platformUsers.map(u => (u.id === id ? Object.assign({}, u, patch) : u)) }));
  }
  function removeUser(id) {
    setState(s => ({ ...s, platformUsers: s.platformUsers.filter(u => u.id !== id) }));
  }

  // ---- Support tickets ----
  function addTicket(ticket) {
    const id = `T-${1000 + state.supportTickets.length + Math.floor(Math.random() * 900)}`;
    setState(s => ({ ...s, supportTickets: [Object.assign({ id, status: 'Open', created: new Date().toISOString().slice(0, 10) }, ticket), ...s.supportTickets] }));
    return id;
  }
  function updateTicket(id, patch) {
    setState(s => ({ ...s, supportTickets: s.supportTickets.map(t => (t.id === id ? Object.assign({}, t, patch) : t)) }));
  }

  // ---- Templates admin ----
  function updateTemplateAdmin(id, patch) {
    setState(s => ({ ...s, templatesAdmin: s.templatesAdmin.map(t => (t.id === id ? Object.assign({}, t, patch) : t)) }));
  }
  function reorderTemplatesAdmin(orderedIds) {
    setState(s => ({ ...s, templatesAdmin: orderedIds.map((id, i) => Object.assign({}, s.templatesAdmin.find(t => t.id === id), { order: i + 1 })) }));
  }

  window.MenuFlowAdminStore = {
    getState: () => state,
    resetAll,
    addAudit,
    users: { list: () => state.platformUsers, add: addUser, update: updateUser, remove: removeUser },
    tickets: { list: () => state.supportTickets, add: addTicket, update: updateTicket },
    security: () => state.securityEvents,
    auditLogs: () => state.auditLogs,
    analytics: () => state.platformAnalytics,
    templatesAdmin: { list: () => state.templatesAdmin, update: updateTemplateAdmin, reorder: reorderTemplatesAdmin },
  };
})();
