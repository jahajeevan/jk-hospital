import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PremiumPaymentSection from '../features/payment-verification/components/PremiumPaymentSection.jsx';

const BOOKING_KEY = 'jk_pending_payment_booking';

export default function PaymentPage() {
  const { state } = useLocation();
  const { user } = useAuth();
  const [booking, setBooking] = useState(() => {
    if (state) return state;
    try {
      return JSON.parse(sessionStorage.getItem(BOOKING_KEY));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (state) {
      sessionStorage.setItem(BOOKING_KEY, JSON.stringify(state));
      setBooking(state);
    }
  }, [state]);

  if (!booking) {
    return (
      <main className="container-pad py-20">
        <div className="glass rounded-lg p-8 dark:border-slate-700 dark:bg-slate-900/50">
          Choose an appointment slot before payment.
        </div>
      </main>
    );
  }

  return (
    <main className="hospital-bg min-h-[calc(100vh-4rem)] py-12">
      <PremiumPaymentSection booking={booking} user={user} />
    </main>
  );
}
