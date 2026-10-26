-- Ubunifu Insight was withdrawn in October 2026, and its three journal
-- articles go with it. Each is taken down and archived, as the Journal's own
-- buttons do, so it can be brought back from the archive if ever wanted, and
-- each is recorded in Activity. Nothing is deleted.
WITH archived AS (
  UPDATE "Post"
  SET "status" = 'draft', "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "slug" IN (
    'why-our-ai-answers-in-swahili',
    'why-pay-as-you-go-pricing',
    'building-software-for-africa'
  )
    AND "deletedAt" IS NULL
  RETURNING "id", "title"
)
INSERT INTO "AuditEvent" ("id", "actorType", "action", "entityType", "entityId", "summary", "metadata", "createdAt")
SELECT
  'archive-insight-' || "id",
  'system',
  'post.archived',
  'Post',
  "id",
  "title",
  '{"reason": "Ubunifu Insight was withdrawn"}'::jsonb,
  CURRENT_TIMESTAMP
FROM archived;
