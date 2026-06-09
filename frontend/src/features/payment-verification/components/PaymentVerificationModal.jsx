/**
 * Glassmorphism overlay shown during payment verification (processing / result).
 */

import { AnimatePresence, motion } from 'framer-motion';
import SuccessConfetti from './SuccessConfetti.jsx';
import VerificationStatusDisplay from './VerificationStatusDisplay.jsx';

/**
 * @param {{
 *   open: boolean,
 *   status: 'idle' | 'processing' | 'success' | 'failure',
 *   message?: string,
 *   volume?: number,
 *   onVolumeChange?: (v: number) => void,
 *   voiceEnabled?: boolean,
 *   onVoiceToggle?: (v: boolean) => void
 * }} props
 */
export default function PaymentVerificationModal({
  open,
  status,
  message = '',
  volume = 0.85,
  onVolumeChange,
  voiceEnabled = false,
  onVoiceToggle
}) {
  const show = open && status !== 'idle';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          aria-label="Payment verification"
        >
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm dark:bg-black/55" />
          <motion.div
            className="pv-modal-glass relative w-full max-w-md overflow-hidden rounded-3xl p-6 dark:text-slate-100"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <SuccessConfetti active={status === 'success'} />
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-medical-600 dark:text-medical-300">
              Secure verification
            </p>
            <h2 className="mt-2 text-center text-2xl font-bold text-slate-900 dark:text-white">
              {status === 'processing' && 'Processing payment'}
              {status === 'success' && 'All set!'}
              {status === 'failure' && 'Something went wrong'}
            </h2>
            <VerificationStatusDisplay status={status} message={message} />
            {(onVolumeChange || onVoiceToggle) && (
              <div className="mt-5 space-y-3 rounded-xl border border-slate-200/60 bg-white/50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/40">
                {onVolumeChange && (
                  <label className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-slate-600 dark:text-slate-400">Volume</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => onVolumeChange(Number(e.target.value))}
                      className="h-2 flex-1 accent-medical-600"
                    />
                  </label>
                )}
                {onVoiceToggle && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => onVoiceToggle(e.target.checked)}
                      className="rounded border-slate-300 text-medical-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Voice feedback</span>
                  </label>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
