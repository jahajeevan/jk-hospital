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
 *   message?: string
 * }} props
 */
export default function PaymentVerificationModal({
  open,
  status,
  message = ''
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
