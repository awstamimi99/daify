import type { OrganizationRole } from "@daify/types";

export interface DashboardNavItem { readonly href: string; readonly label: string; readonly glyph: string; readonly permissions: readonly string[]; readonly roles: readonly OrganizationRole[] }

export const dashboardNavigation: readonly DashboardNavItem[] = [
  { href: "/dashboard", permissions: [], label: "Overview", glyph: "⌂", roles: ["owner", "manager", "staff", "viewer"] },
  { href: "/dashboard/security", permissions: [], label: "Account security", glyph: "◇", roles: ["owner", "manager", "staff", "viewer"] },
  { href: "/dashboard/restaurant", permissions: ["organization.read"], label: "Restaurant", glyph: "◇", roles: ["owner", "manager", "viewer"] },
  { href: "/dashboard/menus", permissions: ["menu.read"], label: "Menus", glyph: "≡", roles: ["owner", "manager", "staff", "viewer"] },
  { href: "/dashboard/design", permissions: ["menu.design"], label: "Design", glyph: "✦", roles: ["owner", "manager"] },
  { href: "/dashboard/publish", permissions: ["menu.publish", "qr.manage"], label: "QR & Publish", glyph: "▦", roles: ["owner", "manager"] },
  { href: "/dashboard/analytics", permissions: ["analytics.read"], label: "Analytics", glyph: "↗", roles: ["owner", "manager", "viewer"] },
  { href: "/dashboard/team", permissions: ["team.manage"], label: "Team", glyph: "◎", roles: ["owner"] },
  { href: "/dashboard/billing", permissions: ["billing.read", "billing.manage"], label: "Billing", glyph: "◫", roles: ["owner"] },
] as const;
