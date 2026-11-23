-- TimeEntry was made with the first console tables for time tracking that was
-- never built. No version of the code has read or written it, and the model
-- was marked @@ignore, so the client could not reach it.
--
-- The table is dropped only when it is empty. If someone put rows in it by
-- hand, they are left exactly as they are and the table stays: this app does
-- not use it either way, and a clean-up must not be what deletes them.
DO $$
BEGIN
  IF to_regclass('"TimeEntry"') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM "TimeEntry" LIMIT 1) THEN
    RAISE NOTICE 'TimeEntry holds rows, so it was left in place.';
  ELSE
    DROP TABLE "TimeEntry";
  END IF;
END $$;
