import { motion } from 'framer-motion';
import { CalendarPlus, Eye, Image, LockKeyhole, MailCheck, Plus, ShieldCheck, Stethoscope, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/client.js';
import MetricCard from '../components/MetricCard.jsx';
import { closeAdminSession, isAdminSessionOpen, openAdminSession, verifyAdminCredential } from '../utils/adminAuth.js';
import {
  addLocalDoctor,
  addLocalSlot,
  getLocalBookings,
  getLocalDoctors,
  getLocalRefunds,
  saveLocalDoctor,
  saveLocalSlot,
  updateLocalBookingStatus,
  updateLocalRefundStatus
} from '../utils/localStore.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { MIN_CONSULTATION_FEE, normalizeFee } from '../utils/paymentRules.js';

const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const palette = ['#147bd1', '#10b981', '#f59e0b', '#e05283'];

export default function AdminDashboard() {
  const [unlocked, setUnlocked] = useState(() => isAdminSessionOpen());
  const [password, setPassword] = useState('');
  const [selectedProof, setSelectedProof] = useState(null);
  const [overview, setOverview] = useState({ stats: { appointments: 0, patients: 0, pendingRefunds: 0, revenue: 0 } });
  const [bookings, setBookings] = useState([]);
  const [doctorList, setDoctorList] = useState(() => getLocalDoctors());
  const [adminTab, setAdminTab] = useState('overview');
  const [bookingQuery, setBookingQuery] = useState('');
  const [refunds, setRefunds] = useState([]);

  useEffect(() => {
    const loadLocal = () => {
      const localBookings = getLocalBookings();
      const localDoctors = getLocalDoctors();
      setBookings(localBookings);
      setDoctorList(localDoctors);
      const localRefunds = getLocalRefunds();
      setRefunds(localRefunds);
      setOverview({
        stats: {
          appointments: localBookings.length,
          patients: new Set(localBookings.map((item) => item.patientEmail)).size,
          pendingRefunds: localRefunds.filter((item) => item.status === 'pending').length,
          revenue: localBookings.filter((item) => item.status === 'approved').reduce((sum, item) => sum + (item.payment?.amount || 0), 0)
        }
      });
    };
    loadLocal();
    window.addEventListener('storage', loadLocal);
    window.addEventListener('jk-local-sync', loadLocal);
    return () => {
      window.removeEventListener('storage', loadLocal);
      window.removeEventListener('jk-local-sync', loadLocal);
    };
  }, []);

  const occupancy = useMemo(
    () => doctorList.map((doctor) => ({ name: doctor.name.replace('Dr. ', ''), tokens: doctor.slots.reduce((sum, slot) => sum + (slot.bookedTokens || 0), 0) })),
    [doctorList]
  );

  const dailyBookings = useMemo(() => {
    const base = weekLabels.map((name) => ({ name, bookings: 0 }));
    bookings.forEach((booking) => {
      const day = new Date(booking.createdAt || Date.now()).getDay();
      base[day].bookings += 1;
    });
    return base;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const q = bookingQuery.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((booking) =>
      [booking.patientDetails?.name, booking.patientName, booking.patientEmail, booking.doctor?.name, booking.slotLabel, booking.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [bookings, bookingQuery]);

  const statusBreakdown = useMemo(() => {
    const counts = { payment_submitted: 0, approved: 0, declined: 0, cancelled: 0 };
    bookings.forEach((booking) => {
      counts[booking.status] = (counts[booking.status] || 0) + 1;
    });
    return [
      { name: 'Pending', value: counts.payment_submitted },
      { name: 'Accepted', value: counts.approved },
      { name: 'Declined', value: counts.declined },
      { name: 'Cancelled', value: counts.cancelled }
    ];
  }, [bookings]);

  const markLeave = async (doctor) => {
    const nextDoctor = { ...doctor, isAvailable: false };
    saveLocalDoctor(nextDoctor);
    setDoctorList(getLocalDoctors());
    try {
      await api.patch(`/admin/doctors/${doctor._id}/leave`, { date: new Date().toISOString() });
      toast.success('Doctor leave mode enabled and patients notified');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Demo leave mode enabled');
    }
  };

  const login = async (event) => {
    event.preventDefault();
    try {
      const valid = await verifyAdminCredential(password);
      if (!valid) {
        toast.error('Wrong admin password');
        return;
      }
      openAdminSession();
      setUnlocked(true);
      setPassword('');
      toast.success('Admin dashboard unlocked');
    } catch (error) {
      toast.error(error.message || 'Could not unlock admin panel');
    }
  };

  const persistDoctor = async (doctor) => {
    saveLocalDoctor(doctor);
    setDoctorList(getLocalDoctors());
    try {
      await api.put(`/admin/doctors/${doctor._id}`, doctor);
    } catch {
      // Local admin mode still works when the backend is unavailable or the admin is not signed in with an API token.
    }
  };

  const updateDoctor = async (doctorId, field, value) => {
    const nextDoctors = doctorList.map((doctor) =>
      doctor._id === doctorId
        ? {
            ...doctor,
            [field]: field === 'fee' ? normalizeFee(value) : value
          }
        : doctor
    );
    setDoctorList(nextDoctors);
    await persistDoctor(nextDoctors.find((doctor) => doctor._id === doctorId));
  };

  const updateSlot = async (doctorId, slotId, field, value) => {
    const doctor = doctorList.find((item) => item._id === doctorId);
    const current = doctor?.slots.find((slot) => slot._id === slotId);
    if (!doctor || !current) return;
    const numericFields = ['fee', 'tokenLimit', 'bookedTokens'];
    const nextValue = numericFields.includes(field) ? Math.max(Number(value), 0) : value;
    const nextSlot = {
      ...current,
      [field]: field === 'fee' ? normalizeFee(nextValue, doctor.fee) : nextValue
    };
    if (field === 'tokenLimit') {
      nextSlot.bookedTokens = Math.min(nextSlot.bookedTokens || 0, nextSlot.tokenLimit);
    }
    saveLocalSlot(doctorId, nextSlot);
    setDoctorList(getLocalDoctors());
  };

  const updateRemaining = (doctorId, slotId, value) => {
    const doctor = doctorList.find((item) => item._id === doctorId);
    const slot = doctor?.slots.find((item) => item._id === slotId);
    if (!slot) return;
    const remaining = Math.max(Number(value), 0);
    updateSlot(doctorId, slotId, 'bookedTokens', Math.max((slot.tokenLimit || 0) - remaining, 0));
  };

  const createDoctor = () => {
    const doctor = addLocalDoctor();
    setDoctorList(getLocalDoctors());
    toast.success(`${doctor.name} added`);
  };

  const createSlot = (doctorId, date = '') => {
    addLocalSlot(doctorId, date);
    setDoctorList(getLocalDoctors());
    toast.success(date ? 'Date-specific slot added' : 'Slot added');
  };

  const decide = async (booking, status) => {
    if (booking.status === 'approved' && status === 'approved') {
      toast.error('This token is already accepted');
      return;
    }
    const adminNote = status === 'approved'
      ? 'Payment proof verified. Token accepted by JK Hospital staff.'
      : 'Your appointment token is cancelled due to verification reasons. Please contact JK Hospital reception at 7845265507.';
    const updated = updateLocalBookingStatus(booking._id, status, adminNote);
    setBookings(getLocalBookings());
    await api.post('/local-mail/appointment-status', {
      email: booking.patientEmail,
      patientName: booking.patientName,
      doctorName: booking.doctor?.name,
      tokenNumber: booking.tokenNumber,
      status,
      adminNote
    }).then(() => toast.success(`Token ${status} and email sent`)).catch(() => toast.success(`Token ${status} locally`));
    return updated;
  };

  if (!unlocked) {
    return (
    <main className="hospital-bg grid min-h-[calc(100vh-4rem)] place-items-center py-12">
        <motion.form onSubmit={login} className="glass w-full max-w-md rounded-lg p-8 text-center" initial={{ opacity: 0, scale: 0.96, rotateX: -8 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }}>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-medical-600 text-white shadow-soft">
            <LockKeyhole size={28} />
          </div>
          <h1 className="mt-5 text-3xl font-bold">Admin access</h1>
          <p className="mt-2 text-sm text-slate-500">Reception panel. First unlock sets your encrypted staff password on this device.</p>
          <input className="field mt-6 text-center" type="password" placeholder="Staff password (min 10 chars)" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="btn-primary mt-4 w-full"><ShieldCheck size={18} /> Unlock dashboard</button>
        </motion.form>
      </main>
    );
  }

  return (
    <main className="hospital-bg min-h-[calc(100vh-4rem)] py-10">
      <div className="container-pad">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-semibold text-medical-600">Admin control room</p>
          <h1 className="mt-2 text-4xl font-bold">Operations, tokens, refunds, and analytics</h1>
        </div>
        <button type="button" onClick={() => { closeAdminSession(); setUnlocked(false); }} className="btn-secondary px-4 py-2">Lock panel</button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total appointments" value={overview.stats.appointments} />
        <MetricCard label="Patients" value={overview.stats.patients} tone="green" />
        <MetricCard label="Pending refunds" value={overview.stats.pendingRefunds} tone="amber" />
        <MetricCard label="Revenue" value={`INR ${overview.stats.revenue}`} tone="rose" />
      </div>

      <motion.div className="mt-6 flex flex-wrap gap-2">
        {[
          ['overview', 'Overview'],
          ['bookings', 'Bookings'],
          ['doctors', 'Doctors'],
          ['refunds', 'Refunds']
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setAdminTab(id)} className={`tab-pill ${adminTab === id ? 'tab-pill-active' : 'bg-white ring-1 ring-slate-200'}`}>
            {label}
          </button>
        ))}
      </motion.div>

      {adminTab === 'overview' && (
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-lg p-5">
          <h2 className="text-xl font-bold">Daily bookings</h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="bookings" stroke="#147bd1" fill="#d9efff" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="glass rounded-lg p-5">
          <h2 className="text-xl font-bold">Doctor occupancy</h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancy}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tokens" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="glass rounded-lg p-5 lg:col-span-2">
          <h2 className="text-xl font-bold">Appointment decision mix</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-[260px_1fr] md:items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={4}>
                    {statusBreakdown.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {statusBreakdown.map((item, index) => (
                <div key={item.name} className="rounded-lg bg-white p-4 dark:bg-slate-900">
                  <div className="mb-3 h-2 w-12 rounded-full" style={{ background: palette[index] }} />
                  <p className="text-sm text-slate-500">{item.name}</p>
                  <p className="mt-1 text-3xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      )}

      {adminTab === 'doctors' && (
        <section className="glass mt-8 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-medical-600">Live schedule studio</p>
              <h2 className="text-xl font-bold">Doctor and slot management</h2>
            </div>
            <button onClick={createDoctor} className="btn-primary px-4 py-2"><Plus size={16} /> Add doctor</button>
          </div>
          <div className="mt-4 space-y-5">
            {doctorList.map((doctor) => (
              <motion.div
                key={doctor._id}
                className="premium-card rounded-lg bg-white p-4 shadow-[0_18px_50px_rgba(8,47,73,0.08)]"
                whileHover={{ y: -4, rotateX: 0.6 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <div className="grid gap-4 xl:grid-cols-[112px_1fr]">
                  <img src={doctor.avatar} alt={doctor.name} className="h-28 w-28 rounded-lg object-cover shadow-[0_18px_45px_rgba(15,23,42,0.14)]" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-500">
                      <span className="mb-1 flex items-center gap-1"><Stethoscope size={14} /> Doctor name</span>
                      <input className="field px-3 py-2" value={doctor.name} onChange={(event) => updateDoctor(doctor._id, 'name', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500">
                      Specialist in
                      <input className="field mt-1 px-3 py-2" value={doctor.specialty} onChange={(event) => updateDoctor(doctor._id, 'specialty', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500 sm:col-span-2">
                      <span className="mb-1 flex items-center gap-1"><Image size={14} /> Image URL</span>
                      <input className="field px-3 py-2" value={doctor.avatar} onChange={(event) => updateDoctor(doctor._id, 'avatar', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500">
                      Base consultant fee
                      <input className="field mt-1 px-3 py-2" type="number" min={MIN_CONSULTATION_FEE} value={doctor.fee} onChange={(event) => updateDoctor(doctor._id, 'fee', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500">
                      Availability
                      <select className="field mt-1 px-3 py-2" value={doctor.isAvailable ? 'yes' : 'no'} onChange={(event) => updateDoctor(doctor._id, 'isAvailable', event.target.value === 'yes')}>
                        <option value="yes">Available</option>
                        <option value="no">On leave</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-slate-500 sm:col-span-2">
                      Profile
                      <textarea className="field mt-1 min-h-20 px-3 py-2" value={doctor.bio} onChange={(event) => updateDoctor(doctor._id, 'bio', event.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => createSlot(doctor._id)} className="btn-secondary px-3 py-2"><Plus size={15} /> Add regular slot</button>
                  <button onClick={() => createSlot(doctor._id, new Date().toISOString().slice(0, 10))} className="btn-secondary px-3 py-2"><CalendarPlus size={15} /> Add today-only slot</button>
                  <button onClick={() => markLeave(doctor)} className="btn-secondary px-3 py-2">Leave mode</button>
                </div>

                <div className="mt-4 grid gap-3">
                  {doctor.slots.map((slot) => {
                    const booked = slot.bookedTokens || 0;
                    const total = slot.tokenLimit || 0;
                    const remaining = Math.max(total - booked, 0);
                    return (
                      <div key={slot._id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-xs font-bold text-slate-500">
                            Slot name
                            <input className="field mt-1 px-2 py-1.5" value={slot.label} onChange={(event) => updateSlot(doctor._id, slot._id, 'label', event.target.value)} />
                          </label>
                          <label className="text-xs font-bold text-slate-500">
                            Specific date
                            <input className="field mt-1 px-2 py-1.5" type="date" value={slot.date || ''} onChange={(event) => updateSlot(doctor._id, slot._id, 'date', event.target.value)} />
                          </label>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        <label className="text-xs font-bold text-slate-500">
                          Start
                          <input className="field mt-1 px-2 py-1.5" type="time" value={slot.startTime} onChange={(event) => updateSlot(doctor._id, slot._id, 'startTime', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          End
                          <input className="field mt-1 px-2 py-1.5" type="time" value={slot.endTime} onChange={(event) => updateSlot(doctor._id, slot._id, 'endTime', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Total slots
                          <input className="field mt-1 px-2 py-1.5" type="number" value={total} onChange={(event) => updateSlot(doctor._id, slot._id, 'tokenLimit', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Booked
                          <input className="field mt-1 px-2 py-1.5" type="number" value={booked} onChange={(event) => updateSlot(doctor._id, slot._id, 'bookedTokens', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Remaining
                          <input className="field mt-1 px-2 py-1.5" type="number" value={remaining} onChange={(event) => updateRemaining(doctor._id, slot._id, event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Fee
                          <input className="field mt-1 px-2 py-1.5" type="number" min={MIN_CONSULTATION_FEE} value={slot.fee ?? doctor.fee} onChange={(event) => updateSlot(doctor._id, slot._id, 'fee', event.target.value)} />
                        </label>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">{slot.date ? `Only visible on ${slot.date}` : 'Regular slot visible on every date'}</p>
                          <button
                            type="button"
                            onClick={() => updateSlot(doctor._id, slot._id, 'isActive', !slot.isActive)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${slot.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                          >
                            {slot.isActive ? 'Active' : 'Hidden'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!doctor.slots.length && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      No slots yet. Add a regular slot or a date-specific slot.
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {adminTab === 'bookings' && (
        <section className="glass mt-8 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Recent bookings</h2>
            <input className="field max-w-sm" placeholder="Search bookings..." value={bookingQuery} onChange={(e) => setBookingQuery(e.target.value)} />
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-3">Patient</th>
                  <th>Doctor</th>
                  <th>Slot</th>
                  <th>Token</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="py-4">
                      <p className="font-bold">{booking.patientDetails?.name || booking.patient?.name || booking.patientName}</p>
                      <p className="text-xs text-slate-500">{booking.patientId || booking.patientEmail}</p>
                    </td>
                    <td>{booking.doctor?.name}</td>
                    <td>{booking.slotLabel}</td>
                    <td>{booking.tokenNumber}</td>
                    <td><StatusBadge status={booking.status} /></td>
                    <td>
                      {['stripe', 'razorpay'].includes(booking.payment?.method) ? (
                        <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Verified online</span>
                      ) : booking.payment?.proofDataUrl ? (
                        <button onClick={() => setSelectedProof(booking.payment)} className="rounded-lg border px-3 py-2 text-xs font-bold dark:border-slate-700"><Eye size={14} className="mr-1 inline" /> View</button>
                      ) : 'No proof'}
                    </td>
                    <td>
                      {['stripe', 'razorpay'].includes(booking.payment?.method) ? (
                        <span className="text-xs font-bold text-slate-500">Auto-confirmed</span>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => decide(booking, 'approved')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><MailCheck size={14} className="mr-1 inline" /> Accept</button>
                          <button onClick={() => decide(booking, 'declined')} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Decline</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {adminTab === 'refunds' && (
        <section className="glass mt-8 rounded-lg p-5">
          <h2 className="text-xl font-bold">Refund requests</h2>
          <div className="mt-5 space-y-4">
            {!refunds.length && <p className="text-slate-500">No refund requests yet.</p>}
            {refunds.map((refund) => {
              const booking = bookings.find((item) => item._id === refund.appointmentId);
              return (
                <article key={refund._id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-bold">{refund.email}</p>
                      <p className="text-sm text-slate-500">{booking?.doctor?.name} · {refund.reason}</p>
                    </div>
                    <StatusBadge status={refund.status} />
                  </div>
                  {refund.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => { updateLocalRefundStatus(refund._id, 'approved', 'Approved by admin'); setRefunds(getLocalRefunds()); toast.success('Approved'); }} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Approve</button>
                      <button type="button" onClick={() => { updateLocalRefundStatus(refund._id, 'declined', 'Declined by admin'); setRefunds(getLocalRefunds()); toast.success('Declined'); }} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Decline</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
      {selectedProof && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-soft dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Payment proof</h2>
              <button onClick={() => setSelectedProof(null)} className="rounded-lg border p-2 dark:border-slate-700"><X size={16} /></button>
            </div>
            {selectedProof.proofDataUrl?.startsWith('data:image') ? <img src={selectedProof.proofDataUrl} alt="Payment proof" className="mt-4 max-h-[70vh] w-full rounded-lg object-contain" /> : <p className="mt-4">Proof file: {selectedProof.proofName}</p>}
            <p className="mt-4 text-sm text-slate-500">Transaction: {selectedProof.transactionId}</p>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
