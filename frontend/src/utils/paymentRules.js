export const FIXED_CONSULTATION_FEE = 500;
export const MIN_CONSULTATION_FEE = 50;

export const normalizeFee = (fee, fallback = FIXED_CONSULTATION_FEE) => {
  const amount = Number(fee ?? fallback);
  if (!Number.isFinite(amount)) return FIXED_CONSULTATION_FEE;
  return Math.max(Math.round(amount), MIN_CONSULTATION_FEE);
};
