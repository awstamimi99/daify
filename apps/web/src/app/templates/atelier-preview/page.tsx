import type { Metadata } from "next";
import { AtelierPreview } from "@/features/templates/atelier-preview";

export const metadata: Metadata = { title: "Atelier migration proof", description: "Typed React proof of DAIFY's Classic template renderer contract.", robots: { index: false, follow: false } };

export default function AtelierPreviewPage() { return <AtelierPreview />; }
