import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, softFadeUp, staticReveal } from '../utils/motion.js';

/**
 * Scroll-reveal wrapper.
 * - `calm` uses a subtle fade+rise (no 3D tilt) for transactional/dense surfaces.
 * - Respects prefers-reduced-motion at the JS level: framer-motion animates via
 *   rAF, which the global CSS reduced-motion rule does NOT stop, so we swap to a
 *   static (fade-only, no transform) variant here instead.
 */
export default function Reveal({ children, className = '', delay = 0, as = 'div', calm = false }) {
  const reduce = useReducedMotion();
  const Component = motion[as.replace('motion.', '')] || motion.div;
  const variants = reduce ? staticReveal : calm ? softFadeUp : fadeUp;
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      custom={delay}
      variants={variants}
    >
      {children}
    </Component>
  );
}
