import { Bell, CalendarClock, Copy, FileText, Plus, RefreshCcw, ShieldAlert, Stethoscope, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import MetricCard from '../components/MetricCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { downloadInvoice } from '../utils/invoice.js';
import {
  cancelLocalBooking,
  getLocalBookingsForUser,
  getLocalMedicalRecordsForUser,
  getLocalRefundsForUser,
  saveLocalRefund
} from '../utils/localStore.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'records', label: 'Records' },
  { id: 'refunds', label: 'Refunds' }
];

const checklist = [
  'Carry your token number screenshot or invoice',
  'Arrive 15 minutes before slot time',
  'Bring previous reports if any',
  'Keep registered phone active for SMS updates'
];

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [records, setRecords] = useState([]);
  const [refundForm, setRefundForm] = useState({ appointmentId: '', reason: '', emergencyExplanation: '' });

  const reload = () => {
    setAppointments(getLocalBookingsForUser(user?.email));
    setRefunds(getLocalRefundsForUser(user?.email));
    setRecords(getLocalMedicalRecordsForUser(user?.email));
  };

  useEffect(() => {
    reload();
    window.addEventListener('jk-local-sync', reload);
    return () => window.removeEventListener('jk-local-sync', reload);
  }, [user?.email]);

  const active = appointments.find((item) => ['payment_submitted', 'confirmed', 'approved', 'rescheduled'].includes(item.status));
  const upcoming = appointments.filter((item) => !['cancelled', 'declined', 'rejected'].includes(item.status));

  const copyToken = () => {
    if (!active?.tokenNumber) return toast.error('No token yet');
    navigator.clipboard.writeText(String(active.tokenNumber));
    toast.success('Token copied');
  };

  const cancel = (id) => {
    cancelLocalBooking(id);
    reload();
    toast.success('Appointment cancelled');
  };

  const submitRefund = () => {
    if (!refundForm.appointmentId || !refundForm.reason.trim()) {
      return toast.error('Select appointment and enter reason');
    }
    saveLocalRefund({ email: user?.email, ...refundForm });
    reload();
    toast.success('Refund request submitted');
    setRefundForm({ appointmentId: '', reason: '', emergencyExplanation: '' });
    setTab('refunds');
  };

  return (
    <main className="patient-wow-page min-h-[calc(100vh-4rem)] py-10">
      <div className="container-pad">
        <div className="patient-hero-panel flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="live-badge">Patient portal</span>
            <h1 className="text-wrap-anywhere mt-4 text-3xl font-bold sm:text-4xl">Hello, {user?.name}</h1>
            <p className="text-wrap-anywhere mt-1 text-sm text-slate-500">{user?.email}</p>
          </div>
          <Link to="/book" className="btn-primary"><Plus size={18} /> Book new visit</Link>
        </div>

        <motion.div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`tab-pill ${tab === item.id ? 'tab-pill-active' : 'bg-white ring-1 ring-slate-200'}`}>
              {item.label}
            </button>
          ))}
        </motion.div>

        {tab === 'overview' && (
          <>
            <div className="patient-metric-grid mt-8 grid gap-4 md:grid-cols-4">
              <MetricCard label="Total visits" value={appointments.length} />
              <MetricCard label="Upcoming" value={upcoming.length} tone="green" />
              <MetricCard label="Active token" value={active?.tokenNumber || '—'} tone="amber" />
              <MetricCard label="Records" value={records.length} tone="rose" />
            </div>

            {active ? (
              <motion.div className="token-card relative z-10 mt-8 p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm uppercase tracking-widest text-white/75">Your token today</p>
                    <p className="text-wrap-anywhere mt-2 text-4xl font-bold sm:text-5xl">#{active.tokenNumber || 'Pending'}</p>
                    <p className="text-wrap-anywhere mt-2 text-white/90">{active.doctor?.name} · {active.slotLabel}</p>
                    <p className="text-wrap-anywhere text-sm text-white/70">{new Date(active.appointmentDate).toLocaleDateString()} · ~{active.estimatedWaitMinutes} min wait</p>
                  </div>
                  <motion.div className="token-card-actions flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <button type="button" onClick={copyToken} className="token-card-btn token-card-btn-ghost">
                      <Copy size={16} /> Copy
                    </button>
                    <button type="button" onClick={() => downloadInvoice(active)} className="token-card-btn token-card-btn-solid">
                      <FileText size={16} /> Invoice
                    </button>
                  </motion.div>
                </div>
                <StatusBadge status={active.status} />
              </motion.div>
            ) : (
              <div className="patient-empty-card mt-8 rounded-xl p-8 text-center">
                <Stethoscope className="mx-auto text-medical-600" size={32} />
                <p className="mt-3 font-bold">No active appointment</p>
                <p className="mt-1 text-sm text-slate-500">Book your first token to see live queue status here.</p>
                <Link to="/book" className="btn-primary mt-4 inline-flex">Book now</Link>
              </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="patient-panel rounded-xl p-5">
                <h2 className="text-lg font-bold">Visit checklist</h2>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {checklist.map((item) => (
                    <li key={item} className="flex gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">✓ {item}</li>
                  ))}
                </ul>
              </section>
              <section className="patient-panel rounded-xl p-5">
                <div className="flex items-center gap-2"><Bell size={18} className="text-medical-600" /><h2 className="text-lg font-bold">Recent timeline</h2></div>
                <div className="mt-4 space-y-3">
                  {(active?.timeline || appointments[0]?.timeline || [{ label: 'No activity yet', at: new Date().toISOString() }]).map((event) => (
                    <div key={`${event.label}-${event.at}`} className="rounded-lg bg-white p-3 text-sm ring-1 ring-slate-100">
                      <p className="font-bold">{event.label}</p>
                      <p className="text-xs text-slate-500">{new Date(event.at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}

        {tab === 'appointments' && (
          <section className="patient-panel mt-8 rounded-xl p-5">
            <div className="flex items-center gap-2"><CalendarClock className="text-medical-600" /><h2 className="text-xl font-bold">All appointments</h2></div>
            {!appointments.length && <p className="mt-6 text-slate-500">No appointments yet.</p>}
            <div className="mt-6 grid gap-4">
              {appointments.map((appointment) => (
                <article key={appointment._id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{appointment.doctor?.name}</p>
                      <p className="text-wrap-anywhere text-sm text-slate-500">{appointment.slotLabel} · {new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                      <p className="text-wrap-anywhere mt-1 text-sm">Token: <strong>{appointment.tokenNumber || 'Pending'}</strong></p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button type="button" onClick={() => downloadInvoice(appointment)} className="btn-secondary px-3 py-2 text-xs"><FileText size={14} /> Invoice</button>
                    <Link to="/book" className="btn-secondary px-3 py-2 text-xs"><RefreshCcw size={14} /> Rebook</Link>
                    {appointment.status !== 'cancelled' && (
                      <button type="button" onClick={() => cancel(appointment._id)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><XCircle size={14} /> Cancel</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'records' && (
          <div className="mt-8">
            <section className="patient-panel rounded-xl p-5">
              <div className="flex items-center gap-2"><FileText className="text-medical-600" /><h2 className="text-xl font-bold">Saved medical records</h2></div>
              <div className="mt-5 space-y-4">
                {!records.length && (
                  <div className="rounded-xl bg-white/72 p-5 text-sm text-slate-500 ring-1 ring-white/80">
                    No medical records saved yet.
                  </div>
                )}
                {records.map((record) => (
                  <article key={record._id} className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-wrap-anywhere font-bold text-ink">{record.title}</p>
                        <p className="text-wrap-anywhere text-xs capitalize text-slate-500">{record.type} · {new Date(record.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="rounded-full bg-medical-50 px-3 py-1 text-xs font-bold text-medical-700">Saved</span>
                    </div>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      <p className="whitespace-pre-wrap text-wrap-anywhere">{record.aiSummary || record.sourceText || 'No details saved.'}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'refunds' && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="patient-panel rounded-xl p-5">
              <h2 className="text-xl font-bold">Submit refund request</h2>
              <select className="field mt-4" value={refundForm.appointmentId} onChange={(e) => setRefundForm((v) => ({ ...v, appointmentId: e.target.value }))}>
                <option value="">Select paid appointment</option>
                {appointments.filter((a) => a.status === 'approved' || a.status === 'cancelled').map((item) => (
                  <option key={item._id} value={item._id}>{item.doctor?.name} · {item.slotLabel}</option>
                ))}
              </select>
              <textarea className="field mt-3" rows={3} placeholder="Reason for refund" value={refundForm.reason} onChange={(e) => setRefundForm((v) => ({ ...v, reason: e.target.value }))} />
              <textarea className="field mt-3" rows={2} placeholder="Emergency details (optional)" value={refundForm.emergencyExplanation} onChange={(e) => setRefundForm((v) => ({ ...v, emergencyExplanation: e.target.value }))} />
              <button type="button" className="btn-primary mt-4 w-full" onClick={submitRefund}>Submit request</button>
            </section>
            <section className="patient-panel rounded-xl p-5">
              <h2 className="text-xl font-bold">Your refund requests</h2>
              <div className="mt-4 space-y-3">
                {!refunds.length && <p className="text-sm text-slate-500">No refund requests yet.</p>}
                {refunds.map((refund) => (
                  <div key={refund._id} className="rounded-lg bg-white p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                      <p className="text-wrap-anywhere font-bold text-sm">{refund.reason}</p>
                      <StatusBadge status={refund.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{new Date(refund.createdAt).toLocaleString()}</p>
                    {refund.adminNote && <p className="text-wrap-anywhere mt-2 text-xs text-medical-700">{refund.adminNote}</p>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
