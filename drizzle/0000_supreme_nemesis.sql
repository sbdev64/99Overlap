CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`scryfall_id` text,
	`mana_cost` text,
	`type_line` text,
	`color_identity` text,
	`image_url` text,
	`is_staple` integer DEFAULT false NOT NULL,
	`current_deck_id` integer,
	FOREIGN KEY (`current_deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cards_name_unique` ON `cards` (`name`);--> statement-breakpoint
CREATE TABLE `deck_cards` (
	`deck_id` integer NOT NULL,
	`card_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`board` text NOT NULL,
	PRIMARY KEY(`deck_id`, `card_id`),
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`commander_name` text,
	`color_identity` text,
	`source_text` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
