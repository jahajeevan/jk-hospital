/**
 * Optional speech synthesis for payment verification outcomes.
 */

/** Voice feedback on by default; toggle via modal or setVoiceFeedbackEnabled(). */
let enabled = true;

export const setVoiceFeedbackEnabled = (value) => {
  enabled = Boolean(value);
};

export const isVoiceFeedbackEnabled = () => enabled;

const speak = (text) => {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* speech optional */
  }
};

export const speakPaymentSuccess = () => speak('Payment verified successfully');
export const speakPaymentFailure = () => speak('Payment verification failed');
