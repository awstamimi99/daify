export interface LegalSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly bullets?: readonly string[];
}

export interface LegalDocument {
  readonly slug: "privacy" | "terms" | "cookies";
  readonly title: string;
  readonly intro: string;
  readonly summary: string;
  readonly contact: string;
  readonly sections: readonly LegalSection[];
}

export const legalDocuments: readonly LegalDocument[] = [
  {
    slug: "privacy", title: "Privacy Policy", contact: "privacy@daify.net",
    intro: "This policy explains what information DAIFY may collect from restaurants, team members, and guests, why it is used, and the choices available.",
    summary: "DAIFY is still a frontend foundation and does not yet operate production accounts or analytics. This draft preserves the prototype policy structure for legal review before launch.",
    sections: [
      { id: "overview", title: "Overview", paragraphs: ["DAIFY is planned as a platform for hospitality businesses to design, publish, and manage digital menus. This draft covers the future marketing site, dashboard, and published menu pages together as the Service.", "Until the production backend launches, forms in this foundation demonstrate interaction only and do not transmit or persist personal data."] },
      { id: "information-we-collect", title: "Information we collect", paragraphs: ["Production account and team information may include name, email, optional phone number, business name, and organization role. Restaurant content may include dishes, pricing, images, translations, and design choices.", "Future guest analytics may include limited technical and aggregate usage signals. Payment details will be handled by an approved payment provider; DAIFY should receive billing status rather than full card details."] },
      { id: "how-we-use", title: "How we use information", paragraphs: ["Information will be used only to operate, secure, support, and improve the Service."], bullets: ["Maintain accounts and restaurant workspaces.", "Render and publish menu pages.", "Process subscriptions through approved providers.", "Provide support and security notices.", "Produce appropriately aggregated analytics."] },
      { id: "how-we-share", title: "How we share information", paragraphs: ["DAIFY will not sell personal information. Data may be shared with contracted service providers, when directed by the customer, when required by law, or as part of a properly disclosed business transfer. Published menu content is public by design."] },
      { id: "cookies", title: "Cookies and tracking", paragraphs: ["Strictly necessary cookies may support future secure sessions. Optional analytics or marketing categories require an approved consent and retention approach before collection begins."] },
      { id: "retention", title: "Data retention", paragraphs: ["Production retention periods will be finalized alongside infrastructure and regional legal review. Account data should be deleted or anonymized after closure except where legal, tax, security, or backup obligations require limited retention."] },
      { id: "your-rights", title: "Your rights and choices", paragraphs: ["Depending on location, people may have rights to access, correct, export, restrict, or delete personal information and to withdraw consent. Operational request handling must exist before launch."] },
      { id: "security", title: "Security", paragraphs: ["The production system is expected to use encryption in transit, access controls, tenant isolation, audited privileged actions, and regular security review. No transmission or storage method can be guaranteed completely secure."] },
      { id: "transfers", title: "International transfers", paragraphs: ["If information is processed outside a person’s country, DAIFY will use safeguards required by applicable law and disclose relevant hosting regions before launch."] },
      { id: "children", title: "Children’s privacy", paragraphs: ["DAIFY is a business service and is not directed to children. The Service should not knowingly collect children’s personal information."] },
      { id: "changes", title: "Changes to this policy", paragraphs: ["Material changes will update the effective date and, once accounts exist, be communicated through appropriate account or email notices."] },
      { id: "contact", title: "Contact us", paragraphs: ["Questions about this draft can be sent to privacy@daify.net. This document requires professional legal review before becoming production policy."] },
    ],
  },
  {
    slug: "terms", title: "Terms of Service", contact: "hello@daify.net",
    intro: "These draft terms describe the intended service relationship for DAIFY customers and remain subject to professional legal review before launch.",
    summary: "Customers own their menu content and grant DAIFY the limited rights required to host it. Production billing, availability, liability, and cancellation terms are not active in M1.",
    sections: [
      { id: "agreement", title: "Agreement to terms", paragraphs: ["These draft terms are intended to govern future use of daify.net, the DAIFY dashboard, and published menu pages. The current M1 frontend does not create an account or paid service agreement."] },
      { id: "the-service", title: "The service", paragraphs: ["DAIFY plans to provide tools for hospitality businesses to design, publish, and manage digital menus that guests view through a link or QR code without a guest-facing app."] },
      { id: "accounts", title: "Accounts and registration", paragraphs: ["Production customers will be responsible for accurate account information, credential security, team activity, and promptly reporting suspected unauthorized access."] },
      { id: "subscriptions", title: "Subscriptions, billing and trials", paragraphs: ["Displayed M1 prices are illustrative. Recurring billing, trial conversion, cancellation, refunds, and price-change notice will be finalized and implemented in M6 before becoming operative terms."] },
      { id: "your-content", title: "Your content", paragraphs: ["Customers retain ownership of menu text, prices, images, logos, and other material they provide. They must have the rights needed to upload that material.", "A future customer will grant DAIFY a limited, non-exclusive license to host, reproduce, and display that content only to operate the Service."] },
      { id: "acceptable-use", title: "Acceptable use", paragraphs: ["Customers must use the Service lawfully and must not compromise other accounts or infrastructure."], bullets: ["Do not upload unlawful, deceptive, or infringing content.", "Do not attempt unauthorized access or disrupt the Service.", "Do not scrape or automate access outside approved interfaces.", "Do not resell or white-label DAIFY without written agreement."] },
      { id: "intellectual-property", title: "Our intellectual property", paragraphs: ["DAIFY software, templates, visual systems, name, and logo remain DAIFY property. A subscription grants use of the Service, not ownership of its underlying code or design system."] },
      { id: "third-party", title: "Third-party services", paragraphs: ["Payment, infrastructure, email, or analytics providers may have their own terms. Providers will be selected and disclosed as the production architecture is implemented."] },
      { id: "availability", title: "Availability and changes", paragraphs: ["Production service levels and change-notice commitments remain to be defined. M1 does not make uptime or feature-availability promises."] },
      { id: "termination", title: "Termination", paragraphs: ["Future customers will be able to close accounts, and DAIFY may suspend material breaches, non-payment, security threats, or unlawful use with notice where practical."] },
      { id: "disclaimers", title: "Disclaimers", paragraphs: ["Final warranty language must be reviewed for applicable jurisdictions. The current prototype and M1 foundation are provided for evaluation and do not constitute a launched commercial service."] },
      { id: "liability", title: "Limitation of liability", paragraphs: ["Any production limitation of liability must be approved through professional legal review and presented before a customer accepts paid service terms."] },
      { id: "indemnification", title: "Indemnification", paragraphs: ["Production terms may allocate responsibility for customer content and misuse, subject to applicable law and final legal review."] },
      { id: "governing-law", title: "Governing law", paragraphs: ["The prototype anticipates Kuwait as the governing jurisdiction, but this must be confirmed before launch and adapted where mandatory local law applies."] },
      { id: "changes", title: "Changes to these terms", paragraphs: ["Material changes should be communicated before taking effect for active customers. Continued-use rules will be defined in the final reviewed terms."] },
      { id: "contact", title: "Contact us", paragraphs: ["Questions about these draft terms can be sent to hello@daify.net or through the contact page."] },
    ],
  },
  {
    slug: "cookies", title: "Cookie Policy", contact: "privacy@daify.net",
    intro: "This draft explains the cookie categories DAIFY may need across the marketing site, dashboard, and future published menu pages.",
    summary: "M1 does not add behavioral advertising or production analytics cookies. Future non-essential cookies require transparent consent and retention decisions before use.",
    sections: [
      { id: "what-are-cookies", title: "What are cookies", paragraphs: ["Cookies are small text files stored by a browser. Similar technologies, including local storage, can remember preferences or session-related information."] },
      { id: "how-we-use", title: "How we use cookies", paragraphs: ["Future cookies may keep users securely signed in, remember language and display preferences, prevent abuse, and support consented aggregate analytics. The current M1 Next.js surface does not implement production sessions or analytics."] },
      { id: "types", title: "Types of cookies", paragraphs: ["Essential cookies support security and core operation; functional cookies remember choices; analytics cookies measure aggregate use; marketing cookies measure campaigns. Only essential behavior should occur without the appropriate consent basis."] },
      { id: "third-party", title: "Third-party cookies", paragraphs: ["Approved production providers may set cookies to deliver contracted services. DAIFY will document providers and purposes before enabling them."] },
      { id: "managing", title: "Managing preferences", paragraphs: ["Browsers allow people to block or delete cookies. DAIFY will add a preference mechanism before deploying optional categories; disabling essential cookies may prevent secure dashboard use."] },
      { id: "dnt", title: "Do Not Track signals", paragraphs: ["There is no uniform implementation standard for browser Do Not Track signals. DAIFY will continue to minimize optional tracking and follow applicable consent requirements."] },
      { id: "changes", title: "Changes to this policy", paragraphs: ["This policy will be updated as the production service and approved providers become known. Material changes will be communicated appropriately."] },
      { id: "contact", title: "Contact us", paragraphs: ["Questions about cookies can be sent to privacy@daify.net. This draft is a starting point for legal review, not legal advice."] },
    ],
  },
] as const;

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return legalDocuments.find(document => document.slug === slug);
}
