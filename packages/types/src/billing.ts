export interface BillingLimits {
  locations: number;
  menus: number;
  members: number;
  templates: string[];
  publishing: boolean;
}
export interface BillingPlan {
  id: string;
  code: string;
  version: number;
  name: string;
  nameAr: string;
  amount: string;
  currency: 'KWD';
  limits: BillingLimits;
  active: boolean;
}
export interface BillingCheckout {
  id: string;
  plan: BillingPlan;
  state: string;
  paymentUrl: string | null;
  createdAt: string;
  periodEnd: string | null;
}
export interface BillingState {
  mode: 'disabled' | 'sandbox';
  providerReady: boolean;
  enrolled: boolean;
  acceptedOfferPending: boolean;
  plans: BillingPlan[];
  subscription: { plan: BillingPlan; status: string; periodEnd: string; graceEnd: string | null; cancelAtEnd: boolean } | null;
  limits: BillingLimits | null;
  usage: { locations: number; menus: number; members: number };
  checkouts: BillingCheckout[];
}
