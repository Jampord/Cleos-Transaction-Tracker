CREATE TABLE `fee_tiers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service` text NOT NULL,
	`min_amount` integer NOT NULL,
	`max_amount` integer NOT NULL,
	`fee` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`paid_at` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`fee` integer DEFAULT 0 NOT NULL,
	`cost` integer,
	`customer_name` text,
	`reference` text,
	`is_paid` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
