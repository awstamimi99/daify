import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { getLocale } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/translate";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.DAIFY_WEB_ORIGIN ?? "https://daify.net"),
  title: { default: "DAIFY — Digital menus made remarkable", template: "%s — DAIFY" },
  description: "Build, style, publish, and update a beautiful mobile-first restaurant menu.",
  openGraph: { siteName: "DAIFY", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <a className="skip-link" href="#main-content">{t("Skip to content", "تخطي إلى المحتوى")}</a>
        <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
