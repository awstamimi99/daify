/**
 * Plan catalog + per-restaurant subscription/usage demo data.
 *
 * The plan catalog persists to localStorage (`menuflow_plans_v1`) so admin
 * edits from admin/plans.html actually stick — previously this was a plain
 * in-memory array reset on every page load. Loadable standalone (no
 * dependency on store.js) so the marketing pricing page can read live,
 * admin-edited prices without pulling in the whole dashboard stack — same
 * pattern as menu-data.js reading the platform state directly.
 *
 * Subscriptions (per-restaurant plan assignment, billing cycle, usage) stay
 * seed-only here; store.js seeds them into persisted state and owns reads/
 * writes from then on — see store.js `getSubscription`/`updateSubscription`.
 */
(function () {
  const PLANS_KEY = 'menuflow_plans_v1';

  const DEFAULT_PLANS = [
    {
      id: 'starter',
      name: 'Starter',
      tagline: 'Everything you need to launch your restaurant menu.',
      badge: null,
      customPricing: false,
      monthlyPrice: 10,
      yearlyMonthlyPrice: 8,
      yearlyTotal: 96,
      yearlySavings: 24,
      limits: { restaurants: 1, menus: 1, managers: 1 },
      templateAccess: 'core',
      customDesign: false,
      analyticsTier: 'basic',
      cta: { label: 'Start 14-Day Free Trial', href: 'signup.html' },
      highlights: [
        '1 restaurant · 1 digital menu',
        'Arabic + English support',
        'Core templates, essential customization',
        'QR code + basic analytics',
        'Standard support',
      ],
      features: [
        '1 Restaurant',
        '1 Digital Menu',
        'Arabic + English support',
        '1 Manager account minimum',
        'Core templates',
        'Essential customization',
        'QR Code',
        'Basic analytics (menu views, QR scans)',
        'Standard support',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'More flexibility, branding, and insights for growing restaurants.',
      badge: 'Most Popular',
      customPricing: false,
      monthlyPrice: 15,
      yearlyMonthlyPrice: 13,
      yearlyTotal: 156,
      yearlySavings: 24,
      limits: { restaurants: 1, menus: 3, managers: 5 },
      templateAccess: 'all',
      customDesign: true,
      analyticsTier: 'advanced',
      cta: { label: 'Start Pro Trial', href: 'signup.html?plan=pro' },
      highlights: [
        'Up to 3 digital menus',
        'Up to 5 manager accounts',
        'All templates + advanced customization',
        'Custom branding, remove DAIFY branding',
        'Advanced analytics + scheduling',
        'Priority support',
      ],
      features: [
        'Everything in Starter, plus:',
        'Up to 3 Digital Menus',
        'Up to 5 Manager accounts',
        'All templates',
        'Advanced customization',
        'Custom restaurant branding',
        'Remove DAIFY branding',
        'Custom QR design',
        'Advanced analytics (views, scans, top items, top categories, search terms, traffic trends)',
        'Menu scheduling',
        'Item availability scheduling',
        'Priority support',
      ],
    },
    {
      id: 'business',
      name: 'Business',
      tagline: 'For restaurant groups, franchises, and multi-location brands.',
      badge: null,
      customPricing: true,
      monthlyPrice: null,
      yearlyMonthlyPrice: null,
      yearlyTotal: null,
      yearlySavings: null,
      limits: { restaurants: 'custom', menus: 'custom', managers: 'custom' },
      templateAccess: 'custom',
      customDesign: true,
      analyticsTier: 'advanced-multi',
      cta: { label: 'Contact Sales', href: 'contact.html' },
      highlights: [
        'Multiple restaurants / branches',
        'Custom or unlimited menus by contract',
        'Multi-location dashboard + cross-location analytics',
        'Advanced roles & permissions',
        'Menu Builder Assistance from our team',
        'Dedicated onboarding & priority support',
      ],
      features: [
        'Everything in Pro, plus:',
        'Multiple restaurants / branches',
        'Custom or unlimited menus depending on contract',
        'Custom team / manager limits',
        'Advanced roles and permissions',
        'Shared brand styles across locations',
        'Multi-location dashboard',
        'Cross-location analytics',
        'Custom templates',
        'Menu Builder Support / Menu Builder Assistance',
        'Dedicated onboarding',
        'Priority / dedicated support',
        'API and integrations when available',
      ],
    },
  ];

  function loadPlans() {
    try {
      const raw = localStorage.getItem(PLANS_KEY);
      if (!raw) return DEFAULT_PLANS.map(p => Object.assign({}, p));
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_PLANS.map(p => Object.assign({}, p));
      return parsed;
    } catch (error) {
      return DEFAULT_PLANS.map(p => Object.assign({}, p));
    }
  }

  function savePlans(plans) {
    window.MenuFlowPlansSeed = plans;
    try {
      localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
    } catch (error) {
      /* storage unavailable — edits still work in-memory for this page view */
    }
    document.dispatchEvent(new CustomEvent('menuflow:plans-changed', { detail: plans }));
    return plans;
  }

  function resetPlans() {
    return savePlans(DEFAULT_PLANS.map(p => Object.assign({}, p)));
  }

  window.MenuFlowPlansSeed = loadPlans();
  window.MenuFlowPlansStore = { list: () => window.MenuFlowPlansSeed, save: savePlans, reset: resetPlans, DEFAULT_PLANS };

  window.MenuFlowSubscriptionsSeed = {
    'oliva-kuwait': {
      planId: 'business',
      status: 'active',
      billingCycle: 'monthly',
      renewsAt: '2026-09-05',
      startedAt: '2026-05-12',
    },
    'oliva-salmiya': {
      planId: 'business',
      status: 'trial',
      billingCycle: 'monthly',
      renewsAt: '2026-08-13',
      startedAt: '2026-07-30',
    },
    'r-souk-house': {
      planId: 'starter',
      status: 'active',
      billingCycle: 'monthly',
      renewsAt: '2026-09-02',
      startedAt: '2026-03-02',
    },
    'r-verde-cafe': {
      planId: 'pro',
      status: 'active',
      billingCycle: 'yearly',
      renewsAt: '2027-01-19',
      startedAt: '2026-01-19',
    },
    'r-noir-lounge': {
      planId: 'business',
      status: 'past_due',
      billingCycle: 'monthly',
      renewsAt: '2026-08-04',
      startedAt: '2025-11-04',
    },
    'r-ember-grill': {
      planId: 'starter',
      status: 'expired',
      billingCycle: 'monthly',
      renewsAt: '2026-04-14',
      startedAt: '2025-09-14',
    },
  };
})();
