/**
 * Async payment verification state machine with audio and haptics.
 */

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { createAppointment } from '../../../services/apiService.js';
import {
  confirmStripeSession,
  getVerificationErrorMessage,
  verifyRazorpayPayment
} from '../utils/paymentVerificationApi.js';
import { triggerElectronHaptic } from '../utils/haptics.js';

/** @typedef {'idle' | 'processing' | 'success' | 'failure'} VerificationStatus */

const silentAudio = {
  prepareAudio: async () => {},
  playProcessing: async () => {},
  playSuccess: async () => {},
  playFailure: async () => {},
  stopAll: () => {}
};

/**
 * @typedef {Object} UsePaymentVerificationOptions
 * @property {boolean} [enableHaptics]
 * @property {boolean} [showToast] — surface errors via toast (default false)
 */

/**
 * @param {UsePaymentVerificationOptions} [options]
 */
export function usePaymentVerification(options = {}) {
  const { enableHaptics = true, showToast = false } = options;
  const audio = silentAudio;
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
   * Run server verification and create appointment via API.
   * @param {{ booking: object, user: object, verifyFn: () => Promise<{ payment: object }> }} params
   */
  const runVerification = useCallback(
    async ({ booking, user, verifyFn }) => {
      if (verifyingRef.current) return null;
      verifyingRef.current = true;
      setStatus('processing');
      setErrorMessage('');
      if (enableHaptics) triggerElectronHaptic('processing');

      try {
        const result = await verifyFn();
        const appointment = result.appointment || await createAppointment({
          doctor: booking.doctor,
          slot: booking.slot,
          date: booking.date,
          patient: booking.patient,
          payment: result.payment
        });
        setLastPayment(result.payment);
        setStatus('success');
        if (enableHaptics) triggerElectronHaptic('success');
        if (showToast) toast.success('Payment verified successfully', { icon: '✓' });
        return appointment;
      } catch (error) {
        const message = getVerificationErrorMessage(error) || 'Payment verification failed';
        setErrorMessage(message);
        setStatus('failure');
        if (enableHaptics) triggerElectronHaptic('failure');
        if (showToast) toast.error(message);
        return null;
      } finally {
        verifyingRef.current = false;
      }
    },
    [audio, enableHaptics, showToast]
  );

  /**
   * Verify Razorpay handler response.
   */
  const verifyRazorpay = useCallback(
    async (booking, user, razorpayResponse, amount) =>
      runVerification({
        booking,
        user,
        verifyFn: async () => verifyRazorpayPayment(razorpayResponse, amount, booking)
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
        verifyFn: async () => confirmStripeSession(sessionId, booking)
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
