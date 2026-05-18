import { motion } from 'framer-motion';

export default function MetricCard({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'from-medical-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500'
  };

  return (
    <motion.div
      className="glass premium-card rounded-lg p-5"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${tones[tone]}`} />
      <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </motion.div>
  );
}
