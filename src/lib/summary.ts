export type Tx = {
  type: "cash_in" | "cash_out" | "load";
  amount: number; // centavos
  fee: number; // centavos
  cost: number | null; // load only; null = unknown
  isPaid: boolean;
  feeDeducted: boolean;
};

export type WaterSale = {
  quantity: number; // gallons
  unitPrice: number; // centavos per gallon
  unitCost: number; // centavos per gallon
  isPaid: boolean;
};

// What the customer still owes on an unpaid entry (0 if paid).
export function amountOwed(t: Tx): number {
  if (t.isPaid) return 0;
  return t.type === "cash_out" && t.feeDeducted ? t.amount : t.amount + t.fee;
}

// Profit on one entry. GCash: the fee. Load: sold price minus cost.
// Until a load cost is entered, cost is treated as the load amount, so profit = fee.
export function profitOf(t: Tx): number {
  if (t.type === "load") return t.amount + t.fee - (t.cost ?? t.amount);
  return t.fee;
}

export function summarize(list: Tx[], water: WaterSale[] = []) {
  let cashInVolume = 0,
    cashOutVolume = 0;
  let gcashFees = 0,
    loadSales = 0,
    profit = 0,
    uncollected = 0;
  let waterSales = 0,
    gallonsSold = 0;

  for (const t of list) {
    if (t.type === "cash_in") cashInVolume += t.amount;
    if (t.type === "cash_out") cashOutVolume += t.amount;
    if (t.type === "load") loadSales += t.amount + t.fee;
    else gcashFees += t.fee;
    profit += profitOf(t);
    uncollected += amountOwed(t);
  }

  for (const w of water) {
    const total = w.quantity * w.unitPrice;
    gallonsSold += w.quantity;
    waterSales += total;
    profit += w.quantity * (w.unitPrice - w.unitCost);
    if (!w.isPaid) uncollected += total;
  }

  return {
    count: list.length + water.length,
    cashInVolume,
    cashOutVolume,
    gcashFees,
    loadSales,
    waterSales,
    gallonsSold,
    sales: gcashFees + loadSales + waterSales,
    profit,
    uncollected,
  };
}
