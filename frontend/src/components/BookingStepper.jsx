import { Check } from 'lucide-react';

export default function BookingStepper({ steps, current }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold transition ${
              active ? 'border-medical-500 bg-medical-50 text-medical-800' : done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-medical-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {done ? <Check size={14} /> : index + 1}
            </span>
            <span className="leading-tight">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
