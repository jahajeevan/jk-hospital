/**
 * Async payment verification state machine with audio, haptics, and voice feedback.
 */

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { createVerifiedLocalBooking } from '../../../utils/localStore.js';
import api from '../../../api/client.js';
import { usePaymentAudio } from './usePaymentAudio.js';
import {
  confirmStripeSession,
  getVerificationErrorMessage,
  verifyRazorpayPayment
} from '../utils/paymentVerificationApi.js';
import { triggerElectronHaptic } from '../utils/haptics.js';
import {
  isVoiceFeedbackEnabled,
  speakPaymentFailure,
  speakPaymentSuccess
} from '../utils/voiceFeedback.js';

/** @typedef {'idle' | 'processing' | 'success' | 'failure'} VerificationStatus */

/**
 * @typedef {Object} UsePaymentVerificationOptions
 * @property {boolean} [enableVoice]
 * @property {boolean} [enableHaptics]
 * @property {number} [volume]
 * @property {boolean} [showToast] — surface errors via toast (default false)
 */

/**
 * @param {UsePaymentVerificationOptions} [options]
 */
export function usePaymentVerification(options = {}) {
  const { enableVoice = true, enableHaptics = true, volume = 0.85, showToast = false } = options;
  const audio = usePaymentAudio({ initialVolume: volume });
  const [status, setStatus] = useState(/** @type {VerificationStatus} */ ('idle'));
  const [errorMessage, setErrorMessage] = useState('');
  const [lastPayment, setLastPayment] = useState(null);
  const verifyingRef = useRef(false);

  const reset = useCallback(() => {
    verifyingRef.current = false;
    setStatus('idle');
    setErrorMessage('');
    audio.stopAll();
  }, [audio]);

  /**
   * Run server verification and create local booking.
   * @param {{ booking: object, user: object, verifyFn: () => Promise<{ payment: object }> }} params
   */
  const runVerification = useCallback(
    async ({ booking, user, verifyFn }) => {
      if (verifyingRef.current) return null;
      verifyingRef.current = true;
      setStatus('processing');
      setErrorMessage('');
      await audio.prepareAudio();
      await audio.playProcessing();
      if (enableHaptics) triggerElectronHaptic('processing');

      try {
        const result = await verifyFn();
        const appointment = createVerifiedLocalBooking({
          doctor: booking.doctor,
          slot: booking.slot,
          date: booking.date,
          patient: booking.patient,
          user,
          payment: result.payment
        });
        try {
          await api.post('/appointments/sync', appointment);
        } catch (syncErr) {
          console.warn('Initial appointment sync failed, will retry on dashboard load:', syncErr);
        }
        setLastPayment(result.payment);
        setStatus('success');
        audio.stopAll();
        await audio.playSuccess();
        if (enableHaptics) triggerElectronHaptic('success');
        if (enableVoice || isVoiceFeedbackEnabled()) speakPaymentSuccess();
        if (showToast) toast.success('Payment verified successfully', { icon: '✓' });
        return appointment;
      } catch (error) {
        const message = getVerificationErrorMessage(error) || 'Payment verification failed';
        setErrorMessage(message);
        setStatus('failure');
        audio.stopAll();
        await audio.playFailure();
        if (enableHaptics) triggerElectronHaptic('failure');
        if (enableVoice || isVoiceFeedbackEnabled()) speakPaymentFailure();
        if (showToast) toast.error(message);
        return null;
      } finally {
        verifyingRef.current = false;
      }
    },
    [audio, enableHaptics, enableVoice, showToast]
  );

  /**
   * Verify Razorpay handler response.
   */
  const verifyRazorpay = useCallback(
    async (booking, user, razorpayResponse, amount) =>
      runVerification({
        booking,
        user,
        verifyFn: async () => verifyRazorpayPayment(razorpayResponse, amount)
      }),
    [runVerification]
  );

  /**
   * Verify Stripe Checkout session after redirect.
   */
  const verifyStripe = useCallback(
    async (booking, user, sessionId) =>
      runVerification({
        booking,
        user,
        verifyFn: async () => confirmStripeSession(sessionId)
      }),
    [runVerification]
  );

  const isProcessing = status === 'processing';
  const isSuccess = status === 'success';
  const isFailure = status === 'failure';

  return {
    status,
    errorMessage,
    lastPayment,
    isProcessing,
    isSuccess,
    isFailure,
    reset,
    verifyRazorpay,
    verifyStripe,
    audio
  };
}
