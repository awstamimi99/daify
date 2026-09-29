CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "menuId" UUID NOT NULL,
  "versionId" UUID NOT NULL,
  route VARCHAR(100) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  language VARCHAR(35) NOT NULL,
  "targetId" VARCHAR(36) NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT analytics_events_version_fkey FOREIGN KEY ("menuId", "versionId") REFERENCES menu_versions("menuId", id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT analytics_event_kind CHECK (kind IN ('MENU_VIEW', 'QR_REDIRECT', 'LANGUAGE_CHANGE', 'SECTION_VIEW', 'ITEM_VIEW'))
);
CREATE INDEX "analytics_events_createdAt_id_idx" ON analytics_events("createdAt", id);
CREATE TABLE analytics_receipts (
  "eventId" UUID PRIMARY KEY REFERENCES analytics_events(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE analytics_daily (
  key CHAR(64) PRIMARY KEY,
  day DATE NOT NULL,
  "organizationId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "menuId" UUID NOT NULL,
  "versionId" UUID NOT NULL,
  route VARCHAR(100) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  language VARCHAR(35) NOT NULL,
  "targetId" VARCHAR(36) NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "analytics_daily_organizationId_locationId_day_idx" ON analytics_daily("organizationId", "locationId", day);
CREATE INDEX analytics_daily_day_idx ON analytics_daily(day);
CREATE FUNCTION reject_analytics_event_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Analytics event facts are immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER analytics_event_immutable BEFORE UPDATE ON analytics_events
FOR EACH ROW EXECUTE FUNCTION reject_analytics_event_update();
