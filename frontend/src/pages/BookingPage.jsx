import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, CreditCard, IndianRupee, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import AiVisitPrep from '../components/AiVisitPrep.jsx';
import BookingStepper from '../components/BookingStepper.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getLocalDoctors, getSlotAvailability } from '../utils/localStore.js';
import { normalizeFee } from '../utils/paymentRules.js';

const today = new Date().toISOString().slice(0, 10);
const STEPS = ['Doctor', 'Date & slot', 'Patient', 'Review'];

export default function BookingPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [doctors, setDoctors] = useState(() => getLocalDoctors());
  const [doctorId, setDoctorId] = useState(() => state?.doctorId || getLocalDoctors()[0]?._id);
  const [date, setDate] = useState(today);
  const [slotId, setSlotId] = useState(() => getLocalDoctors()[0]?.slots[0]?._id);
  const [patient, setPatient] = useState({ name: user?.name || '', age: '', gender: '', phone: '', symptoms: '' });

  useEffect(() => {
    const sync = () => setDoctors(getLocalDoctors());
    sync();
    window.addEventListener('jk-local-sync', sync);
    return () => window.removeEventListener('jk-local-sync', sync);
  }, []);

  useEffect(() => {
    if (state?.doctorId) setDoctorId(state.doctorId);
  }, [state?.doctorId]);

  const doctor = doctors.find((item) => item._id === doctorId) || doctors[0];
  const slots = (doctor?.slots || []).filter((item) => item.isActive !== false && (!item.date || item.date === date));
  const slot = slots.find((item) => item._id === slotId) || slots[0];
  const availability = useMemo(() => getSlotAvailability(doctor, slot?._id, date), [doctor, slot?._id, date]);
  const consultationFee = normalizeFee(slot?.fee, doctor?.fee);
  const showPrice = step >= 1 && Boolean(slot?._id);

  useEffect(() => {
    if (slots.length && !slots.some((item) => item._id === slotId)) setSlotId(slots[0]._id);
  }, [slotId, slots]);

  const validateStep = () => {
    if (step === 0 && !doctor) return toast.error('Select a doctor');
    if (step === 1) {
      if (!slots.length) return toast.error('No slots for this date');
      if (availability.isFull) return toast.error('Selected slot is full');
    }
    if (step === 2) {
      if (!patient.name?.trim()) return toast.error('Enter patient name');
      if (!patient.age) return toast.error('Enter age');
      if (!patient.gender) return toast.error('Select gender');
      if (!/^[6-9]\d{9}$/.test(patient.phone)) return toast.error('Enter valid 10-digit phone');
      if (!patient.symptoms?.trim()) return toast.error('Describe symptoms');
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const back = () => setStep((value) => Math.max(value - 1, 0));

  const submit = () => {
    if (availability.isFull) return toast.error('Slot is full');
    navigate('/payment', { state: { doctor, slot, date, patient, remaining: availability.remaining } });
  };

  return (
    <main className="hospital-bg min-h-[calc(100vh-4rem)] py-10">
      <div className="container-pad">
        <span className="live-badge">Appointment booking</span>
        <h1 className="mt-4 text-4xl font-bold">Book your hospital token</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Complete each step — your summary updates live on the right.</p>

        <div className="mt-8">
          <BookingStepper steps={STEPS} current={step} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="glass rounded-xl p-6">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                {step === 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold"><UserRound size={20} /> Choose doctor</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {doctors.map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => {
                            setDoctorId(item._id);
                            const nextSlot = item.slots.find((s) => s.isActive !== false);
                            if (nextSlot) setSlotId(nextSlot._id);
                          }}
                          className={`rounded-xl border p-4 text-left transition ${doctorId === item._id ? 'border-medical-500 bg-medical-50 ring-2 ring-medical-200' : 'border-slate-200 bg-white hover:border-medical-300'}`}
                        >
                          <p className="font-bold">{item.name}</p>
                          <p className="text-sm text-medical-600">{item.specialty}</p>
                          <p className="mt-2 text-xs text-slate-500">{item.isAvailable === false ? 'On leave' : 'Available today'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold"><Calendar size={20} /> Date & OP slot</h2>
                    <input type="date" min={today} className="field mt-4" value={date} onChange={(e) => setDate(e.target.value)} />
                    <div className="mt-4 grid gap-3">
                      {slots.map((item) => {
                        const info = getSlotAvailability(doctor, item._id, date);
                        return (
                          <button
                            key={item._id}
                            type="button"
                            onClick={() => setSlotId(item._id)}
                            className={`rounded-xl border p-4 text-left ${slotId === item._id ? 'border-medical-500 bg-medical-50' : 'border-slate-200 bg-white'}`}
                          >
                            <div className="flex justify-between gap-2">
                              <span className="font-bold">{item.label}</span>
                              <span className={info.remaining ? 'text-emerald-600' : 'text-rose-600'}>{info.remaining ? `${info.remaining} left` : 'Full'}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{item.startTime} – {item.endTime}</p>
                            <p className="mt-1 text-xs text-slate-400">Est. wait ~{info.estimatedWaitMinutes} min if you book now</p>
                          </button>
                        );
                      })}
                      {!slots.length && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">No active slots for this date. Pick another date.</p>}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="text-xl font-bold">Patient details</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input className="field sm:col-span-2" placeholder="Patient full name" value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} />
                      <input className="field" type="number" min="0" max="120" placeholder="Age" value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} />
                      <select className="field" value={patient.gender} onChange={(e) => setPatient({ ...patient, gender: e.target.value })}>
                        <option value="">Gender</option>
                        <option>Female</option>
                        <option>Male</option>
                        <option>Other</option>
                      </select>
                      <input className="field sm:col-span-2" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                      <textarea className="field sm:col-span-2" rows={4} placeholder="Symptoms / reason for visit" value={patient.symptoms} onChange={(e) => setPatient({ ...patient, symptoms: e.target.value })} />
                    </div>
                    <AiVisitPrep patient={patient} doctor={doctor} slot={slot} appointmentDate={date} />
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h2 className="text-xl font-bold">Review & confirm</h2>
                    <ul className="mt-4 space-y-3 text-sm">
                      {[
                        ['Doctor', doctor?.name],
                        ['Specialty', doctor?.specialty],
                        ['Date', date],
                        ['Slot', `${slot?.label} (${slot?.startTime}–${slot?.endTime})`],
                        ['Patient', patient.name],
                        ['Phone', patient.phone],
                        ['Fee', `INR ${consultationFee}`]
                      ].map(([label, value]) => (
                        <li key={label} className="flex justify-between gap-4 rounded-lg bg-white px-4 py-3 ring-1 ring-slate-100">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-bold text-right">{value}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                      You will pay via Razorpay next. Token is issued only after payment verification.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex flex-wrap gap-3">
              {step > 0 && (
                <button type="button" onClick={back} className="btn-secondary">
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} className="btn-primary">
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={submit} className="btn-primary" disabled={availability.isFull}>
                  <CreditCard size={16} /> Proceed to payment
                </button>
              )}
            </div>
          </section>

          <aside className="booking-summary-sticky">
            <p className="text-xs font-bold uppercase tracking-wider text-medical-600">Live summary</p>
            <h3 className="mt-2 text-2xl font-bold">{doctor?.name || '—'}</h3>
            <p className="text-sm text-slate-500">{doctor?.specialty}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              <motion.div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-bold">{slot?.tokenLimit || 0}</p><p className="text-slate-500">Total</p></motion.div>
              <motion.div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-bold">{availability.booked}</p><p className="text-slate-500">Booked</p></motion.div>
              <motion.div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-bold">{availability.remaining}</p><p className="text-slate-500">Left</p></motion.div>
            </div>
            {showPrice ? (
              <>
                <p className="mt-4 flex items-center gap-2 text-lg font-bold text-medical-700">
                  <IndianRupee size={20} /> {consultationFee}
                </p>
                <p className="mt-1 text-xs text-slate-500">Consultation fee for {slot?.label}</p>
              </>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Select date & slot to see the consultation fee.</p>
            )}
            <p className="mt-2 text-sm text-slate-500">Queue estimate: ~{availability.estimatedWaitMinutes} minutes</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
