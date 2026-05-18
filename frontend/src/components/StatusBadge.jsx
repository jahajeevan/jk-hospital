const tones = {
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  payment_submitted: 'bg-amber-50 text-amber-700 ring-amber-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 ring-sky-200',
  rescheduled: 'bg-sky-50 text-sky-700 ring-sky-200',
  declined: 'bg-rose-50 text-rose-700 ring-rose-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200'
};

const labels = {
  payment_submitted: 'Pending review',
  approved: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled'
};

export default function StatusBadge({ status }) {
  const tone = tones[status] || tones.pending;
  const label = labels[status] || status?.replace(/_/g, ' ');
  return <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-bold capitalize ring-1 ring-inset ${tone}`}>{label}</span>;
}
