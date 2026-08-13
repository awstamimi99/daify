export type Locale = "en" | "ar";
export type Direction = "ltr" | "rtl";

export interface Translation {
  readonly name: string;
  readonly description: string;
}

export type Translations = Readonly<Partial<Record<Locale, Translation>>>;

export interface MenuItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: string;
  readonly available: boolean;
  readonly featured: boolean;
  readonly image?: string;
  readonly dietary: readonly string[];
  readonly allergens: readonly string[];
  readonly badge?: string;
  readonly translations: Translations;
}

export interface MenuSection {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly order: number;
  readonly translations: Translations;
  readonly items: readonly MenuItem[];
}

export type TemplateFamily = "classic" | "feast";
export type TemplateSlug =
  | "atelier"
  | "verde"
  | "noir"
  | "amalfi"
  | "sora"
  | "ember"
  | "souk"
  | "mellow"
  | "feast";

export interface RestaurantTheme {
  readonly background: string;
  readonly surface: string;
  readonly primary: string;
  readonly accent: string;
  readonly text: string;
  readonly muted: string;
  readonly cardRadius: string;
  readonly buttonRadius: string;
}

export interface MenuLayout {
  readonly itemLayout: "list" | "grid" | "image-focus";
  readonly sectionNav: "tabs" | "chips" | "minimal";
  readonly imageStyle: "square" | "rounded" | "circle" | "full-bleed";
  readonly cardStyle: "flat" | "bordered" | "elevated";
  readonly mobileColumns: "1" | "2";
  readonly tabletColumns: "1" | "2" | "3";
  readonly desktopColumns: "2" | "3" | "4";
}

export interface PublishedMenuSnapshot {
  readonly template: TemplateSlug;
  readonly theme: RestaurantTheme;
  readonly layout: MenuLayout;
  readonly sections: readonly MenuSection[];
  readonly publishedAt: string;
}

export interface Menu {
  readonly id: string;
  readonly name: string;
  readonly status: "draft" | "published" | "archived";
  readonly template: TemplateSlug;
  readonly theme: RestaurantTheme;
  readonly layout: MenuLayout;
  readonly sections: readonly MenuSection[];
  readonly publishedSnapshot: PublishedMenuSnapshot | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type OrganizationRole = "owner" | "manager" | "staff" | "viewer";
export type PlatformRole = "platform-admin";
export type Role = OrganizationRole | PlatformRole;

export interface Session {
  readonly role: Role;
  readonly userId: string;
  readonly activeOrganizationId: string;
  readonly activeLocationId: string;
}

export interface Location {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly city: string;
  readonly currency: string;
  readonly defaultLocale: Locale;
  readonly supportedLocales: readonly Locale[];
  readonly menus: Readonly<Record<string, Menu>>;
}

export interface Organization {
  readonly id: string;
  readonly name: string;
  readonly plan: "starter" | "pro" | "business";
  readonly locations: Readonly<Record<string, Location>>;
}

export interface TemplateCapabilities {
  readonly itemLayouts: readonly MenuLayout["itemLayout"][];
  readonly sectionNavigation: readonly MenuLayout["sectionNav"][];
  readonly imageStyles: readonly MenuLayout["imageStyle"][];
  readonly cardStyles: readonly MenuLayout["cardStyle"][];
  readonly locales: readonly Locale[];
}

export interface TemplateDefinition {
  readonly slug: TemplateSlug;
  readonly name: string;
  readonly family: TemplateFamily;
  readonly capabilities: TemplateCapabilities;
  readonly defaultTheme: RestaurantTheme;
}

export interface MenuViewModel {
  readonly restaurant: {
    readonly name: string;
    readonly description: string;
    readonly location: string;
  };
  readonly locale: Locale;
  readonly direction: Direction;
  readonly sections: readonly MenuSection[];
  readonly theme: RestaurantTheme;
  readonly layout: MenuLayout;
}

export interface TemplateRendererProps {
  readonly template: TemplateDefinition;
  readonly menu: MenuViewModel;
}

export type TemplatePreviewMessage =
  | { readonly type: "daify.preview.theme"; readonly version: 1; readonly theme: RestaurantTheme }
  | { readonly type: "daify.preview.locale"; readonly version: 1; readonly locale: Locale }
  | { readonly type: "daify.preview.layout"; readonly version: 1; readonly layout: MenuLayout };
