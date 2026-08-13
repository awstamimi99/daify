import type { OrganizationRole } from "@daify/types";

export interface DashboardNavItem { readonly href: string; readonly label: string; readonly glyph: string; readonly roles: readonly OrganizationRole[] }

export const dashboardNavigation: readonly DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", glyph: "⌂", roles: ["owner", "manager", "staff", "viewer"] },
  { href: "/dashboard/restaurant", label: "Restaurant", glyph: "◇", roles: ["owner", "manager", "viewer"] },
  { href: "/dashboard/menus", label: "Menus", glyph: "≡", roles: ["owner", "manager", "staff", "viewer"] },
  { href: "/dashboard/design", label: "Design", glyph: "✦", roles: ["owner", "manager"] },
  { href: "/dashboard/publish", label: "QR & Publish", glyph: "▦", roles: ["owner", "manager"] },
  { href: "/dashboard/analytics", label: "Analytics", glyph: "↗", roles: ["owner", "manager", "viewer"] },
  { href: "/dashboard/team", label: "Team", glyph: "◎", roles: ["owner"] },
  { href: "/dashboard/billing", label: "Billing", glyph: "◫", roles: ["owner"] },
] as const;

export const overviewStats = [
  { label: "Menu views", value: "1,284", note: "+18% this week" },
  { label: "QR scans", value: "842", note: "65.6% of visits" },
  { label: "Published menu", value: "Dinner", note: "Updated 2h ago" },
] as const;
