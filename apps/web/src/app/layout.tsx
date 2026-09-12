import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://daify.net"),
  title: { default: "DAIFY — Digital menus made remarkable", template: "%s — DAIFY" },
  description: "Build, style, publish, and update a beautiful mobile-first restaurant menu.",
  openGraph: { siteName: "DAIFY", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
