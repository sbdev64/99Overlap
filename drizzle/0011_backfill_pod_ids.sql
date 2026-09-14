-- Hand-written data migration (not drizzle-kit generated) — backfills the
-- new `pods` table and `games.pod_id` from the existing `games.pod` free
-- text, so historical games end up pointing at a real Pod entity instead of
-- being orphaned. Purely additive (INSERT/UPDATE only, no destructive DDL)
-- and safe to run more than once. See roadmap issue #120.
INSERT INTO `pods` (`name`, `created_at`)
SELECT DISTINCT `pod`, unixepoch() FROM `games`
WHERE `pod` NOT IN (SELECT `name` FROM `pods`);
--> statement-breakpoint
UPDATE `games`
SET `pod_id` = (SELECT `id` FROM `pods` WHERE `pods`.`name` = `games`.`pod`)
WHERE `pod_id` IS NULL;
