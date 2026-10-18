export interface MarketingPageData {
  readonly slug: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly highlights: readonly { readonly title: string; readonly copy: string }[];
}

export const marketingPages: readonly MarketingPageData[] = [
  { slug: "features", eyebrow: "Your menu, made remarkable", title: "Everything between your first dish and your guest’s first scan.", description: "Build, style, publish, and improve a digital menu that feels like your restaurant—not another piece of restaurant software.", highlights: [{ title: "Edit without friction", copy: "Structure sections, dishes, prices, dietary notes, and availability." }, { title: "Design with restraint", copy: "Choose a considered template and tune it without losing its character." }, { title: "Always current", copy: "Publish updates behind one stable QR identity." }, { title: "Made for the phone", copy: "Fast, readable guest menus without downloads, accounts, or PDF zooming." }, { title: "Understand the moment", copy: "A future analytics layer will focus on useful menu signals, not surveillance." }, { title: "Arabic from the start", copy: "English, Arabic, RTL, and legible prices belong to the core contract." }] },
  { slug: "templates", eyebrow: "DAIFY / Collection 01", title: "Menus with a point of view.", description: "Every template is mobile-first, bilingual, and completely customizable.", highlights: [{ title: "Atelier", copy: "Editorial restraint for refined dining." }, { title: "Feast", copy: "Image-forward browsing designed around the phone." }, { title: "Souk", copy: "Warm modern hospitality with Arabic and RTL in mind." }] },
  { slug: "pricing", eyebrow: "Simple plans. Serious hospitality.", title: "Pricing that grows with your service.", description: "Start with one beautiful menu. Add more flexibility, insight, and locations when your restaurant is ready.", highlights: [{ title: "Starter · $10", copy: "One polished menu and the essential publishing workflow." }, { title: "Pro · $15", copy: "More flexibility for growing restaurant operations." }, { title: "Business", copy: "Multi-location planning and tailored support." }] },
  { slug: "about", eyebrow: "We are DAIFY", title: "Hospitality lives in every detail.", description: "We believe the care behind a restaurant should reach beyond the room and the plate—into every moment a guest experiences your menu.", highlights: [{ title: "Guest first", copy: "No app, no account, no heavy PDF pinch-and-zoom." }, { title: "Restaurant true", copy: "Design should express the venue rather than advertise the platform." }, { title: "Operationally calm", copy: "Clear editing and publishing boundaries reduce uncertainty." }] },
  { slug: "contact", eyebrow: "Start a conversation", title: "Tell us what your restaurant needs.", description: "Use the complete M1 form interaction below. It validates locally but does not transmit or store data until the production backend exists.", highlights: [{ title: "Product questions", copy: "Understand the roadmap, templates, and intended workflow." }, { title: "Restaurant feedback", copy: "Share what slows your team down today." }, { title: "Partnerships", copy: "Explore thoughtful hospitality and technology collaborations." }] },
  { slug: "privacy", eyebrow: "Legal", title: "Privacy", description: "This foundation does not operate a production account or analytics backend. Production privacy terms will be finalized before launch.", highlights: [{ title: "Data minimization", copy: "Collect only what DAIFY needs to provide and improve the service." }, { title: "Tenant boundaries", copy: "Organization data remains scoped and access-controlled." }, { title: "Your choices", copy: "Export, correction, and deletion behavior will follow launch-region requirements." }] },
  { slug: "terms", eyebrow: "Legal", title: "Terms", description: "These planning terms are not a substitute for final production terms of service.", highlights: [{ title: "Service scope", copy: "Production capabilities are only those explicitly shipped and documented." }, { title: "Responsible use", copy: "Customers remain responsible for menu accuracy and lawful content." }, { title: "Availability", copy: "Operational commitments and support terms will be defined before launch." }] },
  { slug: "cookies", eyebrow: "Legal", title: "Cookies", description: "The current production foundation does not add behavioral advertising or production analytics cookies.", highlights: [{ title: "Essential", copy: "Future secure sessions may require strictly necessary cookies." }, { title: "Analytics", copy: "Consent and retention decisions must be approved before collection." }, { title: "Control", copy: "Any optional categories will be transparent and manageable." }] },
] as const;

export const marketingMetadataTitles: Readonly<Record<string, string>> = {
  features: "Features", templates: "Templates", pricing: "Pricing", about: "About", contact: "Contact",
  privacy: "Privacy", terms: "Terms", cookies: "Cookies",
};

export function getMarketingPage(slug: string): MarketingPageData | undefined {
  return marketingPages.find(page => page.slug === slug);
}
