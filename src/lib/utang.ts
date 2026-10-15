import { formatPeso } from "@/lib/money";
import { amountOwed } from "@/lib/summary";

const LABEL = { cash_in: "Cash-in", cash_out: "Cash-out", load: "Load" } as const;

export type UtangEntry = {
  kind: "tx" | "water";
  id: number;
  createdAt: number;
  description: string;
  owed: number; // centavos
  paid: number; // centavos
  balance: number; // centavos
  txType?: "cash_in" | "cash_out" | "load";
};

export type UtangCustomer = {
  key: string; // lowercase name, used to group
  name: string;
  balance: number;
  entries: UtangEntry[];
};

type TxRow = {
  id: number;
  type: "cash_in" | "cash_out" | "load";
  amount: number;
  fee: number;
  cost: number | null;
  feeDeducted: boolean;
  customerName: string | null;
  createdAt: number;
};

type WaterRow = {
  id: number;
  quantity: number;
  unitPrice: number;
  customerName: string | null;
  createdAt: number;
};

export function buildUtang(
  txRows: TxRow[],
  waterRows: WaterRow[],
  txPay: { transactionId: number; amount: number }[],
  waterPay: { waterSaleId: number; amount: number }[],
): UtangCustomer[] {
  const txPaid = new Map<number, number>();
  for (const p of txPay) txPaid.set(p.transactionId, (txPaid.get(p.transactionId) ?? 0) + p.amount);
  const waterPaid = new Map<number, number>();
  for (const p of waterPay) waterPaid.set(p.waterSaleId, (waterPaid.get(p.waterSaleId) ?? 0) + p.amount);

  const byKey = new Map<string, UtangCustomer>();
  const add = (name: string | null, e: UtangEntry) => {
    if (e.balance <= 0) return;
    const display = (name ?? "").trim() || "(no name)";
    const key = display.toLowerCase();
    let c = byKey.get(key);
    if (!c) {
      c = { key, name: display, balance: 0, entries: [] };
      byKey.set(key, c);
    }
    c.balance += e.balance;
    c.entries.push(e);
  };

  for (const t of txRows) {
    const owed = amountOwed({ ...t, isPaid: false });
    const paid = txPaid.get(t.id) ?? 0;
    add(t.customerName, {
      kind: "tx",
      id: t.id,
      createdAt: t.createdAt,
      description: `${LABEL[t.type]} ${formatPeso(t.amount)}`,
      owed,
      paid,
      balance: owed - paid,
      txType: t.type,
    });
  }

  for (const w of waterRows) {
    const owed = w.quantity * w.unitPrice;
    const paid = waterPaid.get(w.id) ?? 0;
    add(w.customerName, {
      kind: "water",
      id: w.id,
      createdAt: w.createdAt,
      description: `Water ${w.quantity} gal`,
      owed,
      paid,
      balance: owed - paid,
    });
  }

  const list = [...byKey.values()];
  for (const c of list) c.entries.sort((a, b) => a.createdAt - b.createdAt);
  return list.sort((a, b) => b.balance - a.balance);
}
