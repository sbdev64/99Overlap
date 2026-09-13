ALTER TABLE `cards` ADD `is_shared` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `is_staple`;