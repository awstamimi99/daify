-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "menu_translations" (
    "menuId" UUID NOT NULL,
    "languageTag" VARCHAR(35) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_translations_pkey" PRIMARY KEY ("menuId","languageTag")
);

-- CreateTable
CREATE TABLE "menu_section_translations" (
    "sectionId" UUID NOT NULL,
    "languageTag" VARCHAR(35) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_section_translations_pkey" PRIMARY KEY ("sectionId","languageTag")
);

-- CreateTable
CREATE TABLE "menu_item_translations" (
    "itemId" UUID NOT NULL,
    "languageTag" VARCHAR(35) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_item_translations_pkey" PRIMARY KEY ("itemId","languageTag")
);

-- CreateTable
CREATE TABLE "menu_item_images" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_image_translations" (
    "imageId" UUID NOT NULL,
    "languageTag" VARCHAR(35) NOT NULL,
    "altText" VARCHAR(500) NOT NULL,

    CONSTRAINT "menu_image_translations_pkey" PRIMARY KEY ("imageId","languageTag")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_images_objectKey_key" ON "menu_item_images"("objectKey");

-- CreateIndex
CREATE INDEX "menu_item_images_itemId_archivedAt_position_idx" ON "menu_item_images"("itemId", "archivedAt", "position");

-- AddForeignKey
ALTER TABLE "menu_translations" ADD CONSTRAINT "menu_translations_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_section_translations" ADD CONSTRAINT "menu_section_translations_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "menu_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_translations" ADD CONSTRAINT "menu_item_translations_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_images" ADD CONSTRAINT "menu_item_images_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_image_translations" ADD CONSTRAINT "menu_image_translations_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "menu_item_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the M2 seed's existing labels as default-language translations.
INSERT INTO menu_translations ("menuId", "languageTag", name, description, "updatedAt")
SELECT id, "defaultLanguage", name, '', CURRENT_TIMESTAMP FROM menus;
INSERT INTO menu_section_translations ("sectionId", "languageTag", name, description, "updatedAt")
SELECT s.id, m."defaultLanguage", s."stableKey", '', CURRENT_TIMESTAMP FROM menu_sections s JOIN menus m ON m.id = s."menuId";
INSERT INTO menu_item_translations ("itemId", "languageTag", name, description, "updatedAt")
SELECT i.id, m."defaultLanguage", i."stableKey", '', CURRENT_TIMESTAMP FROM menu_items i JOIN menu_sections s ON s.id = i."sectionId" JOIN menus m ON m.id = s."menuId";
