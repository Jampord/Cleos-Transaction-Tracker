import { pesos, stamp, text, toCsv } from "./csv";

type Data = {
  transactions: {
    id: number;
    type: string;
    amount: number;
    fee: number;
    cost: number | null;
    customerName: string | null;
    isPaid: boolean;
    feeDeducted: boolean;
    createdAt: number;
    deletedAt: number | null;
  }[];
  payments: { id: number; transactionId: number; amount: number; method: string; paidAt: number }[];
  waterSales: {
    id: number;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    customerName: string | null;
    isPaid: boolean;
    createdAt: number;
    deletedAt: number | null;
  }[];
  waterPayments: { id: number; waterSaleId: number; amount: number; method: string; paidAt: number }[];
  waterDeliveries: {
    id: number;
    quantity: number;
    unitCost: number;
    note: string | null;
    createdAt: number;
    deletedAt: number | null;
  }[];
  closings: {
    id: number;
    kind: string;
    actualCash: number;
    actualGcash: number;
    expectedCash: number | null;
    expectedGcash: number | null;
    createdAt: number;
  }[];
};

const HEADER = [
  "date",
  "kind",
  "id",
  "detail",
  "amount",
  "fee",
  "cost",
  "gallons",
  "price_per_gallon",
  "cost_per_gallon",
  "name",
  "paid",
  "deleted",
  "entry_id",
];

export function buildExportCsv(d: Data): string {
  const rows: { at: number; cells: (string | number | null)[] }[] = [];

  for (const t of d.transactions) {
    rows.push({
      at: t.createdAt,
      cells: [
        stamp(t.createdAt),
        "transaction",
        t.id,
        t.type + (t.feeDeducted ? " (fee deducted)" : ""),
        pesos(t.amount),
        pesos(t.fee),
        pesos(t.cost),
        "",
        "",
        "",
        text(t.customerName),
        t.isPaid ? "yes" : "no",
        t.deletedAt ? "yes" : "",
        "",
      ],
    });
  }
  for (const p of d.payments) {
    rows.push({
      at: p.paidAt,
      cells: [
        stamp(p.paidAt),
        "payment",
        p.id,
        p.method,
        pesos(p.amount),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        p.transactionId,
      ],
    });
  }
  for (const w of d.waterSales) {
    rows.push({
      at: w.createdAt,
      cells: [
        stamp(w.createdAt),
        "water_sale",
        w.id,
        "",
        pesos(w.quantity * w.unitPrice),
        "",
        "",
        w.quantity,
        pesos(w.unitPrice),
        pesos(w.unitCost),
        text(w.customerName),
        w.isPaid ? "yes" : "no",
        w.deletedAt ? "yes" : "",
        "",
      ],
    });
  }
  for (const p of d.waterPayments) {
    rows.push({
      at: p.paidAt,
      cells: [
        stamp(p.paidAt),
        "water_payment",
        p.id,
        p.method,
        pesos(p.amount),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        p.waterSaleId,
      ],
    });
  }
  for (const x of d.waterDeliveries) {
    rows.push({
      at: x.createdAt,
      cells: [
        stamp(x.createdAt),
        "water_delivery",
        x.id,
        x.note ?? "",
        pesos(x.quantity * x.unitCost),
        "",
        "",
        x.quantity,
        "",
        pesos(x.unitCost),
        "",
        "",
        x.deletedAt ? "yes" : "",
        "",
      ],
    });
  }
  for (const c of d.closings) {
    const detail =
      `${c.kind}: cash ${pesos(c.actualCash)}, gcash ${pesos(c.actualGcash)}` +
      (c.expectedCash !== null && c.expectedGcash !== null
        ? ` (expected cash ${pesos(c.expectedCash)}, gcash ${pesos(c.expectedGcash)})`
        : "");
    rows.push({
      at: c.createdAt,
      cells: [stamp(c.createdAt), "count", c.id, detail, "", "", "", "", "", "", "", "", "", ""],
    });
  }

  rows.sort((a, b) => a.at - b.at);
  return toCsv([HEADER, ...rows.map((r) => r.cells)]);
}
