CREATE TABLE `day_closings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`actual_cash` integer NOT NULL,
	`actual_gcash` integer NOT NULL,
	`expected_cash` integer,
	`expected_gcash` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `water_payments` ADD `method` text DEFAULT 'cash' NOT NULL;