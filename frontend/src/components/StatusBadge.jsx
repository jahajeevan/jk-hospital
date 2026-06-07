const tones = {
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  payment_submitted: 'bg-amber-50 text-amber-700 ring-amber-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 ring-sky-200',
  rescheduled: 'bg-sky-50 text-sky-700 ring-sky-200',
  declined: 'bg-rose-50 text-rose-700 ring-rose-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  arrived: 'bg-blue-50 text-blue-700 ring-blue-200',
  in_progress: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  prescription_generated: 'bg-violet-50 text-violet-700 ring-violet-200',
  pharmacy_pending: 'bg-orange-50 text-orange-700 ring-orange-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  no_show: 'bg-slate-100 text-slate-700 ring-slate-200',
  cancelled_by_hospital: 'bg-rose-50 text-rose-700 ring-rose-200'
};

const labels = {
  payment_submitted: 'Pending review',
  approved: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  arrived: 'Arrived',
  in_progress: 'In progress',
  prescription_generated: 'Prescription generated',
  pharmacy_pending: 'Pharmacy pending',
  paid: 'Paid',
  completed: 'Completed',
  no_show: 'No show',
  cancelled_by_hospital: 'Cancelled by hospital'
};

export default function StatusBadge({ status }) {
  const tone = tones[status] || tones.pending;
  const label = labels[status] || status?.replace(/_/g, ' ');
  return <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-bold capitalize ring-1 ring-inset ${tone}`}>{label}</span>;
}
