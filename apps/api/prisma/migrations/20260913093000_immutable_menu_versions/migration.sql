-- Published content is append-only. Archive the owning menu rather than mutating history.
CREATE FUNCTION reject_menu_version_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published menu versions are immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER menu_versions_immutable BEFORE UPDATE ON menu_versions
FOR EACH ROW EXECUTE FUNCTION reject_menu_version_update();
CREATE TRIGGER menu_version_images_immutable BEFORE UPDATE ON menu_version_images
FOR EACH ROW EXECUTE FUNCTION reject_menu_version_update();
ALTER TABLE menu_versions ADD CONSTRAINT menu_version_positive CHECK (number > 0 AND "schemaVersion" = 1 AND "sourceDraftRevision" > 0);
