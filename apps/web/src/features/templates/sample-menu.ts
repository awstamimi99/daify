import type { MenuViewModel, RestaurantTheme, TemplateDefinition } from "@daify/types";
import { burrataTomato, charredOctopus, truffleRigatoni, whippedFeta } from "@/lib/assets";

export const atelierTheme: RestaurantTheme = {
  background: "#f4efe5", surface: "#fbf8f2", primary: "#211f1b", accent: "#b5965b",
  text: "#211f1b", muted: "#716c63", cardRadius: "2px", buttonRadius: "4px",
};

export const atelierDefinition: TemplateDefinition = {
  slug: "atelier", name: "Atelier", family: "classic", defaultTheme: atelierTheme,
  capabilities: { itemLayouts: ["list", "grid", "image-focus"], sectionNavigation: ["minimal", "tabs", "chips"], imageStyles: ["square", "rounded", "circle", "full-bleed"], cardStyles: ["flat", "bordered", "elevated"], locales: ["en", "ar"] },
};

const sections: MenuViewModel["sections"] = [
  { id: "starters", name: "Starters", description: "A bright beginning.", order: 1, translations: { ar: { name: "المقبلات", description: "بداية مشرقة." } }, items: [
    { id: "whipped-feta", name: "Whipped Feta", description: "Roasted grapes, thyme honey and warm flatbread.", price: "3.500 KD", available: true, featured: true, image: whippedFeta.src, dietary: ["Vegetarian"], allergens: ["Dairy", "Gluten"], badge: "House favorite", translations: { ar: { name: "فيتا مخفوقة", description: "عنب مشوي، عسل الزعتر وخبز دافئ." } } },
    { id: "burrata", name: "Burrata & Tomato", description: "Heirloom tomato, basil oil and toasted sourdough.", price: "4.250 KD", available: true, featured: false, image: burrataTomato.src, dietary: ["Vegetarian"], allergens: ["Dairy", "Gluten"], translations: { ar: { name: "بوراتا وطماطم", description: "طماطم موسمية، زيت الريحان وخبز محمص." } } },
  ] },
  { id: "mains", name: "Main Courses", description: "From the hearth and the coast.", order: 2, translations: { ar: { name: "الأطباق الرئيسية", description: "من الموقد والساحل." } }, items: [
    { id: "rigatoni", name: "Truffle Rigatoni", description: "Wild mushroom, parmesan and black truffle.", price: "6.500 KD", available: true, featured: true, image: truffleRigatoni.src, dietary: ["Vegetarian"], allergens: ["Dairy", "Gluten"], translations: { ar: { name: "ريغاتوني بالكمأة", description: "فطر بري، بارميزان وكمأة سوداء." } } },
    { id: "octopus", name: "Charred Octopus", description: "Chickpea, smoked paprika and preserved lemon.", price: "8.000 KD", available: false, featured: false, image: charredOctopus.src, dietary: ["Gluten Free"], allergens: ["Shellfish"], translations: { ar: { name: "أخطبوط مشوي", description: "حمص، بابريكا مدخنة وليمون محفوظ." } } },
  ] },
];

export function getAtelierMenu(locale: "en" | "ar"): MenuViewModel {
  return { restaurant: { name: "Oliva", description: locale === "ar" ? "مطبخ متوسطي موسمي في الكويت." : "Seasonal Mediterranean cooking in Kuwait.", location: locale === "ar" ? "السالمية، الكويت" : "Salmiya, Kuwait" }, locale, direction: locale === "ar" ? "rtl" : "ltr", sections, theme: atelierTheme, layout: { itemLayout: "list", sectionNav: "minimal", imageStyle: "square", cardStyle: "flat", mobileColumns: "1", tabletColumns: "2", desktopColumns: "3" } };
}
