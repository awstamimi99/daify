import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/marketing/content-page";
import { getMarketingPage, marketingMetadataTitles, marketingPages } from "@/data/marketing";

interface PageProps { readonly params: Promise<{ slug: string }> }

export const dynamicParams = false;

export function generateStaticParams() { return marketingPages.map(page => ({ slug: page.slug })); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = getMarketingPage((await params).slug);
  if (!page) return {};
  const title = marketingMetadataTitles[page.slug] ?? page.title;
  return { title, description: page.description, alternates: { canonical: `/${page.slug}` }, openGraph: { title: `${title} — DAIFY`, description: page.description, url: `/${page.slug}` } };
}

export default async function MarketingContentRoute({ params }: PageProps) {
  const page = getMarketingPage((await params).slug);
  if (!page) notFound();
  return <ContentPage page={page} />;
}
