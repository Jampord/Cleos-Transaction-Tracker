import { DEFAULT_GCASH_TIERS } from "../lib/fees";
import { pesosToCentavos as c } from "../lib/money";
import { db } from "./client";
import { feeTiers, settings } from "./schema";

export async function seedIfEmpty() {
  const existing = await db.select().from(feeTiers).limit(1);
  if (existing.length > 0) return;

  await db.insert(feeTiers).values(
    DEFAULT_GCASH_TIERS.map((t) => ({
      service: "gcash",
      minAmount: t.min,
      maxAmount: t.max,
      fee: t.fee,
    })),
  );

  await db.insert(settings).values([
    { key: "load_fee_threshold", value: String(c(100)) },
    { key: "load_fee", value: String(c(5)) },
    { key: "load_from_gcash", value: "1" },
    { key: "deliveries_from_cash", value: "1" },
    { key: "load_cost_percent", value: "100" },
  ]);
}
