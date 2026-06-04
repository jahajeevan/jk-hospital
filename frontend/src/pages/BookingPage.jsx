import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Bot, Calendar, CheckCircle2, Clock3, CreditCard, IndianRupee, Loader2, Lock, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { formatApiError } from '../api/client.js';
import AiVisitPrep from '../components/AiVisitPrep.jsx';
import BookingStepper from '../components/BookingStepper.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getLocalDoctors, getSlotAvailability } from '../utils/localStore.js';
import { normalizeFee } from '../utils/paymentRules.js';
import { cleanIndianMobile, isValidIndianMobile } from '../utils/validation.js';

const localIsoDate = (value = new Date()) => {
  const offsetDate = new Date(value.getTime() - value.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().slice(0, 10);
};
const today = localIsoDate();
const STEPS = ['Doctor', 'Date & slot', 'Patient', 'Review'];
const slotBlockedMessage = (reason) =>
  `${reason || 'Selected slot is not bookable now'}. Please choose another slot, another date, or book for the next day.`;
const failValidation = (message) => {
  toast.error(message);
  return false;
};
const stepIndex = {
  doctor: 0,
  slot: 1,
  patient: 2,
  review: 3
};

export default function BookingPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [doctors, setDoctors] = useState(() => getLocalDoctors());
  const [doctorId, setDoctorId] = useState(() => state?.doctorId || getLocalDoctors()[0]?._id);
  const [date, setDate] = useState(today);
  const [slotId, setSlotId] = useState('');
  const [patient, setPatient] = useState({ name: user?.name || '', age: '', gender: '', phone: '', symptoms: '' });
  const [aiRequest, setAiRequest] = useState('');
  const [aiBookingLoading, setAiBookingLoading] = useState(false);

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
  const slot = slots.find((item) => item._id === slotId);
  const availability = useMemo(() => getSlotAvailability(doctor, slot?._id, date), [doctor, slot?._id, date]);
  const boundedSlotDates = (doctor?.slots || []).filter((item) => item.isActive !== false && item.availableUntil);
  const maxBookingDate = boundedSlotDates.length && boundedSlotDates.length === (doctor?.slots || []).filter((item) => item.isActive !== false).length
    ? boundedSlotDates.map((item) => item.availableUntil).sort().at(-1)
    : undefined;
  const consultationFee = normalizeFee(slot?.fee, doctor?.fee);
  const showPrice = step >= 1 && Boolean(slot?._id);
  const paymentBlocked = !slot || !availability.isBookable || availability.isFull;
  const paymentBlockedReason = !slot ? 'Select an available OP slot' : availability.reasons?.[0] || (availability.isFull ? 'Selected slot is full' : 'Selected slot is not bookable now');

  useEffect(() => {
    if (slotId && !slots.some((item) => item._id === slotId)) setSlotId('');
  }, [slotId, slots]);

  const validateStep = (targetStep = step) => {
    if (targetStep === stepIndex.doctor) {
      if (!doctor) return failValidation('Select a doctor');
      if (doctor.isAvailable === false) return failValidation('Selected doctor is currently on leave');
    }
    if (targetStep === stepIndex.slot) {
      if (!date) return failValidation('Select appointment date');
      if (new Date(date) < new Date(today)) return failValidation('Appointment date cannot be in the past');
      if (!slots.length) return failValidation('No slots for this date');
      if (!slot) return failValidation('Select an available OP slot before continuing');
      if (paymentBlocked) return failValidation(slotBlockedMessage(paymentBlockedReason));
    }
    if (targetStep === stepIndex.patient) {
      if (!patient.name?.trim()) return failValidation('Enter patient name');
      if (!patient.age || Number(patient.age) < 1 || Number(patient.age) > 120) return failValidation('Enter a valid age from 1 to 120');
      if (!patient.gender) return failValidation('Select gender');
      if (!isValidIndianMobile(patient.phone)) return failValidation('Enter valid 10-digit Indian mobile number');
      if (patient.symptoms.trim().length < 3) return failValidation('Describe symptoms or reason for visit');
    }
    return true;
  };

  const validateBooking = () => {
    for (const targetStep of [stepIndex.doctor, stepIndex.slot, stepIndex.patient]) {
      if (!validateStep(targetStep)) {
        setStep(targetStep);
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const back = () => setStep((value) => Math.max(value - 1, 0));

  const submit = () => {
    if (!validateBooking()) return;
    navigate('/payment', { state: { doctor, slot, date, patient, remaining: availability.remaining } });
  };

  const applyAiBooking = async () => {
    const text = aiRequest.trim();
    if (text.length < 4) return toast.error('Tell AI what appointment you want, for example: dermatologist tomorrow evening.');
    setAiBookingLoading(true);
    try {
      const { data } = await api.post('/ai/appointment-assist', { message: text });
      const result = data.result || {};
      const matchedDoctor = doctors.find((item) =>
        `${item.name} ${item.specialty}`.toLowerCase().includes(String(result.specialization || '').toLowerCase())
      );
      if (matchedDoctor) {
        setDoctorId(matchedDoctor._id);
        const activeSlots = (matchedDoctor.slots || []).filter((item) => item.isActive !== false);
        const preferred = activeSlots.find((item) => `${item.label} ${item.startTime} ${item.endTime}`.toLowerCase().includes(result.timePreference));
        const candidate = preferred || activeSlots.find((item) => getSlotAvailability(matchedDoctor, item._id, result.date || date).isBookable);
        setSlotId(candidate?._id || '');
      }
      if (result.date) setDate(result.date);
      if (result.symptoms) setPatient((current) => ({ ...current, symptoms: result.symptoms }));
      toast.success(result.patientMessage || 'AI filled the appointment details. Please review before continuing.');
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setAiBookingLoading(false);
    }
  };

  return (
    <main className="booking-experience-page min-h-[calc(100vh-4rem)] py-10">
      <div className="container-pad">
        <section className="booking-hero-panel">
          <div>
            <span className="live-badge">Appointment booking</span>
            <h1>Book your hospital token</h1>
            <p>Choose a doctor, pick a valid OP slot, add patient details, and confirm with a live queue summary.</p>
          </div>
          <div className="booking-rule-card">
            <Clock3 size={22} />
            <strong>60-minute rule</strong>
            <span>Same-day tokens close one hour before the selected slot starts.</span>
          </div>
        </section>

        <div className="booking-ai-strip">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3 lg:w-72">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-medical-600 text-white"><Bot size={20} /></span>
              <div>
                <p className="flex items-center gap-2 font-bold text-ink"><Sparkles size={16} className="text-medical-600" /> AI appointment assistant</p>
                <p className="text-sm text-slate-500">Describe the appointment and Gemma3 will prefill what it can.</p>
              </div>
            </div>
            <input
              className="field flex-1"
              value={aiRequest}
              onChange={(event) => setAiRequest(event.target.value)}
              placeholder="Book dermatologist tomorrow evening"
            />
                <button type="button" onClick={applyAiBooking} disabled={aiBookingLoading} className="btn-primary w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto">
              {aiBookingLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Autofill
            </button>
          </div>
        </div>

        <div className="mt-8 booking-stepper-wrap">
          <BookingStepper steps={STEPS} current={step} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="booking-main-card">
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
                          disabled={item.isAvailable === false}
                          onClick={() => {
                            setDoctorId(item._id);
                            setSlotId('');
                          }}
                          className={`booking-select-card text-left transition ${doctorId === item._id ? 'active' : ''} ${item.isAvailable === false ? 'cursor-not-allowed opacity-60' : ''}`}
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
                    <input type="date" min={today} max={maxBookingDate} className="field mt-4" value={date} onChange={(e) => { setDate(e.target.value); setSlotId(''); }} />
                    <p className="mt-2 text-xs text-slate-500">
                      Booking opens on today by default. Future tokens are available only until the admin-configured slot date.
                    </p>
                    <div className="mt-4 grid gap-3">
                      {slots.map((item) => {
                        const info = getSlotAvailability(doctor, item._id, date);
                        return (
                          <button
                            key={item._id}
                            type="button"
                            onClick={() => {
                              if (!info.isBookable || info.isFull) {
                                toast.error(slotBlockedMessage(info.reasons?.[0] || (info.isFull ? 'Selected slot is full' : 'Selected slot is not bookable now')));
                                setSlotId('');
                                return;
                              }
                              setSlotId(item._id);
                            }}
                            className={`booking-slot-card ${slotId === item._id ? 'active' : ''} ${!info.isBookable || info.isFull ? 'locked' : ''}`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                              <span className="text-wrap-anywhere font-bold">{item.label}</span>
                              <span className={info.remaining && info.isBookable ? 'text-emerald-600' : 'text-rose-600'}>
                                {info.remaining && info.isBookable ? `${info.remaining} left` : <span className="inline-flex items-center gap-1"><Lock size={13} /> Locked</span>}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{item.startTime} – {item.endTime}</p>
                            <p className="text-wrap-anywhere mt-1 text-xs text-slate-500">
                              Available {item.availableFrom || 'today'} to {item.availableUntil || 'until changed'} · book {item.advanceBookingMinutes ?? 60} min before start
                            </p>
                            <p className="mt-1 text-xs text-slate-400">Est. wait ~{info.estimatedWaitMinutes} min if you book now</p>
                            {info.reasons?.[0] ? <p className="mt-2 text-xs font-bold text-amber-700">{info.reasons[0]}</p> : null}
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
                      <input className="field" type="number" min="1" max="120" required placeholder="Age" value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} />
                      <select className="field" value={patient.gender} onChange={(e) => setPatient({ ...patient, gender: e.target.value })}>
                        <option value="">Gender</option>
                        <option>Female</option>
                        <option>Male</option>
                        <option>Other</option>
                      </select>
                      <input className="field sm:col-span-2" inputMode="numeric" maxLength={10} required placeholder="10-digit mobile" value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: cleanIndianMobile(e.target.value) })} />
                      <textarea className="field sm:col-span-2" rows={4} required placeholder="Symptoms / reason for visit" value={patient.symptoms} onChange={(e) => setPatient({ ...patient, symptoms: e.target.value })} />
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
                        ['Slot', slot ? `${slot.label} (${slot.startTime}–${slot.endTime})` : 'No slot selected'],
                        ['Patient', patient.name],
                        ['Phone', patient.phone],
                        ['Fee', `INR ${consultationFee}`]
                      ].map(([label, value]) => (
                        <li key={label} className="booking-review-row flex flex-col gap-1 rounded-lg px-4 py-3 sm:flex-row sm:justify-between sm:gap-4">
                          <span className="text-slate-500">{label}</span>
                          <span className="text-wrap-anywhere font-bold sm:text-right">{value}</span>
                        </li>
                      ))}
                    </ul>
                    {paymentBlocked ? (
                      <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm font-semibold text-amber-900">
                        <Calendar className="mt-0.5 shrink-0" size={18} />
                        {slotBlockedMessage(paymentBlockedReason)}
                      </p>
                    ) : (
                      <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50/80 p-3 text-sm text-emerald-800">
                        <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                        You will pay via Razorpay next. Token is issued only after payment verification.
                      </p>
                    )}
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
                <button
                  type="button"
                  onClick={submit}
                  aria-disabled={paymentBlocked}
                  className={`btn-primary ${paymentBlocked ? 'cursor-not-allowed opacity-70 grayscale-[0.2]' : ''}`}
                >
                  <CreditCard size={16} /> Proceed to payment
                </button>
              )}
            </div>
          </section>

          <aside className="booking-summary-sticky">
            <p className="text-xs font-bold uppercase tracking-wider text-medical-600">Live summary</p>
            <h3 className="text-wrap-anywhere mt-2 text-2xl font-bold">{doctor?.name || '—'}</h3>
            <p className="text-wrap-anywhere text-sm text-slate-500">{doctor?.specialty}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              <motion.div className="liquid-stat rounded-lg p-3"><p className="text-lg font-bold">{slot?.tokenLimit || 0}</p><p className="text-slate-500">Total</p></motion.div>
              <motion.div className="liquid-stat rounded-lg p-3"><p className="text-lg font-bold">{availability.booked}</p><p className="text-slate-500">Booked</p></motion.div>
              <motion.div className="liquid-stat rounded-lg p-3"><p className="text-lg font-bold">{availability.remaining}</p><p className="text-slate-500">Left</p></motion.div>
            </div>
            {showPrice ? (
              <>
                <p className="mt-4 flex items-center gap-2 text-lg font-bold text-medical-700">
                  <IndianRupee size={20} /> {consultationFee}
                </p>
                <p className="text-wrap-anywhere mt-1 text-xs text-slate-500">Consultation fee for {slot?.label}</p>
              </>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Select date & slot to see the consultation fee.</p>
            )}
            <p className="mt-2 text-sm text-slate-500">Queue estimate: ~{availability.estimatedWaitMinutes} minutes</p>
            {availability.reasons?.length ? <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{availability.reasons[0]}</p> : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
