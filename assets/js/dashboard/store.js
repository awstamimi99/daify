/**
 * MenuFlow dashboard state — prototype/front-end phase.
 *
 * Persists to localStorage under `menuflow_platform_v1`. Seeded once from
 * assets/js/dashboard/data/*.js on first visit, then fully owns reads/writes
 * for the rest of the session. This is a stand-in for what Drupal will serve
 * over an authenticated API — see README-DASHBOARD.md for what changes when
 * that backend exists.
 *
 * Data shape:
 * {
 *   session: { role: 'owner'|'manager'|'admin', userId, activeRestaurantId },
 *   restaurants: {
 *     [id]: {
 *       id, name, location, plan, status, createdAt, info: {...},
 *       menus: { [menuId]: { id, name, status, template, theme, sections,
 *                             publishedSnapshot, createdAt, updatedAt } },
 *       team: [{ id, name, email, role, permissions, status, lastActive }],
 *     }
 *   },
 *   subscriptions: { [restaurantId]: {...} },
 *   notifications: [{ id, type, text, time, read }],
 * }
 */
(function () {
  const STORAGE_KEY = 'menuflow_platform_v1';

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function seed() {
    const restaurants = {};
    (window.MenuFlowRestaurantsSeed || []).forEach(r => {
      const menusSeed = (window.MenuFlowMenusSeed || {})[r.id] || [];
      const menus = {};
      menusSeed.forEach(m => { menus[m.id] = deepClone(m); });
      restaurants[r.id] = {
        id: r.id,
        name: r.name,
        location: r.location,
        plan: r.plan,
        status: r.status,
        createdAt: r.createdAt,
        flags: { designVisited: false, qrVisited: false },
        info: deepClone(r.info),
        menus,
        team:
          r.id === 'oliva-kuwait'
            ? [
                {
                  id: window.MenuFlowUsers.owner.id,
                  name: window.MenuFlowUsers.owner.name,
                  email: window.MenuFlowUsers.owner.email,
                  role: 'owner',
                  permissions: window.MenuFlowPermissions.OWNER_PERMISSIONS,
                  status: 'active',
                  lastActive: '2026-08-10',
                },
                {
                  id: window.MenuFlowUsers.manager.id,
                  name: window.MenuFlowUsers.manager.name,
                  email: window.MenuFlowUsers.manager.email,
                  role: 'manager',
                  permissions: window.MenuFlowPermissions.MANAGER_DEFAULT_PERMISSIONS,
                  status: 'active',
                  lastActive: '2026-08-10',
                },
              ]
            : [
                {
                  id: window.MenuFlowUsers.owner.id,
                  name: window.MenuFlowUsers.owner.name,
                  email: window.MenuFlowUsers.owner.email,
                  role: 'owner',
                  permissions: window.MenuFlowPermissions.OWNER_PERMISSIONS,
                  status: 'active',
                  lastActive: '2026-08-09',
                },
              ],
      };
    });

    return {
      session: { role: 'owner', userId: window.MenuFlowUsers.owner.id, activeRestaurantId: 'oliva-kuwait' },
      restaurants,
      subscriptions: deepClone(window.MenuFlowSubscriptionsSeed || {}),
      notifications: [
        { id: uid('note'), type: 'success', text: 'Menu published successfully', time: '2026-08-10 09:12', read: false },
        { id: uid('note'), type: 'info', text: 'Sara accepted your manager invitation', time: '2026-08-09 12:00', read: false },
        { id: uid('note'), type: 'warning', text: 'Oliva — Salmiya trial ends in 3 days', time: '2026-08-09 08:00', read: true },
      ],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seed();
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.restaurants || !parsed.session) return seed();
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
    document.dispatchEvent(new CustomEvent('menuflow:state-changed', { detail: state }));
  }

  function getState() {
    return state;
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

  // ---- Session ----
  function getSession() {
    return state.session;
  }

  function currentUser() {
    const role = state.session.role;
    if (role === 'admin') return window.MenuFlowUsers.admin;
    if (role === 'manager') return window.MenuFlowUsers.manager;
    return window.MenuFlowUsers.owner;
  }

  function switchRole(role) {
    setState(s => ({ ...s, session: Object.assign({}, s.session, { role, userId: role === 'admin' ? window.MenuFlowUsers.admin.id : role === 'manager' ? window.MenuFlowUsers.manager.id : window.MenuFlowUsers.owner.id }) }));
  }

  function switchRestaurant(id) {
    if (!state.restaurants[id]) return;
    setState(s => ({ ...s, session: Object.assign({}, s.session, { activeRestaurantId: id }) }));
  }

  function currentPermissions() {
    const role = state.session.role;
    if (role === 'owner') return window.MenuFlowPermissions.OWNER_PERMISSIONS;
    if (role === 'admin') return window.MenuFlowPermissions.ADMIN_PERMISSIONS;
    const restaurant = getActiveRestaurant();
    const member = restaurant?.team.find(t => t.id === window.MenuFlowUsers.manager.id);
    return member?.permissions || window.MenuFlowPermissions.MANAGER_DEFAULT_PERMISSIONS;
  }

  function can(permission) {
    return currentPermissions().includes(permission);
  }

  // ---- Restaurants ----
  function listRestaurants() {
    return Object.values(state.restaurants);
  }

  function getActiveRestaurant() {
    return state.restaurants[state.session.activeRestaurantId];
  }

  function updateRestaurant(id, patch) {
    setState(s => ({ ...s, restaurants: Object.assign({}, s.restaurants, { [id]: Object.assign({}, s.restaurants[id], patch) }) }));
  }

  function updateRestaurantFlags(id, patch) {
    setState(s => ({
      ...s,
      restaurants: Object.assign({}, s.restaurants, {
        [id]: Object.assign({}, s.restaurants[id], { flags: Object.assign({}, s.restaurants[id].flags, patch) }),
      }),
    }));
  }

  function updateRestaurantInfo(id, patch) {
    setState(s => ({
      ...s,
      restaurants: Object.assign({}, s.restaurants, {
        [id]: Object.assign({}, s.restaurants[id], { info: Object.assign({}, s.restaurants[id].info, patch) }),
      }),
    }));
  }

  // ---- Menus ----
  function listMenus(restaurantId) {
    const restaurant = state.restaurants[restaurantId || state.session.activeRestaurantId];
    return restaurant ? Object.values(restaurant.menus) : [];
  }

  function getMenu(menuId, restaurantId) {
    const restaurant = state.restaurants[restaurantId || state.session.activeRestaurantId];
    return restaurant?.menus[menuId];
  }

  function hasUnpublishedChanges(menu) {
    if (!menu || !menu.publishedSnapshot) return false;
    const current = JSON.stringify({ template: menu.template, theme: menu.theme, sections: menu.sections });
    const published = JSON.stringify({
      template: menu.publishedSnapshot.template,
      theme: menu.publishedSnapshot.theme,
      sections: menu.publishedSnapshot.sections,
    });
    return current !== published;
  }

  function createMenu(restaurantId, { name, template }) {
    const id = uid('menu');
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      const menu = {
        id,
        name,
        status: 'draft',
        template: template || 'atelier',
        theme: {},
        sections: [],
        publishedSnapshot: null,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      return {
        ...s,
        restaurants: Object.assign({}, s.restaurants, {
          [restaurantId]: Object.assign({}, restaurant, { menus: Object.assign({}, restaurant.menus, { [id]: menu }) }),
        }),
      };
    });
    return id;
  }

  function updateMenu(restaurantId, menuId, patch) {
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      const menu = restaurant.menus[menuId];
      return {
        ...s,
        restaurants: Object.assign({}, s.restaurants, {
          [restaurantId]: Object.assign({}, restaurant, {
            menus: Object.assign({}, restaurant.menus, {
              [menuId]: Object.assign({}, menu, patch, { updatedAt: new Date().toISOString().slice(0, 10) }),
            }),
          }),
        }),
      };
    });
  }

  function duplicateMenu(restaurantId, menuId) {
    const source = getMenu(menuId, restaurantId);
    if (!source) return null;
    const id = uid('menu');
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      const copy = deepClone(source);
      copy.id = id;
      copy.name = `${source.name} (Copy)`;
      copy.status = 'draft';
      copy.publishedSnapshot = null;
      copy.createdAt = new Date().toISOString().slice(0, 10);
      copy.updatedAt = copy.createdAt;
      return {
        ...s,
        restaurants: Object.assign({}, s.restaurants, {
          [restaurantId]: Object.assign({}, restaurant, { menus: Object.assign({}, restaurant.menus, { [id]: copy }) }),
        }),
      };
    });
    return id;
  }

  function deleteMenu(restaurantId, menuId) {
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      const menus = Object.assign({}, restaurant.menus);
      delete menus[menuId];
      return { ...s, restaurants: Object.assign({}, s.restaurants, { [restaurantId]: Object.assign({}, restaurant, { menus }) }) };
    });
  }

  function publishMenu(restaurantId, menuId) {
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      const menu = restaurant.menus[menuId];
      const snapshot = { template: menu.template, theme: menu.theme, sections: deepClone(menu.sections), publishedAt: new Date().toISOString() };
      return {
        ...s,
        restaurants: Object.assign({}, s.restaurants, {
          [restaurantId]: Object.assign({}, restaurant, {
            menus: Object.assign({}, restaurant.menus, {
              [menuId]: Object.assign({}, menu, { status: 'published', publishedSnapshot: snapshot, updatedAt: new Date().toISOString().slice(0, 10) }),
            }),
          }),
        }),
      };
    });
  }

  function unpublishMenu(restaurantId, menuId) {
    updateMenu(restaurantId, menuId, { status: 'draft' });
  }

  // ---- Sections / items (operate on the active restaurant + given menu id) ----
  function addSection(menuId, section) {
    setState(s => mutateMenuSections(s, menuId, sections => [
      ...sections,
      Object.assign({ id: uid('section'), order: sections.length + 1, items: [] }, section),
    ]));
  }

  function updateSection(menuId, sectionId, patch) {
    setState(s => mutateMenuSections(s, menuId, sections =>
      sections.map(sec => (sec.id === sectionId ? Object.assign({}, sec, patch) : sec))
    ));
  }

  function deleteSection(menuId, sectionId) {
    setState(s => mutateMenuSections(s, menuId, sections => sections.filter(sec => sec.id !== sectionId)));
  }

  function reorderSections(menuId, orderedIds) {
    setState(s => mutateMenuSections(s, menuId, sections => {
      const byId = Object.fromEntries(sections.map(sec => [sec.id, sec]));
      return orderedIds.map((id, index) => Object.assign({}, byId[id], { order: index + 1 })).filter(Boolean);
    }));
  }

  function addItem(menuId, sectionId, item) {
    setState(s => mutateMenuSections(s, menuId, sections =>
      sections.map(sec =>
        sec.id === sectionId
          ? Object.assign({}, sec, {
              items: [...sec.items, Object.assign({ id: uid('item'), dietary: [], available: true, featured: false }, item)],
            })
          : sec
      )
    ));
  }

  function updateItem(menuId, sectionId, itemId, patch) {
    setState(s => mutateMenuSections(s, menuId, sections =>
      sections.map(sec =>
        sec.id === sectionId
          ? Object.assign({}, sec, { items: sec.items.map(it => (it.id === itemId ? Object.assign({}, it, patch) : it)) })
          : sec
      )
    ));
  }

  function deleteItem(menuId, sectionId, itemId) {
    setState(s => mutateMenuSections(s, menuId, sections =>
      sections.map(sec => (sec.id === sectionId ? Object.assign({}, sec, { items: sec.items.filter(it => it.id !== itemId) }) : sec))
    ));
  }

  function moveItem(menuId, fromSectionId, itemId, toSectionId) {
    setState(s => mutateMenuSections(s, menuId, sections => {
      let moved;
      const withoutItem = sections.map(sec => {
        if (sec.id !== fromSectionId) return sec;
        const items = sec.items.filter(it => {
          if (it.id === itemId) { moved = it; return false; }
          return true;
        });
        return Object.assign({}, sec, { items });
      });
      if (!moved) return sections;
      return withoutItem.map(sec => (sec.id === toSectionId ? Object.assign({}, sec, { items: [...sec.items, moved] }) : sec));
    }));
  }

  function reorderItems(menuId, sectionId, orderedIds) {
    setState(s => mutateMenuSections(s, menuId, sections =>
      sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        const byId = Object.fromEntries(sec.items.map(it => [it.id, it]));
        return Object.assign({}, sec, { items: orderedIds.map(id => byId[id]).filter(Boolean) });
      })
    ));
  }

  function mutateMenuSections(s, menuId, transform) {
    const restaurantId = s.session.activeRestaurantId;
    const restaurant = s.restaurants[restaurantId];
    const menu = restaurant.menus[menuId];
    const sections = transform(menu.sections);
    return {
      ...s,
      restaurants: Object.assign({}, s.restaurants, {
        [restaurantId]: Object.assign({}, restaurant, {
          menus: Object.assign({}, restaurant.menus, {
            [menuId]: Object.assign({}, menu, { sections, updatedAt: new Date().toISOString().slice(0, 10) }),
          }),
        }),
      }),
    };
  }

  // ---- Team ----
  function inviteManager(restaurantId, { name, email, permissions }) {
    const id = uid('user');
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      const member = { id, name, email, role: 'manager', permissions, status: 'invited', lastActive: null };
      return { ...s, restaurants: Object.assign({}, s.restaurants, { [restaurantId]: Object.assign({}, restaurant, { team: [...restaurant.team, member] }) }) };
    });
    return id;
  }

  function updateTeamMember(restaurantId, memberId, patch) {
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      return {
        ...s,
        restaurants: Object.assign({}, s.restaurants, {
          [restaurantId]: Object.assign({}, restaurant, {
            team: restaurant.team.map(m => (m.id === memberId ? Object.assign({}, m, patch) : m)),
          }),
        }),
      };
    });
  }

  function removeTeamMember(restaurantId, memberId) {
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      return { ...s, restaurants: Object.assign({}, s.restaurants, { [restaurantId]: Object.assign({}, restaurant, { team: restaurant.team.filter(m => m.id !== memberId) }) }) };
    });
  }

  // ---- Notifications ----
  function listNotifications() {
    return state.notifications;
  }

  function markNotificationsRead() {
    setState(s => ({ ...s, notifications: s.notifications.map(n => Object.assign({}, n, { read: true })) }));
  }

  function pushNotification(type, text) {
    setState(s => ({
      ...s,
      notifications: [{ id: uid('note'), type, text, time: 'Just now', read: false }, ...s.notifications],
    }));
  }

  window.MenuFlowStore = {
    getState,
    setState,
    resetAll,
    reset: resetAll, // backward-compatible alias used by existing dashboard pages
    uid,

    getSession,
    currentUser,
    switchRole,
    switchRestaurant,
    currentPermissions,
    can,

    listRestaurants,
    getActiveRestaurant,
    updateRestaurant,
    updateRestaurantInfo,
    updateRestaurantFlags,

    listMenus,
    getMenu,
    hasUnpublishedChanges,
    createMenu,
    updateMenu,
    duplicateMenu,
    deleteMenu,
    publishMenu,
    unpublishMenu,

    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    addItem,
    updateItem,
    deleteItem,
    moveItem,
    reorderItems,

    inviteManager,
    updateTeamMember,
    removeTeamMember,

    listNotifications,
    markNotificationsRead,
    pushNotification,
  };
})();
