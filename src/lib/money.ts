// All money is stored as whole centavos (integers), never decimals.
export const pesosToCentavos = (pesos: number) => Math.round(pesos * 100);
export const centavosToPesos = (c: number) => c / 100;

export const formatPeso = (c: number) =>
  "₱" +
  (c / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
