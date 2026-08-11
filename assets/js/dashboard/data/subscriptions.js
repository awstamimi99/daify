/**
 * Plan catalog + per-restaurant subscription/usage demo data. Prices match
 * pricing.html so the marketing site and dashboard never disagree.
 */
(function () {
  window.MenuFlowPlansSeed = [
    {
      id: 'starter',
      name: 'Starter',
      price: 12,
      billingCycle: 'monthly',
      limits: { restaurants: 1, menus: 1, teamMembers: 1, storageMb: 250 },
      templateAccess: 'core',
      analytics: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29,
      billingCycle: 'monthly',
      limits: { restaurants: 3, menus: 5, teamMembers: 5, storageMb: 2000 },
      templateAccess: 'all',
      analytics: true,
    },
    {
      id: 'business',
      name: 'Business',
      price: 69,
      billingCycle: 'monthly',
      limits: { restaurants: 10, menus: 20, teamMembers: 15, storageMb: 10000 },
      templateAccess: 'all',
      analytics: true,
    },
  ];

  window.MenuFlowSubscriptionsSeed = {
    'oliva-kuwait': {
      planId: 'pro',
      status: 'active',
      billingCycle: 'monthly',
      renewsAt: '2026-09-05',
      startedAt: '2026-05-12',
      usage: { restaurants: 2, menus: 2, teamMembers: 2, storageMb: 420 },
    },
    'oliva-salmiya': {
      planId: 'pro',
      status: 'trial',
      billingCycle: 'monthly',
      renewsAt: '2026-08-13',
      startedAt: '2026-07-30',
      usage: { restaurants: 2, menus: 1, teamMembers: 2, storageMb: 40 },
    },
  };
})();
