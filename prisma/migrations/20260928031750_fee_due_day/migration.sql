-- AlterTable
ALTER TABLE "LineItem" ADD COLUMN     "dueDay" INTEGER;


-- Remember each recurring fee's day of the month. Typed dates are stored at
-- noon UTC, so the stored day is the day meant. A fee now on the 28th to 30th
-- may have been on a later day and moved in a short month: if a period in the
-- year before its due date started on a later day, that later day is kept.
UPDATE "LineItem" l
SET "dueDay" = CASE
  WHEN EXTRACT(DAY FROM l."nextDueAt") BETWEEN 28 AND 30 THEN GREATEST(
    EXTRACT(DAY FROM l."nextDueAt")::int,
    COALESCE((
      SELECT MAX(EXTRACT(DAY FROM r."periodStart"))::int
      FROM "RenewalEvent" r
      WHERE r."lineItemId" = l.id
        AND r."periodStart" >= l."nextDueAt" - interval '12 months'
        AND r."periodStart" < l."nextDueAt"
    ), 0)
  )
  ELSE EXTRACT(DAY FROM l."nextDueAt")::int
END
WHERE l."nextDueAt" IS NOT NULL
  AND l."billingKind" IN ('recurring_monthly', 'recurring_annual');

-- Periods waiting to be billed were laid out on the old rule, which only
-- differs for fees due after the 28th. Those untouched ones are removed and
-- laid out again on the new rule the next time the renewals are looked at.
-- Anything drafted, invoiced, skipped or annotated stays as it is.
DELETE FROM "RenewalEvent" r
USING "LineItem" l
WHERE r."lineItemId" = l.id
  AND l."dueDay" >= 29
  AND r.status = 'pending'
  AND r."invoiceId" IS NULL
  AND r."draftedAt" IS NULL
  AND r.note IS NULL;
