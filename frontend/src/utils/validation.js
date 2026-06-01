export const isValidIndianMobile = (phone = '') => /^[6-9]\d{9}$/.test(String(phone).trim());

export const cleanIndianMobile = (phone = '') => String(phone).replace(/\D/g, '').slice(0, 10);

export const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());

export const isValidHttpUrl = (value = '') => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

export const isNonNegativeInteger = (value) => Number.isInteger(Number(value)) && Number(value) >= 0;

export const isTimeBefore = (start, end) => {
  if (!start || !end) return false;
  return start < end;
};
