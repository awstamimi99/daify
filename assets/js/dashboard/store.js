/**
 * DAIFY dashboard state — prototype/front-end phase.
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
      let team;
      if (r.id === 'oliva-kuwait') {
        team = [
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
        ];
      } else if (r.ownerName) {
        // Illustrative platform restaurants (not the logged-in demo account) —
        // real records so admin CRUD has something genuine to act on, but
        // owned by a synthetic id since there's no real login for them.
        team = [
          {
            id: `owner-${r.id}`,
            name: r.ownerName,
            email: r.ownerEmail || '',
            role: 'owner',
            permissions: window.MenuFlowPermissions.OWNER_PERMISSIONS,
            status: 'active',
            lastActive: r.createdAt,
          },
        ];
      } else {
        team = [
          {
            id: window.MenuFlowUsers.owner.id,
            name: window.MenuFlowUsers.owner.name,
            email: window.MenuFlowUsers.owner.email,
            role: 'owner',
            permissions: window.MenuFlowPermissions.OWNER_PERMISSIONS,
            status: 'active',
            lastActive: '2026-08-09',
          },
        ];
      }
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
        team,
      };
    });

    return {
      session: { role: 'owner', userId: window.MenuFlowUsers.owner.id, activeRestaurantId: 'oliva-kuwait' },
      restaurants,
      subscriptions: deepClone(window.MenuFlowSubscriptionsSeed || {}),
      profiles: {},
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

  function baseUser() {
    const role = state.session.role;
    if (role === 'admin') return window.MenuFlowUsers.admin;
    if (role === 'manager') return window.MenuFlowUsers.manager;
    return window.MenuFlowUsers.owner;
  }

  function currentUser() {
    const base = baseUser();
    const patch = (state.profiles || {})[base.id];
    return patch ? Object.assign({}, base, patch) : base;
  }

  // Self-service profile edit (name/email/backupEmail/phone) — every role can
  // edit their own. Persisted as an overlay so the static user directory in
  // data/users.js never needs mutating.
  function updateProfile(userId, patch) {
    setState(s => ({ ...s, profiles: Object.assign({}, s.profiles, { [userId]: Object.assign({}, s.profiles?.[userId], patch) }) }));
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
    const current = JSON.stringify({ template: menu.template, theme: menu.theme, layout: menu.layout || {}, sections: menu.sections });
    const published = JSON.stringify({
      template: menu.publishedSnapshot.template,
      theme: menu.publishedSnapshot.theme,
      layout: menu.publishedSnapshot.layout || {},
      sections: menu.publishedSnapshot.sections,
    });
    return current !== published;
  }

  function createMenu(restaurantId, { name, template }) {
    if (!checkLimit('menus', restaurantId).allowed) return null;
    const id = uid('menu');
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      const menu = {
        id,
        name,
        status: 'draft',
        template: template || 'atelier',
        theme: {},
        layout: {},
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
      const snapshot = { template: menu.template, theme: menu.theme, layout: deepClone(menu.layout || {}), sections: deepClone(menu.sections), publishedAt: new Date().toISOString() };
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
    if (!checkLimit('managers', restaurantId).allowed) return null;
    const id = uid('user');
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      const member = { id, name, email, role: 'manager', permissions, status: 'invited', lastActive: null };
      return { ...s, restaurants: Object.assign({}, s.restaurants, { [restaurantId]: Object.assign({}, restaurant, { team: [...restaurant.team, member] }) }) };
    });
    return id;
  }

  // Admin-only: adds a team member of any role, bypassing the manager-seat
  // plan limit (an admin correcting/setting up a restaurant on someone
  // else's behalf isn't the self-serve "invite" flow that limit protects).
  function addTeamMember(restaurantId, { name, email, role, permissions }) {
    const id = uid('user');
    setState(s => {
      const restaurant = s.restaurants[restaurantId];
      const resolvedRole = role || 'manager';
      const member = {
        id, name, email, role: resolvedRole,
        permissions: permissions || (resolvedRole === 'owner' ? window.MenuFlowPermissions.OWNER_PERMISSIONS : window.MenuFlowPermissions.MANAGER_DEFAULT_PERMISSIONS),
        status: 'active', lastActive: null,
      };
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

  // ---- Subscriptions / plans / entitlements ----
  // Prototype-only enforcement: these checks run in the browser and can be
  // bypassed via devtools, same caveat as permissions.js. A real backend
  // must re-check every one of these server-side before it's a security or
  // billing boundary — see that file's header comment.
  function getSubscription(restaurantId) {
    const id = restaurantId || state.session.activeRestaurantId;
    return state.subscriptions[id] || null;
  }

  function updateSubscription(restaurantId, patch) {
    setState(s => {
      const sub = s.subscriptions[restaurantId];
      if (!sub) return s;
      const nextSub = Object.assign({}, sub, patch);
      const plan = (window.MenuFlowPlansSeed || []).find(p => p.id === nextSub.planId);
      const restaurant = s.restaurants[restaurantId];
      return {
        ...s,
        subscriptions: Object.assign({}, s.subscriptions, { [restaurantId]: nextSub }),
        restaurants: plan && restaurant
          ? Object.assign({}, s.restaurants, { [restaurantId]: Object.assign({}, restaurant, { plan: plan.id }) })
          : s.restaurants,
      };
    });
  }

  function planFor(restaurantId) {
    const sub = getSubscription(restaurantId);
    const plans = window.MenuFlowPlansSeed || [];
    return (sub && plans.find(p => p.id === sub.planId)) || plans[0] || null;
  }

  // Restaurants owned by the same person as `restaurantId` — approximated as
  // every restaurant whose team includes a member with that owner's id, since
  // this prototype has no real cross-restaurant account concept.
  function ownedRestaurants(restaurantId) {
    const restaurant = state.restaurants[restaurantId];
    const ownerMember = restaurant?.team.find(m => m.role === 'owner');
    if (!ownerMember) return restaurant ? [restaurant] : [];
    return Object.values(state.restaurants).filter(r => r.team.some(m => m.role === 'owner' && m.id === ownerMember.id));
  }

  function usageFor(restaurantId) {
    const id = restaurantId || state.session.activeRestaurantId;
    const restaurant = state.restaurants[id];
    if (!restaurant) return { restaurants: 0, menus: 0, managers: 0 };
    return {
      restaurants: ownedRestaurants(id).length,
      menus: Object.keys(restaurant.menus).length,
      managers: restaurant.team.filter(m => m.role === 'manager').length,
    };
  }

  // kind: 'restaurants' | 'menus' | 'managers'. Returns whether one more of
  // that resource is allowed under the active restaurant's plan.
  function checkLimit(kind, restaurantId) {
    const id = restaurantId || state.session.activeRestaurantId;
    const plan = planFor(id);
    const limit = plan?.limits?.[kind];
    const used = usageFor(id)[kind];
    if (limit === 'custom' || limit == null) return { allowed: true, used, limit, plan };
    return { allowed: used < limit, used, limit, plan };
  }

  function createRestaurant(fromRestaurantId, { name, location, cuisineType, ownerName, ownerEmail, plan, bypassLimit }) {
    const sourceId = fromRestaurantId || state.session.activeRestaurantId;
    const gate = checkLimit('restaurants', sourceId);
    if (!bypassLimit && !gate.allowed) return { ok: false, reason: 'limit', gate };

    const id = uid('restaurant');
    const source = state.restaurants[sourceId];
    const ownerMember = ownerName
      ? { id: `owner-${id}`, name: ownerName, email: ownerEmail || '' }
      : source?.team.find(m => m.role === 'owner') || { id: window.MenuFlowUsers.owner.id, name: window.MenuFlowUsers.owner.name, email: window.MenuFlowUsers.owner.email };
    const planId = plan || (source ? source.plan : 'starter');
    setState(s => {
      const restaurant = {
        id,
        name,
        location,
        plan: planId,
        status: 'trial',
        createdAt: new Date().toISOString().slice(0, 10),
        flags: { designVisited: false, qrVisited: false },
        info: {
          description: '', cuisineType: cuisineType || '', phone: '', whatsapp: '', email: '', website: '',
          address: '', mapsUrl: '', instagram: '', facebook: '', tiktok: '',
          timezone: source?.info.timezone || 'Asia/Kuwait', currency: source?.info.currency || 'KWD',
          languages: ['English', 'Arabic'], hours: [],
        },
        menus: {},
        team: [Object.assign({}, ownerMember, { role: 'owner', permissions: window.MenuFlowPermissions.OWNER_PERMISSIONS, status: 'active', lastActive: null })],
      };
      const subscription = {
        planId: (window.MenuFlowPlansSeed || []).find(p => p.id === planId)?.id || 'starter',
        status: 'trial',
        billingCycle: 'monthly',
        renewsAt: null,
        startedAt: restaurant.createdAt,
      };
      return {
        ...s,
        restaurants: Object.assign({}, s.restaurants, { [id]: restaurant }),
        subscriptions: Object.assign({}, s.subscriptions, { [id]: subscription }),
      };
    });
    return { ok: true, id };
  }

  function deleteRestaurant(id) {
    setState(s => {
      const restaurants = Object.assign({}, s.restaurants);
      const subscriptions = Object.assign({}, s.subscriptions);
      delete restaurants[id];
      delete subscriptions[id];
      const activeRestaurantId = s.session.activeRestaurantId === id ? Object.keys(restaurants)[0] : s.session.activeRestaurantId;
      return { ...s, restaurants, subscriptions, session: Object.assign({}, s.session, { activeRestaurantId }) };
    });
  }

  // ---- Notifications ----
  // audience: undefined/'all' = everyone (legacy + admin broadcasts), or a
  // specific user id for a targeted notification (e.g. window.MenuFlowUsers.owner.id).
  function listNotifications() {
    const userId = currentUser().id;
    return state.notifications.filter(n => !n.audience || n.audience === 'all' || n.audience === userId);
  }

  function listAllNotifications() {
    return state.notifications;
  }

  function markNotificationsRead() {
    const userId = currentUser().id;
    setState(s => ({
      ...s,
      notifications: s.notifications.map(n => (!n.audience || n.audience === 'all' || n.audience === userId ? Object.assign({}, n, { read: true }) : n)),
    }));
  }

  function pushNotification(type, text, audience) {
    setState(s => ({
      ...s,
      notifications: [{ id: uid('note'), type, text, time: 'Just now', read: false, audience: audience || 'all' }, ...s.notifications],
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
    updateProfile,
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
    addTeamMember,
    updateTeamMember,
    removeTeamMember,

    getSubscription,
    updateSubscription,
    planFor,
    usageFor,
    checkLimit,
    createRestaurant,
    deleteRestaurant,

    listNotifications,
    listAllNotifications,
    markNotificationsRead,
    pushNotification,
  };
})();
