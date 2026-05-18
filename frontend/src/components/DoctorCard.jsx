import { motion } from 'framer-motion';
import { CalendarClock, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DoctorCard({ doctor, index = 0, showSlots = true, compact = false }) {
  const totalRemaining = doctor.slots.reduce((sum, slot) => {
    if (slot.isActive === false) return sum;
    return sum + Math.max((slot.tokenLimit || 0) - (slot.bookedTokens || 0), 0);
  }, 0);
  const available = doctor.isAvailable !== false && totalRemaining > 0;

  return (
    <motion.article
      className="glass premium-card overflow-hidden rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <motion.div className="relative h-52 overflow-hidden">
        <img src={doctor.avatar} alt={doctor.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
        <span className={`absolute right-3 top-3 rounded-lg px-3 py-1 text-xs font-bold ${available ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {available ? `${totalRemaining} tokens open` : 'Fully booked'}
        </span>
        <motion.div className="absolute bottom-3 left-3 text-white">
          <p className="text-xl font-bold">{doctor.name}</p>
          <p className="text-sm text-white/85">{doctor.specialty}</p>
        </motion.div>
      </motion.div>
      <div className={compact ? 'p-4' : 'p-5'}>
        {!compact && <p className="line-clamp-2 text-sm text-slate-600">{doctor.bio}</p>}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5">
            <Stethoscope size={14} /> {doctor.slots.filter((s) => s.isActive !== false).length} slots
          </span>
          <span className="rounded-lg bg-medical-50 px-2.5 py-1.5 text-medical-700">Fee shown after slot selection</span>
        </div>
        {showSlots && (
          <div className="mt-4 max-h-36 space-y-2 overflow-y-auto">
            {doctor.slots.filter((s) => s.isActive !== false).slice(0, 3).map((slot) => {
              const remaining = Math.max(slot.tokenLimit - (slot.bookedTokens || 0), 0);
              return (
                <div key={slot._id} className="rounded-lg bg-white p-2.5 text-xs ring-1 ring-slate-100">
                  <p className="flex items-center justify-between gap-2 font-bold">
                    <span className="inline-flex items-center gap-1"><CalendarClock size={13} /> {slot.label}</span>
                    <span className={remaining ? 'text-emerald-600' : 'text-rose-600'}>{remaining} left</span>
                  </p>
                  <p className="mt-1 text-slate-500">{slot.startTime}–{slot.endTime}</p>
                </div>
              );
            })}
          </div>
        )}
        <Link to="/book" state={{ doctorId: doctor._id }} className="btn-primary mt-5 w-full">
          Book with {doctor.name.split(' ').slice(-1)[0]}
        </Link>
      </div>
    </motion.article>
  );
}
