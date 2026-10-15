import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// All money columns are whole centavos.

export const feeTiers = sqliteTable("fee_tiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  service: text("service").notNull(), // "gcash"
  minAmount: integer("min_amount").notNull(),
  maxAmount: integer("max_amount").notNull(),
  fee: integer("fee").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(), // e.g. "load_fee_threshold"
  value: text("value").notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["cash_in", "cash_out", "load"] }).notNull(),
  amount: integer("amount").notNull(),
  fee: integer("fee").notNull().default(0),
  cost: integer("cost"), // load only; null = no discount
  customerName: text("customer_name"),
  reference: text("reference"), // number, free text, optional
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(true),
  feeDeducted: integer("fee_deducted", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(), // ms since epoch
  deletedAt: integer("deleted_at"), // soft delete
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id")
    .notNull()
    .references(() => transactions.id),
  amount: integer("amount").notNull(),
  method: text("method", { enum: ["cash", "gcash"] })
    .notNull()
    .default("cash"),
  paidAt: integer("paid_at").notNull(),
});

export const waterDeliveries = sqliteTable("water_deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quantity: integer("quantity").notNull(), // gallons
  unitCost: integer("unit_cost").notNull(), // centavos per gallon
  note: text("note"),
  createdAt: integer("created_at").notNull(),
  deletedAt: integer("deleted_at"),
});

export const waterSales = sqliteTable("water_sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quantity: integer("quantity").notNull(), // gallons
  unitPrice: integer("unit_price").notNull(), // centavos per gallon
  unitCost: integer("unit_cost").notNull(), // cost per gallon at the time of sale
  customerName: text("customer_name"),
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  deletedAt: integer("deleted_at"),
});

export const waterPayments = sqliteTable("water_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waterSaleId: integer("water_sale_id")
    .notNull()
    .references(() => waterSales.id),
  amount: integer("amount").notNull(),
  method: text("method", { enum: ["cash", "gcash"] })
    .notNull()
    .default("cash"),
  paidAt: integer("paid_at").notNull(),
});

export const dayClosings = sqliteTable("day_closings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["opening", "closing"] }).notNull(),
  actualCash: integer("actual_cash").notNull(), // centavos
  actualGcash: integer("actual_gcash").notNull(), // centavos
  expectedCash: integer("expected_cash"), // null for the opening count
  expectedGcash: integer("expected_gcash"),
  createdAt: integer("created_at").notNull(),
});
