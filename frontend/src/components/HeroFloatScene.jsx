import { motion } from 'framer-motion';

const orbs = [
  { size: 220, top: '12%', right: '8%', delay: 0, color: 'from-sky-400/30 to-blue-600/20' },
  { size: 160, top: '48%', right: '18%', delay: 0.4, color: 'from-emerald-400/25 to-teal-500/15' },
  { size: 120, top: '28%', right: '32%', delay: 0.8, color: 'from-white/20 to-medical-300/10' }
];

export default function HeroFloatScene() {
  return (
    <div className="hero-float-scene hidden lg:block" aria-hidden="true">
      {orbs.map((orb) => (
        <motion.div
          key={orb.size}
          className={`hero-orb bg-gradient-to-br ${orb.color}`}
          style={{ width: orb.size, height: orb.size, top: orb.top, right: orb.right }}
          animate={{
            y: [0, -18, 0],
            rotateZ: [0, 6, 0],
            scale: [1, 1.04, 1]
          }}
          transition={{
            duration: 7 + orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay
          }}
        />
      ))}
      <motion.div
        className="hero-glass-ring"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="hero-glass-card"
        initial={{ opacity: 0, rotateY: -20, z: -80 }}
        animate={{ opacity: 1, rotateY: 0, z: 0 }}
        transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ rotateY: 8, rotateX: -4, z: 40 }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Your journey</p>
        <ol className="mt-4 space-y-3 text-sm font-semibold text-white">
          {['Choose doctor & slot', 'Pay securely', 'Get token & invoice'].map((step, i) => (
            <motion.li
              key={step}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.12 }}
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 text-xs">{i + 1}</span>
              {step}
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </div>
  );
}
