/**
 * Haptic / vibration feedback for payment verification (mobile + some desktop).
 */

/** @typedef {'success' | 'failure' | 'processing'} HapticPattern */

const PATTERNS = {
  success: [12, 40, 12],
  failure: [30, 50, 30, 50, 30],
  processing: [8, 80, 8]
};

/**
 * Trigger device vibration when supported.
 * @param {HapticPattern} pattern
 */
export const triggerHaptic = (pattern = 'success') => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return false;
  try {
    return navigator.vibrate(PATTERNS[pattern] || PATTERNS.success);
  } catch {
    return false;
  }
};

/**
 * Electron: forward to main process if exposed on window.
 * @param {HapticPattern} pattern
 */
export const triggerElectronHaptic = (pattern = 'success') => {
  if (typeof window !== 'undefined' && window.electronPayment?.haptic) {
    window.electronPayment.haptic(pattern);
    return true;
  }
  return triggerHaptic(pattern);
};
