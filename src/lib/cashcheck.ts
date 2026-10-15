export type PayMethod = "cash" | "gcash";
export type Flow = { cash: number; gcash: number }; // centavos

export type FlowInput = {
  txs: {
    id: number;
    type: "cash_in" | "cash_out" | "load";
    amount: number;
    fee: number;
    cost: number | null;
    isPaid: boolean;
    feeDeducted: boolean;
    createdAt: number;
  }[];
  txPayments: { transactionId: number; amount: number; method: PayMethod; paidAt: number }[];
  waterSales: { id: number; quantity: number; unitPrice: number; isPaid: boolean; createdAt: number }[];
  waterPayments: { waterSaleId: number; amount: number; method: PayMethod; paidAt: number }[];
  deliveries: { quantity: number; unitCost: number; createdAt: number }[];
  loadFromGcash: boolean;
  deliveriesFromCash: boolean;
};

// How much the cash drawer and the GCash wallet should have changed since `since` (ms).
export function expectedChange(d: FlowInput, since: number): Flow {
  const f: Flow = { cash: 0, gcash: 0 };

  // An entry that has payments was unpaid when it was made.
  const txHasPay = new Set(d.txPayments.map((p) => p.transactionId));
  const waterHasPay = new Set(d.waterPayments.map((p) => p.waterSaleId));

  for (const t of d.txs) {
    if (t.createdAt <= since) continue;
    const unpaid = !t.isPaid || txHasPay.has(t.id);

    if (t.type === "cash_in") {
      f.gcash -= t.amount;
      if (!unpaid) f.cash += t.amount + t.fee;
    } else if (t.type === "cash_out") {
      if (unpaid) {
        f.cash -= t.feeDeducted ? t.amount - t.fee : t.amount;
      } else {
        f.gcash += t.amount;
        f.cash += t.fee - t.amount;
      }
    } else {
      if (d.loadFromGcash) f.gcash -= t.cost ?? t.amount;
      if (!unpaid) f.cash += t.amount + t.fee;
    }
  }

  for (const w of d.waterSales) {
    if (w.createdAt <= since) continue;
    if (w.isPaid && !waterHasPay.has(w.id)) f.cash += w.quantity * w.unitPrice;
  }

  // Money received on utang counts on the day it was received, even for old entries.
  for (const p of d.txPayments) if (p.paidAt > since) f[p.method] += p.amount;
  for (const p of d.waterPayments) if (p.paidAt > since) f[p.method] += p.amount;

  if (d.deliveriesFromCash) {
    for (const x of d.deliveries) {
      if (x.createdAt > since) f.cash -= x.quantity * x.unitCost;
    }
  }

  return f;
}
