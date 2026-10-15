import { PayMethod } from "@/lib/cashcheck";
import { amountOwed } from "@/lib/summary";
import { and, desc, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { buildUtang, UtangEntry } from "@/lib/utang";
import { db } from "./client";
import {
  dayClosings,
  feeTiers,
  payments,
  settings,
  transactions,
  waterDeliveries,
  waterPayments,
  waterSales,
} from "./schema";

export async function getGcashTiers() {
  const rows = await db.select().from(feeTiers).where(eq(feeTiers.service, "gcash"));
  return rows
    .sort((a, b) => a.minAmount - b.minAmount)
    .map((r) => ({ id: r.id, min: r.minAmount, max: r.maxAmount, fee: r.fee }));
}

export async function updateTierFee(id: number, fee: number) {
  await db.update(feeTiers).set({ fee }).where(eq(feeTiers.id, id));
}

export async function getSetting(key: string) {
  const row = await db.select().from(settings).where(eq(settings.key, key));
  return row[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export type NewTransaction = Omit<typeof transactions.$inferInsert, "id" | "createdAt" | "deletedAt">;

export async function insertTransaction(t: NewTransaction) {
  await db.insert(transactions).values({ ...t, createdAt: Date.now() });
}

export async function getTransactionsBetween(start: number, end: number) {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.createdAt, start),
        lt(transactions.createdAt, end),
        isNull(transactions.deletedAt), // soft-deleted entries stay hidden
      ),
    )
    .orderBy(desc(transactions.createdAt));
}

export async function getLoadFeeRule() {
  const threshold = await getSetting("load_fee_threshold");
  const fee = await getSetting("load_fee");
  return { threshold: Number(threshold ?? 10000), fee: Number(fee ?? 500) };
}

export async function getWaterRules() {
  const price = await getSetting("water_price");
  const cost = await getSetting("water_cost");
  return { price: Number(price ?? 0), cost: Number(cost ?? 0) }; // centavos
}

export async function insertWaterDelivery(d: { quantity: number; unitCost: number; note: string | null }) {
  await db.insert(waterDeliveries).values({ ...d, createdAt: Date.now() });
}

export type NewWaterSale = Omit<typeof waterSales.$inferInsert, "id" | "createdAt" | "deletedAt">;

export async function insertWaterSale(s: NewWaterSale) {
  await db.insert(waterSales).values({ ...s, createdAt: Date.now() });
}

export async function getWaterSalesBetween(start: number, end: number) {
  return db
    .select()
    .from(waterSales)
    .where(and(gte(waterSales.createdAt, start), lt(waterSales.createdAt, end), isNull(waterSales.deletedAt)))
    .orderBy(desc(waterSales.createdAt));
}

// Gallons left = all deliveries minus all sales (soft-deleted entries ignored).
export async function getWaterStock() {
  const d = await db
    .select({ q: sql<number>`coalesce(sum(${waterDeliveries.quantity}), 0)` })
    .from(waterDeliveries)
    .where(isNull(waterDeliveries.deletedAt));
  const s = await db
    .select({ q: sql<number>`coalesce(sum(${waterSales.quantity}), 0)` })
    .from(waterSales)
    .where(isNull(waterSales.deletedAt));
  return Number(d[0].q) - Number(s[0].q);
}

export async function getUtangCustomers() {
  const txRows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.isPaid, false), isNull(transactions.deletedAt)));
  const waterRows = await db
    .select()
    .from(waterSales)
    .where(and(eq(waterSales.isPaid, false), isNull(waterSales.deletedAt)));
  const txPay = await db.select().from(payments);
  const waterPay = await db.select().from(waterPayments);
  return buildUtang(txRows, waterRows, txPay, waterPay);
}

// Record a payment against one GCash/load entry; mark it paid once covered.
async function payTransaction(id: number, amount: number, method: PayMethod) {
  const rows = await db.select().from(transactions).where(eq(transactions.id, id));
  const t = rows[0];
  if (!t) return;
  await db.insert(payments).values({ transactionId: id, amount, method, paidAt: Date.now() });
  const sum = await db
    .select({ s: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.transactionId, id));
  if (Number(sum[0].s) >= amountOwed({ ...t, isPaid: false })) {
    await db.update(transactions).set({ isPaid: true }).where(eq(transactions.id, id));
  }
}

async function payWaterSale(id: number, amount: number, method: PayMethod) {
  const rows = await db.select().from(waterSales).where(eq(waterSales.id, id));
  const w = rows[0];
  if (!w) return;
  await db.insert(waterPayments).values({ waterSaleId: id, amount, method, paidAt: Date.now() });
  const sum = await db
    .select({ s: sql<number>`coalesce(sum(${waterPayments.amount}), 0)` })
    .from(waterPayments)
    .where(eq(waterPayments.waterSaleId, id));
  if (Number(sum[0].s) >= w.quantity * w.unitPrice) {
    await db.update(waterSales).set({ isPaid: true }).where(eq(waterSales.id, id));
  }
}

// Apply a payment to a customer's entries, oldest first.
export async function payCustomer(entries: UtangEntry[], amount: number, method: PayMethod) {
  let left = amount;
  for (const e of [...entries].sort((a, b) => a.createdAt - b.createdAt)) {
    if (left <= 0) break;
    const part = Math.min(e.balance, left);
    if (e.kind === "tx") await payTransaction(e.id, part, method);
    else await payWaterSale(e.id, part, method);
    left -= part;
  }
}

// Every name used before (GCash/load and water), most recently used first.
export async function getKnownNames(): Promise<string[]> {
  const t = await db
    .select({ n: transactions.customerName, at: transactions.createdAt })
    .from(transactions)
    .where(isNull(transactions.deletedAt));
  const w = await db
    .select({ n: waterSales.customerName, at: waterSales.createdAt })
    .from(waterSales)
    .where(isNull(waterSales.deletedAt));

  const latest = new Map<string, { name: string; at: number }>();
  for (const r of [...t, ...w]) {
    const name = r.n?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const prev = latest.get(key);
    if (!prev || r.at > prev.at) latest.set(key, { name, at: r.at });
  }
  return [...latest.values()].sort((a, b) => b.at - a.at).map((x) => x.name);
}

// ---------- GCash / load entries ----------
export async function getTransaction(id: number) {
  const rows = await db.select().from(transactions).where(eq(transactions.id, id));
  return rows[0] ?? null;
}

export async function updateTransaction(
  id: number,
  patch: Partial<{
    amount: number;
    fee: number;
    cost: number | null;
    customerName: string | null;
    isPaid: boolean;
    feeDeducted: boolean;
  }>,
) {
  await db.update(transactions).set(patch).where(eq(transactions.id, id));
}

export async function countTxPayments(id: number) {
  const r = await db
    .select({ c: sql<number>`count(*)` })
    .from(payments)
    .where(eq(payments.transactionId, id));
  return Number(r[0].c);
}

export async function softDeleteTransaction(id: number) {
  await db.update(transactions).set({ deletedAt: Date.now() }).where(eq(transactions.id, id));
}

export async function restoreTransaction(id: number) {
  await db.update(transactions).set({ deletedAt: null }).where(eq(transactions.id, id));
}

// ---------- Water sales ----------
export async function getWaterSale(id: number) {
  const rows = await db.select().from(waterSales).where(eq(waterSales.id, id));
  return rows[0] ?? null;
}

export async function updateWaterSale(
  id: number,
  patch: Partial<{
    quantity: number;
    unitPrice: number;
    customerName: string | null;
    isPaid: boolean;
  }>,
) {
  await db.update(waterSales).set(patch).where(eq(waterSales.id, id));
}

export async function countWaterPayments(id: number) {
  const r = await db
    .select({ c: sql<number>`count(*)` })
    .from(waterPayments)
    .where(eq(waterPayments.waterSaleId, id));
  return Number(r[0].c);
}

export async function softDeleteWaterSale(id: number) {
  await db.update(waterSales).set({ deletedAt: Date.now() }).where(eq(waterSales.id, id));
}

export async function restoreWaterSale(id: number) {
  await db.update(waterSales).set({ deletedAt: null }).where(eq(waterSales.id, id));
}

// ---------- Deleted entries ----------
export async function getDeletedEntries() {
  const t = await db.select().from(transactions).where(isNotNull(transactions.deletedAt));
  const w = await db.select().from(waterSales).where(isNotNull(waterSales.deletedAt));
  const d = await db.select().from(waterDeliveries).where(isNotNull(waterDeliveries.deletedAt));
  return { transactions: t, water: w, deliveries: d };
}

// ---------- Payment history and undo ----------
export async function getTxPayments(transactionId: number) {
  return db.select().from(payments).where(eq(payments.transactionId, transactionId)).orderBy(desc(payments.paidAt));
}

export async function getWaterPayments(waterSaleId: number) {
  return db
    .select()
    .from(waterPayments)
    .where(eq(waterPayments.waterSaleId, waterSaleId))
    .orderBy(desc(waterPayments.paidAt));
}

// Remove a payment, then re-check whether the entry is still fully paid.
export async function removeTxPayment(paymentId: number, transactionId: number) {
  await db.delete(payments).where(eq(payments.id, paymentId));
  const rows = await db.select().from(transactions).where(eq(transactions.id, transactionId));
  const t = rows[0];
  if (!t) return;
  const sum = await db
    .select({ s: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.transactionId, transactionId));
  const covered = Number(sum[0].s) >= amountOwed({ ...t, isPaid: false });
  await db.update(transactions).set({ isPaid: covered }).where(eq(transactions.id, transactionId));
}

export async function removeWaterPayment(paymentId: number, waterSaleId: number) {
  await db.delete(waterPayments).where(eq(waterPayments.id, paymentId));
  const rows = await db.select().from(waterSales).where(eq(waterSales.id, waterSaleId));
  const w = rows[0];
  if (!w) return;
  const sum = await db
    .select({ s: sql<number>`coalesce(sum(${waterPayments.amount}), 0)` })
    .from(waterPayments)
    .where(eq(waterPayments.waterSaleId, waterSaleId));
  const covered = Number(sum[0].s) >= w.quantity * w.unitPrice;
  await db.update(waterSales).set({ isPaid: covered }).where(eq(waterSales.id, waterSaleId));
}

// ---------- Water deliveries ----------
export async function getWaterDeliveries() {
  return db
    .select()
    .from(waterDeliveries)
    .where(isNull(waterDeliveries.deletedAt))
    .orderBy(desc(waterDeliveries.createdAt));
}

export async function getWaterDelivery(id: number) {
  const rows = await db.select().from(waterDeliveries).where(eq(waterDeliveries.id, id));
  return rows[0] ?? null;
}

export async function updateWaterDelivery(
  id: number,
  patch: Partial<{ quantity: number; unitCost: number; note: string | null }>,
) {
  await db.update(waterDeliveries).set(patch).where(eq(waterDeliveries.id, id));
}

export async function softDeleteWaterDelivery(id: number) {
  await db.update(waterDeliveries).set({ deletedAt: Date.now() }).where(eq(waterDeliveries.id, id));
}

export async function restoreWaterDelivery(id: number) {
  await db.update(waterDeliveries).set({ deletedAt: null }).where(eq(waterDeliveries.id, id));
}

// ---------- Cash check ----------
export async function getClosings(limit = 8) {
  return db.select().from(dayClosings).orderBy(desc(dayClosings.createdAt)).limit(limit);
}

export async function insertClosing(c: {
  kind: "opening" | "closing";
  actualCash: number;
  actualGcash: number;
  expectedCash: number | null;
  expectedGcash: number | null;
}) {
  await db.insert(dayClosings).values({ ...c, createdAt: Date.now() });
}

export async function deleteClosing(id: number) {
  await db.delete(dayClosings).where(eq(dayClosings.id, id));
}

// Everything the cash check needs, in the shape expectedChange() wants.
export async function getFlowInputs() {
  const txs = await db.select().from(transactions).where(isNull(transactions.deletedAt));
  const txPayments = await db.select().from(payments);
  const waterRows = await db.select().from(waterSales).where(isNull(waterSales.deletedAt));
  const waterPay = await db.select().from(waterPayments);
  const deliveries = await db.select().from(waterDeliveries).where(isNull(waterDeliveries.deletedAt));
  return {
    txs,
    txPayments,
    waterSales: waterRows,
    waterPayments: waterPay,
    deliveries,
    loadFromGcash: (await getSetting("load_from_gcash")) === "1",
    deliveriesFromCash: (await getSetting("deliveries_from_cash")) === "1",
  };
}

export async function getLoadCostPercent() {
  const n = Number(await getSetting("load_cost_percent"));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 100;
}

// Every row of every table, deleted ones included, for the backup export.
export async function getExportData() {
  return {
    transactions: await db.select().from(transactions),
    payments: await db.select().from(payments),
    waterSales: await db.select().from(waterSales),
    waterPayments: await db.select().from(waterPayments),
    waterDeliveries: await db.select().from(waterDeliveries),
    closings: await db.select().from(dayClosings),
  };
}

// DEV ONLY: wipes every entry but keeps fee tiers and settings.
export async function resetTestData() {
  await db.delete(payments);
  await db.delete(waterPayments);
  await db.delete(transactions);
  await db.delete(waterSales);
  await db.delete(waterDeliveries);
  await db.delete(dayClosings);
}
