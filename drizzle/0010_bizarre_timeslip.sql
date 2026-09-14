CREATE TABLE `pods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pods_name_unique` ON `pods` (`name`);--> statement-breakpoint
ALTER TABLE `games` ADD `pod_id` integer REFERENCES pods(id);