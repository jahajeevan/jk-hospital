/**
 * Animated verification status — processing, success, failure.
 */

import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * @param {{ status: 'idle' | 'processing' | 'success' | 'failure', message?: string }} props
 */
export default function VerificationStatusDisplay({ status, message = '' }) {
  if (status === 'idle') return null;

  const statusClass =
    status === 'success'
      ? 'pv-status-success'
      : status === 'failure'
        ? 'pv-status-failure'
        : 'pv-status-processing';

  const ringColor =
    status === 'success'
      ? 'bg-emerald-400/30'
      : status === 'failure'
        ? 'bg-rose-400/30'
        : 'bg-medical-400/30';

  const iconBg =
    status === 'success'
      ? 'bg-emerald-500 text-white'
      : status === 'failure'
        ? 'bg-rose-500 text-white'
        : 'bg-medical-600 text-white';

  return (
    <div
      className={`mt-6 rounded-2xl border p-5 transition-all ${statusClass} ${
        status === 'success'
          ? 'border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/40'
          : status === 'failure'
            ? 'border-rose-200/80 bg-rose-50/90 dark:border-rose-800 dark:bg-rose-950/40'
            : 'border-medical-200/80 bg-medical-50/90 dark:border-medical-800 dark:bg-slate-900/50'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center">
          <span className={`absolute h-16 w-16 rounded-full ${ringColor}`} />
          <span className={`relative grid h-14 w-14 place-items-center rounded-full ${iconBg} pv-icon-wrap`}>
            {status === 'processing' && <Loader2 size={28} className="pv-spinner" />}
            {status === 'success' && (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  className="pv-check-path"
                  d="M6 12.5l4 4 8-9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {status === 'failure' && <AlertCircle size={28} />}
          </span>
        </div>
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">
            {status === 'processing' && 'Verifying payment'}
            {status === 'success' && 'Payment verified'}
            {status === 'failure' && 'Verification failed'}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {status === 'processing' &&
              'Confirming with secure payment gateway and generating your appointment token…'}
            {status === 'success' && 'Your consultation fee was received. Redirecting to your token…'}
            {status === 'failure' && (message || 'Please try again or choose another payment method.')}
          </p>
        </div>
      </div>
    </div>
  );
}
