import { pesosToCentavos as c } from "./money";

export type FeeTier = { min: number; max: number; fee: number }; // centavos

// Her notebook table.
const head: [number, number, number][] = [
  [1, 100, 5],
  [101, 500, 10],
  [501, 1000, 20],
  [1001, 1500, 30],
  [1501, 2000, 40],
];

const tiers: FeeTier[] = head.map(([min, max, fee]) => ({
  min: c(min),
  max: c(max),
  fee: c(fee),
}));

// From 2,001 up: +10 per 500, ending at 9,501-10,000 = 200
for (let min = 2001, fee = 50; min <= 9501; min += 500, fee += 10) {
  tiers.push({ min: c(min), max: c(min + 499), fee: c(fee) });
}

export const DEFAULT_GCASH_TIERS = tiers;

// Returns the fee in centavos, or null if the amount is outside the table
// (the screen then asks her to type the fee by hand).
export function lookupGcashFee(amount: number, table = DEFAULT_GCASH_TIERS) {
  const tier = table.find((t) => amount >= t.min && amount <= t.max);
  return tier ? tier.fee : null;
}

// Load: ₱5 below ₱100 (editable setting), otherwise no automatic fee yet.
export function lookupLoadFee(amount: number, threshold = c(100), fee = c(5)) {
  return amount < threshold ? fee : 0;
}
