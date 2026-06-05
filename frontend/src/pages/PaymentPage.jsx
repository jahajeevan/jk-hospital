import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PremiumPaymentSection from '../features/payment-verification/components/PremiumPaymentSection.jsx';
import { getSlotAvailability } from '../utils/localStore.js';
import { isValidIndianMobile } from '../utils/validation.js';

const BOOKING_KEY = 'jk_pending_payment_booking';

const getBookingProblem = (booking) => {
  if (!booking) return 'Choose an appointment slot before payment.';
  if (!booking.doctor?._id) return 'Select a doctor before payment.';
  if (!booking.date) return 'Select an appointment date before payment.';
  if (!booking.slot?._id) return 'Select an available OP slot before payment.';
  if (!booking.patient?.name?.trim()) return 'Enter patient name before payment.';
  if (!booking.patient?.age || Number(booking.patient.age) < 1 || Number(booking.patient.age) > 120) return 'Enter a valid patient age before payment.';
  if (!booking.patient?.gender) return 'Select patient gender before payment.';
  if (!isValidIndianMobile(booking.patient?.phone)) return 'Enter a valid 10-digit mobile number before payment.';
  if (String(booking.patient?.symptoms || '').trim().length < 3) return 'Describe symptoms or reason for visit before payment.';

  const availability = getSlotAvailability(booking.doctor, booking.slot._id, booking.date);
  if (!availability.slot || availability.isFull || !availability.isBookable) {
    return availability.reasons?.[0] || (availability.isFull ? 'Selected slot is full.' : 'Selected slot is not bookable now.');
  }
  return '';
};

export default function PaymentPage() {
  const { state } = useLocation();
  const { user } = useAuth();
  const [booking, setBooking] = useState(() => {
    if (state) return state;
    try {
      return JSON.parse(localStorage.getItem(BOOKING_KEY));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (state) {
      localStorage.setItem(BOOKING_KEY, JSON.stringify(state));
      setBooking(state);
    }
  }, [state]);

  const bookingProblem = getBookingProblem(booking);

  if (bookingProblem) {
    return (
      <main className="container-pad py-20">
        <div className="glass mx-auto max-w-xl rounded-lg p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <h1 className="text-2xl font-bold text-ink">Booking details needed</h1>
          <p className="mt-3 text-wrap-anywhere text-sm text-slate-600">{bookingProblem}</p>
          <Link to="/book" className="btn-primary mt-6 inline-flex">
            Return to booking
          </Link>
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
