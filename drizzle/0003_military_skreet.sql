CREATE TABLE `water_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`water_sale_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`paid_at` integer NOT NULL,
	FOREIGN KEY (`water_sale_id`) REFERENCES `water_sales`(`id`) ON UPDATE no action ON DELETE no action
);
