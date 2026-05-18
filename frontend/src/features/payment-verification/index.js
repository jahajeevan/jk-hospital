/**
 * Payment verification feature — public API.
 */

export { default as PremiumPaymentSection } from './components/PremiumPaymentSection.jsx';
export { default as PaymentVerificationModal } from './components/PaymentVerificationModal.jsx';
export { default as VerificationStatusDisplay } from './components/VerificationStatusDisplay.jsx';
export { default as SuccessConfetti } from './components/SuccessConfetti.jsx';

export { usePaymentVerification } from './hooks/usePaymentVerification.js';
export { usePaymentAudio } from './hooks/usePaymentAudio.js';

export {
  playSuccessSound,
  playFailureSound,
  playProcessingSound,
  stopAllSounds,
  stopProcessingSound,
  setPaymentAudioVolume,
  getPaymentAudioVolume,
  unlockAudio,
  playPaymentSuccessSound
} from './utils/audioManager.js';

export { triggerHaptic, triggerElectronHaptic } from './utils/haptics.js';
export {
  setVoiceFeedbackEnabled,
  isVoiceFeedbackEnabled,
  speakPaymentSuccess,
  speakPaymentFailure
} from './utils/voiceFeedback.js';

export {
  fetchPaymentConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
  createStripeCheckoutSession,
  confirmStripeSession,
  getVerificationErrorMessage
} from './utils/paymentVerificationApi.js';
