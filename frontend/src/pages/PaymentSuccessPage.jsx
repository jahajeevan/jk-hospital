import { motion } from 'framer-motion';
import { Download, LayoutDashboard } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import SuccessConfetti from '../features/payment-verification/components/SuccessConfetti.jsx';
import { triggerElectronHaptic } from '../features/payment-verification/utils/haptics.js';
import { downloadInvoice } from '../utils/invoice.js';

const LAST_CONFIRMED_APPOINTMENT_KEY = 'jk_last_confirmed_appointment';

const providerLabel = (method) => {
  if (method === 'stripe') return 'Stripe';
  if (method === 'razorpay') return 'Razorpay';
  return 'Online payment';
};

export default function PaymentSuccessPage() {
  const { state } = useLocation();
  const appointment = state?.appointment;

  useEffect(() => {
    triggerElectronHaptic('success');
    if (!appointment) return;
    try {
      sessionStorage.setItem(LAST_CONFIRMED_APPOINTMENT_KEY, JSON.stringify(appointment));
      window.dispatchEvent(new Event('jk-appointment-confirmed'));
    } catch {
      /* Session persistence is only a dashboard convenience. */
    }
  }, [appointment]);

  if (!appointment) return <Navigate to="/book" replace />;

  const gateway = providerLabel(appointment.payment?.method);

  return (
    <main className="hospital-bg min-h-[calc(100vh-4rem)] py-12">
      <section className="container-pad">
        <motion.div
          className="glass relative mx-auto max-w-3xl overflow-hidden rounded-2xl p-8 text-center dark:border-slate-700 dark:bg-slate-900/50"
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <SuccessConfetti active />
          <div className="token-card relative z-10 mx-auto max-w-md p-6 text-left">
            <p className="text-sm uppercase tracking-[0.2em] text-white/80">JK Hospital token</p>
            <p className="text-wrap-anywhere mt-2 text-4xl font-bold sm:text-5xl">#{appointment.tokenNumber}</p>
            <p className="text-wrap-anywhere mt-3 text-white/90">{appointment.doctor?.name}</p>
            <p className="text-wrap-anywhere text-sm text-white/75">
              {appointment.slotLabel} · {appointment.appointmentDate}
            </p>
          </div>
          <p className="mt-8 font-semibold text-emerald-600 dark:text-emerald-400">
            Payment verified by {gateway}
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl" style={{ background: 'linear-gradient(115deg,#0a528f,#147bd1 45%,#10b981)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Appointment confirmed</h1>
          <div className="mt-8 grid gap-3 rounded-xl bg-white p-5 text-left text-sm shadow-lg dark:bg-slate-800/80 sm:grid-cols-2">
            <p className="text-wrap-anywhere">
              <strong>Doctor:</strong> {appointment.doctor?.name}
            </p>
            <p className="text-wrap-anywhere">
              <strong>Slot:</strong> {appointment.slotLabel}
            </p>
            <p className="text-wrap-anywhere">
              <strong>Invoice:</strong> {appointment.invoiceNumber}
            </p>
            <p>
              <strong>Amount:</strong> INR {appointment.payment?.amount}
            </p>
            <p className="text-wrap-anywhere sm:col-span-2">
              <strong>Transaction:</strong> {appointment.payment?.transactionId}
            </p>
          </div>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => downloadInvoice(appointment)} className="btn-secondary">
              <Download size={18} /> Download invoice
            </button>
            <Link to="/dashboard" className="btn-primary">
              <LayoutDashboard size={18} /> Go to dashboard
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
