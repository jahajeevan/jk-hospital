import { motion, useReducedMotion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber.jsx';

// Matches an optional non-numeric prefix (e.g. "INR ") followed by a number that
// ends the string, so "INR 0" / "1,200" / 42 animate, but "Active" stays literal.
const valueRe = /^\s*([^\d-]*?)\s*(-?[\d,]+(?:\.\d+)?)\s*$/;

function SmartValue({ value }) {
  if (typeof value === 'number') return <AnimatedNumber value={value} />;
  if (typeof value === 'string') {
    const match = value.match(valueRe);
    if (match) {
      const num = Number(match[2].replace(/,/g, ''));
      if (Number.isFinite(num)) {
        return <AnimatedNumber value={num} prefix={match[1] ? `${match[1]} ` : ''} />;
      }
    }
  }
  return <>{value}</>;
}

export default function MetricCard({ label, value, tone = 'blue' }) {
  const reduce = useReducedMotion();
  const tones = {
    blue: 'from-medical-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500'
  };

  return (
    <motion.div
      className="glass premium-card rounded-lg p-5"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={reduce ? undefined : { y: -6, scale: 1.015 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${tones[tone]}`} />
      <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold"><SmartValue value={value} /></p>
    </motion.div>
  );
}
