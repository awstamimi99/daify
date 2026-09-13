-- CreateEnum
CREATE TYPE "MenuVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- AlterTable
ALTER TABLE "menus" ADD COLUMN     "currentVersionId" UUID,
ADD COLUMN     "publicSlug" VARCHAR(100),
ADD COLUMN     "visibility" "MenuVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "publishingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "menu_versions" (
    "id" UUID NOT NULL,
    "menuId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" UUID NOT NULL,
    "sourceDraftRevision" INTEGER NOT NULL,
    "rollbackSourceId" UUID,

    CONSTRAINT "menu_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_version_images" (
    "versionId" UUID NOT NULL,
    "imageId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,

    CONSTRAINT "menu_version_images_pkey" PRIMARY KEY ("versionId","imageId")
);

-- CreateTable
CREATE TABLE "menu_routes" (
    "slug" VARCHAR(100) NOT NULL,
    "menuId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_routes_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "publication_operations" (
    "menuId" UUID NOT NULL,
    "key" UUID NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_operations_pkey" PRIMARY KEY ("menuId","key")
);

-- CreateTable
CREATE TABLE "publication_events" (
    "id" UUID NOT NULL,
    "menuId" UUID NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),

    CONSTRAINT "publication_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_versions_menuId_id_key" ON "menu_versions"("menuId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_versions_menuId_number_key" ON "menu_versions"("menuId", "number");

-- CreateIndex
CREATE INDEX "menu_routes_menuId_idx" ON "menu_routes"("menuId");

-- CreateIndex
CREATE INDEX "publication_events_processedAt_createdAt_idx" ON "publication_events"("processedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_id_currentVersionId_fkey" FOREIGN KEY ("id", "currentVersionId") REFERENCES "menu_versions"("menuId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "menu_versions" ADD CONSTRAINT "menu_versions_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_version_images" ADD CONSTRAINT "menu_version_images_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "menu_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_routes" ADD CONSTRAINT "menu_routes_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_operations" ADD CONSTRAINT "publication_operations_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
