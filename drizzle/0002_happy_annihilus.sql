CREATE TABLE `water_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost` integer NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `water_sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`unit_cost` integer NOT NULL,
	`customer_name` text,
	`is_paid` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
