import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <><SiteHeader />{children}<SiteFooter /></>;
}
