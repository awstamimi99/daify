/**
 * Permission configuration — prototype/front-end phase.
 *
 * This is UI-layer authorization only: it decides what renders, not what's
 * allowed. The production backend MUST re-check every one of these server-side
 * before performing the corresponding action — nothing here is a security
 * boundary. See docs/PRODUCTION_ARCHITECTURE.md.
 */
(function () {
  const PERMISSIONS = {
    RESTAURANT_VIEW: 'restaurant.view',
    RESTAURANT_EDIT: 'restaurant.edit',

    MENU_VIEW: 'menu.view',
    MENU_CREATE: 'menu.create',
    MENU_EDIT: 'menu.edit',
    MENU_DELETE: 'menu.delete',
    MENU_PUBLISH: 'menu.publish',

    THEME_VIEW: 'theme.view',
    THEME_EDIT: 'theme.edit',

    ANALYTICS_VIEW: 'analytics.view',

    TEAM_VIEW: 'team.view',
    TEAM_MANAGE: 'team.manage',

    BILLING_VIEW: 'billing.view',
    BILLING_MANAGE: 'billing.manage',

    QR_VIEW: 'qr.view',
    QR_MANAGE: 'qr.manage',

    SETTINGS_VIEW: 'settings.view',
    SETTINGS_EDIT: 'settings.edit',
  };

  const ALL_PERMISSIONS = Object.values(PERMISSIONS);

  // Full grant — the restaurant owner. Owner-only actions (billing.manage,
  // team.manage, restaurant deletion, ownership transfer) are never
  // assignable to a manager; see MANAGER_ASSIGNABLE below.
  const OWNER_PERMISSIONS = ALL_PERMISSIONS;

  // The subset an owner is allowed to hand to a manager. Billing and team
  // management are deliberately excluded from this list — not just unchecked
  // by default — so the invite UI can't accidentally grant them.
  const MANAGER_ASSIGNABLE_PERMISSIONS = [
    PERMISSIONS.RESTAURANT_VIEW,
    PERMISSIONS.RESTAURANT_EDIT,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_CREATE,
    PERMISSIONS.MENU_EDIT,
    PERMISSIONS.MENU_DELETE,
    PERMISSIONS.MENU_PUBLISH,
    PERMISSIONS.THEME_VIEW,
    PERMISSIONS.THEME_EDIT,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.QR_VIEW,
    PERMISSIONS.QR_MANAGE,
  ];

  // Sensible default when an owner invites a new manager — day-to-day
  // operations, nothing destructive or financial. Owner can adjust per-person
  // afterward from Team > Edit permissions.
  const MANAGER_DEFAULT_PERMISSIONS = [
    PERMISSIONS.RESTAURANT_VIEW,
    PERMISSIONS.RESTAURANT_EDIT,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_CREATE,
    PERMISSIONS.MENU_EDIT,
    PERMISSIONS.MENU_PUBLISH,
    PERMISSIONS.THEME_VIEW,
    PERMISSIONS.THEME_EDIT,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.QR_VIEW,
  ];

  // Platform-admin permissions live in a separate namespace on purpose —
  // an admin manages DAIFY itself, not a specific restaurant, so
  // restaurant-scoped permissions above don't apply to them at all.
  const ADMIN_PERMISSIONS = [
    'platform.overview',
    'platform.restaurants',
    'platform.users',
    'platform.subscriptions',
    'platform.plans',
    'platform.templates',
    'platform.analytics',
    'platform.support',
    'platform.security',
    'platform.audit',
    'platform.settings',
  ];

  function permissionsForRole(role, managerGrant) {
    if (role === 'owner') return OWNER_PERMISSIONS;
    if (role === 'manager') return managerGrant || MANAGER_DEFAULT_PERMISSIONS;
    if (role === 'admin') return ADMIN_PERMISSIONS;
    return [];
  }

  window.MenuFlowPermissions = {
    PERMISSIONS,
    ALL_PERMISSIONS,
    OWNER_PERMISSIONS,
    MANAGER_ASSIGNABLE_PERMISSIONS,
    MANAGER_DEFAULT_PERMISSIONS,
    ADMIN_PERMISSIONS,
    permissionsForRole,
  };
})();
