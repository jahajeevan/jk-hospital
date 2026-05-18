import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, BrainCircuit, ClipboardList, HelpCircle, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { formatApiError } from '../api/client.js';

const urgencyTone = {
  routine: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  soon: 'bg-amber-50 text-amber-700 ring-amber-100',
  urgent: 'bg-rose-50 text-rose-700 ring-rose-100'
};

const SectionList = ({ icon: Icon, title, items }) => {
  if (!items?.length) return null;
  return (
    <div className="ai-prep-section">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <Icon size={16} className="text-medical-600" />
        {title}
      </div>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-xl bg-white/62 px-3 py-2 text-sm text-slate-600 ring-1 ring-white/70">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function AiVisitPrep({ patient, doctor, slot, appointmentDate }) {
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(false);

  const canGenerate = patient?.symptoms?.trim().length >= 8;

  const generatePrep = async () => {
    if (!canGenerate) {
      toast.error('Describe symptoms first, then Gemini can prepare your visit notes.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/ai/visit-prep', {
        patient,
        doctor: { name: doctor?.name, specialty: doctor?.specialty },
        slot: { label: slot?.label },
        appointmentDate
      });
      setPrep(data.prep);
      toast.success('AI visit prep ready');
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-prep-card liquid-glass mt-5 rounded-3xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/64 px-3 py-1 text-xs font-bold uppercase tracking-wider text-medical-700 ring-1 ring-white/80">
            <Sparkles size={14} />
            Gemini AI
          </span>
          <h3 className="mt-3 text-lg font-bold text-ink">AI visit prep</h3>
          <p className="mt-1 text-sm text-slate-600">
            Turns your symptoms into a safe summary, prep checklist, and questions for the doctor.
          </p>
        </div>
        <button type="button" onClick={generatePrep} disabled={loading} className="btn-secondary shrink-0 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
          {loading ? 'Thinking...' : prep ? 'Refresh' : 'Generate'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {prep ? (
          <motion.div
            key="prep"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 space-y-4"
          >
            <div className="rounded-2xl bg-white/66 p-4 ring-1 ring-white/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${urgencyTone[prep.urgency] || urgencyTone.routine}`}>
                  {prep.urgency}
                </span>
                <span className="text-xs font-bold text-slate-500">{prep.suggestedDepartment}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{prep.summary}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionList icon={ClipboardList} title="Before you come" items={prep.preparation} />
              <SectionList icon={HelpCircle} title="Ask the doctor" items={prep.questionsForDoctor} />
            </div>
            <SectionList icon={AlertTriangle} title="Red flags" items={prep.redFlags} />
            <p className="text-xs font-semibold text-slate-500">{prep.disclaimer}</p>
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-2xl bg-white/54 p-4 text-sm text-slate-500 ring-1 ring-white/70"
          >
            Add symptoms above, then generate a polished visit note. This is preparation only, not medical advice.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
