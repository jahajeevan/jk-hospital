/**
 * Premium payment section — Stripe Checkout + Razorpay with verification UX.
 */

import {
  CheckCircle,
  CreditCard,
  Landmark,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Volume2,
  Wallet
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatApiError } from '../../../api/client.js';
import { normalizeFee } from '../../../utils/paymentRules.js';
import { isValidIndianMobile } from '../../../utils/validation.js';
import { usePaymentVerification } from '../hooks/usePaymentVerification.js';
import {
  createRazorpayOrder,
  createStripeCheckoutSession,
  fetchPaymentConfig,
  getVerificationErrorMessage
} from '../utils/paymentVerificationApi.js';
import { setVoiceFeedbackEnabled } from '../utils/voiceFeedback.js';
import PaymentVerificationModal from './PaymentVerificationModal.jsx';
import VerificationStatusDisplay from './VerificationStatusDisplay.jsx';

const BOOKING_KEY = 'jk_pending_payment_booking';
const PAYMENT_MODE_KEY = 'jk_pending_payment_mode';
const PROVIDER_KEY = 'jk_pending_payment_provider';
const VOICE_PREF_KEY = 'jk_payment_voice_enabled';

const paymentModes = [
  { id: 'upi', label: 'UPI', detail: 'GPay, PhonePe, BHIM', Icon: Smartphone },
  { id: 'netbanking', label: 'Netbanking', detail: 'Pay from your bank', Icon: Landmark },
  { id: 'card', label: 'Card', detail: 'Debit or credit card', Icon: CreditCard },
  { id: 'wallet', label: 'Wallet', detail: 'Supported wallets', Icon: Wallet }
];

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout'));
    document.body.appendChild(script);
  });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 1) => {
  try {
    return await fn();
  } catch (error) {
    if (!retries) throw error;
    await wait(1500);
    return withRetry(fn, retries - 1);
  }
};

/**
 * @param {{ booking: object, user: object }} props
 */
export default function PremiumPaymentSection({ booking, user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState({ razorpay: true, stripe: true });
  const [configLoading, setConfigLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState('');
  const [gateway, setGateway] = useState(() => localStorage.getItem(PROVIDER_KEY) || 'razorpay');
  const [selectedMode, setSelectedMode] = useState(() => localStorage.getItem(PAYMENT_MODE_KEY) || 'upi');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const stored = localStorage.getItem(VOICE_PREF_KEY);
    return stored === null ? true : stored === 'true';
  });

  const verification = usePaymentVerification({
    enableVoice: voiceEnabled,
    volume: 0.85
  });

  const { status, errorMessage, isProcessing, audio, verifyRazorpay, verifyStripe, reset } = verification;

  const amount = normalizeFee(booking?.slot?.fee, booking?.doctor?.fee);

  const summary = useMemo(() => {
    if (!booking) return [];
    return [
      ['Patient', booking.patient.name || user?.name],
      ['Phone', booking.patient.phone],
      ['Doctor', booking.doctor.name],
      ['Date', booking.date],
      ['Slot', booking.slot.label]
    ];
  }, [booking, user]);

  useEffect(() => {
    localStorage.setItem(BOOKING_KEY, JSON.stringify(booking));
    localStorage.setItem(PAYMENT_MODE_KEY, selectedMode);
    localStorage.setItem(PROVIDER_KEY, gateway);
  }, [booking, selectedMode, gateway]);

  useEffect(() => {
    setVoiceFeedbackEnabled(voiceEnabled);
    localStorage.setItem(VOICE_PREF_KEY, String(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    withRetry(fetchPaymentConfig, 2)
      .then((config) => {
        const nextProviders = {
          razorpay: Boolean(config.razorpay),
          stripe: Boolean(config.stripe)
        };
        setProviders(nextProviders);
        if (nextProviders.razorpay) setGateway('razorpay');
        else if (nextProviders.stripe) setGateway('stripe');
        else setCheckoutError('No online payment gateway is configured. Add Razorpay or Stripe keys in backend/.env and restart the server.');
      })
      .catch((error) => {
        setProviders({ razorpay: false, stripe: false });
        setCheckoutError(`${formatApiError(error)} The payment server may be waking up. Wait a few seconds and try again.`);
      })
      .finally(() => setConfigLoading(false));
  }, []);

  useEffect(() => {
    if (configLoading) return;
    if (gateway === 'razorpay' && !providers.razorpay && providers.stripe) setGateway('stripe');
    if (gateway === 'stripe' && !providers.stripe && providers.razorpay) setGateway('razorpay');
  }, [configLoading, gateway, providers]);

  /** Handle Stripe return URL: ?local_session_id=cs_... */
  useEffect(() => {
    const sessionId = searchParams.get('local_session_id');
    const cancelled = searchParams.get('cancelled');
    if (cancelled === 'true') {
      setSearchParams({}, { replace: true });
      return;
    }
    if (!sessionId || !booking) return;

    const completeStripe = async () => {
      setSearchParams({}, { replace: true });
      const appointment = await verifyStripe(booking, user, sessionId);
      if (appointment) {
        localStorage.removeItem(BOOKING_KEY);
        localStorage.removeItem(PAYMENT_MODE_KEY);
        localStorage.removeItem(PROVIDER_KEY);
        setTimeout(() => {
          navigate('/payment-success', { replace: true, state: { appointment } });
        }, 900);
      }
    };
    void completeStripe();
  }, [searchParams, booking, user, verifyStripe, navigate, setSearchParams]);

  const buildOrderPayload = useCallback(
    () => ({
      amount,
      doctorName: booking.doctor.name,
      slotLabel: booking.slot.label,
      appointmentDate: booking.date,
      preferredPaymentMode: selectedMode,
      patientDetails: { ...booking.patient, email: user?.email }
    }),
    [amount, booking, selectedMode, user]
  );

  const startStripeCheckout = async () => {
    if (!booking || !providers.stripe) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    await audio.prepareAudio();
    try {
      const { url } = await createStripeCheckoutSession(buildOrderPayload());
      window.location.href = url;
    } catch (error) {
      setCheckoutError(getVerificationErrorMessage(error) || 'Could not start Stripe Checkout. Restart backend and try again.');
      setCheckoutLoading(false);
    }
  };

  const startRazorpayCheckout = async () => {
    if (!booking || !providers.razorpay) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    await audio.prepareAudio();
    try {
      await loadRazorpay();
      const data = await withRetry(() => createRazorpayOrder(buildOrderPayload()), 1);

      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'JK Hospital',
        description: `${booking.doctor.name} - ${booking.slot.label}`,
        order_id: data.order.id,
        prefill: {
          name: booking.patient.name || user?.name || '',
          email: user?.email || '',
          contact: booking.patient.phone || ''
        },
        method: {
          upi: selectedMode === 'upi',
          netbanking: selectedMode === 'netbanking',
          card: selectedMode === 'card',
          wallet: selectedMode === 'wallet'
        },
        handler: async (response) => {
          setCheckoutLoading(false);
          const appointment = await verifyRazorpay(booking, user, response, amount);
          if (appointment) {
            localStorage.removeItem(BOOKING_KEY);
            localStorage.removeItem(PAYMENT_MODE_KEY);
            localStorage.removeItem(PROVIDER_KEY);
            setTimeout(() => {
              navigate('/payment-success', { replace: true, state: { appointment } });
            }, 900);
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
            reset();
          }
        },
        theme: { color: '#0d63ad' }
      });
      checkout.open();
    } catch (error) {
      const message = error.friendlyMessage || formatApiError(error) || 'Could not start Razorpay. If the server just woke up, press Pay again after a few seconds.';
      setCheckoutError(providers.stripe ? `${message} Stripe is available as a backup on this page.` : message);
      if (providers.stripe) setGateway('stripe');
      setCheckoutLoading(false);
    }
  };

  const startCheckout = () => {
    setCheckoutError('');
    if (!providers.razorpay && !providers.stripe) {
      setCheckoutError('No online payment gateway is configured. Add Razorpay or Stripe keys in backend/.env and restart the server.');
      return;
    }
    if (gateway === 'razorpay' && !providers.razorpay) {
      setCheckoutError('Razorpay is not configured. Choose Stripe or update Razorpay keys in backend/.env.');
      return;
    }
    if (gateway === 'stripe' && !providers.stripe) {
      setCheckoutError('Stripe is not configured. Choose Razorpay or update Stripe keys in backend/.env.');
      return;
    }
    if (!isValidIndianMobile(booking?.patient?.phone)) {
      setCheckoutError('Enter a valid 10-digit mobile number before payment. Razorpay will use this contact for the payment.');
      return;
    }
    if (gateway === 'stripe') return startStripeCheckout();
    return startRazorpayCheckout();
  };

  const noGatewayConfigured = !providers.razorpay && !providers.stripe;
  const payDisabled = checkoutLoading || isProcessing || configLoading || noGatewayConfigured;
  const showModal = isProcessing || status === 'success' || status === 'failure';

  return (
    <>
      <PaymentVerificationModal
        open={showModal}
        status={status}
        message={errorMessage}
        volume={audio.volume}
        onVolumeChange={audio.setVolume}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={setVoiceEnabled}
      />

      <div className="container-pad grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <section className="glass rounded-2xl p-6 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="flex items-center gap-2 font-semibold text-medical-600 dark:text-medical-300">
            <Sparkles size={16} /> Premium secure checkout
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Pay consultation fee</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Razorpay is active for UPI, cards, wallets, and netbanking. If the payment server is waking up, this page retries automatically.
          </p>

          <div className="mt-8 rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(20,123,209,0.14)] dark:bg-slate-800/80 dark:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-medical-50 text-medical-700 dark:bg-medical-900/50">
                  <CreditCard size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Consultation fee</p>
                  <p className="text-wrap-anywhere mt-1 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">INR {amount}</p>
                  <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Flat fee · hospital verified
                  </p>
                </div>
              </div>
            </div>

            {/* Gateway selector */}
            <div className="mt-6">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Payment gateway</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {providers.stripe && (
                  <button
                    type="button"
                    onClick={() => setGateway('stripe')}
                    disabled={payDisabled}
                    className={`rounded-xl border p-4 text-left transition ${
                      gateway === 'stripe'
                        ? 'border-[#635bff] bg-[#635bff]/10 ring-2 ring-[#635bff]/30'
                        : 'border-slate-200 hover:border-[#635bff] dark:border-slate-600'
                    }`}
                  >
                    <span className="font-bold text-[#635bff]">Stripe</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Cards, UPI, wallets — Checkout hosted by Stripe
                    </span>
                  </button>
                )}
                {providers.razorpay && (
                  <button
                    type="button"
                    onClick={() => setGateway('razorpay')}
                    disabled={payDisabled}
                    className={`rounded-xl border p-4 text-left transition ${
                      gateway === 'razorpay'
                        ? 'border-medical-500 bg-medical-50 ring-2 ring-medical-500/25 dark:bg-medical-950/40'
                        : 'border-slate-200 hover:border-medical-500 dark:border-slate-600'
                    }`}
                  >
                    <span className="font-bold text-medical-700 dark:text-medical-300">Razorpay</span>
                    <span className="mt-1 block text-xs text-slate-500">UPI, GPay, PhonePe, cards, netbanking</span>
                  </button>
                )}
              </div>
            </div>

            {gateway === 'razorpay' && (
              <div className="mt-6">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Payment mode</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {paymentModes.map(({ id, label, detail, Icon }) => {
                    const selected = selectedMode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedMode(id)}
                        disabled={payDisabled}
                        className={`rounded-xl border p-4 text-left transition ${
                          selected
                            ? 'border-medical-500 bg-medical-50 shadow-lg dark:bg-medical-950/50'
                            : 'border-slate-200 hover:border-medical-500 dark:border-slate-600'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <Icon size={20} />
                          {selected && <CheckCircle size={18} className="text-medical-600" />}
                        </span>
                        <span className="mt-3 block font-bold">{label}</span>
                        <span className="mt-1 block text-xs text-slate-500">{detail}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!showModal && status !== 'idle' && (
              <VerificationStatusDisplay status={status} message={errorMessage} />
            )}

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Volume2 size={14} />
              <span>Sound · haptics · voice on verify</span>
            </div>

            {checkoutError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                <p className="text-wrap-anywhere">{checkoutError}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-100" onClick={startCheckout} disabled={checkoutLoading || isProcessing}>
                    Try payment again
                  </button>
                  {providers.stripe && gateway !== 'stripe' ? (
                    <button type="button" className="rounded-lg bg-[#635bff] px-3 py-2 text-xs font-bold text-white" onClick={() => setGateway('stripe')} disabled={checkoutLoading || isProcessing}>
                      Use Stripe instead
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={payDisabled}
              onClick={startCheckout}
              className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {payDisabled ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CreditCard size={18} />
              )}
              {isProcessing
                ? 'Verifying payment…'
                : checkoutLoading
                  ? gateway === 'stripe'
                    ? 'Opening Stripe Checkout…'
                    : 'Opening Razorpay…'
                  : configLoading
                    ? 'Checking payment gateways…'
                    : noGatewayConfigured
                      ? 'Payment gateway not configured'
                      : gateway === 'stripe'
                    ? 'Pay securely with Stripe'
                    : `Pay with Razorpay · ${paymentModes.find((m) => m.id === selectedMode)?.label}`}
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-medical-100 bg-white/80 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-medical-600" size={18} />
              <p>
                Payments are verified server-side (Stripe session status or Razorpay HMAC) before your
                appointment token is created. No manual proof uploads required.
              </p>
            </div>
          </div>
        </section>

        <aside className="glass rounded-2xl p-6 dark:border-slate-700 dark:bg-slate-900/40">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Booking summary</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
            {summary.map(([label, value]) => (
              <p key={label} className="text-wrap-anywhere">
                <strong>{label}:</strong> {value}
              </p>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-medical-50 p-4 text-sm text-medical-800 dark:bg-medical-950/50 dark:text-medical-200">
            <CreditCard className="mb-2" size={18} />
            Token and invoice are generated automatically after verified payment.
          </div>
        </aside>
      </div>
    </>
  );
}
