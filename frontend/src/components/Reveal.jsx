import { motion } from 'framer-motion';
import { fadeUp } from '../utils/motion.js';

export default function Reveal({ children, className = '', delay = 0, as = 'div' }) {
  const Component = motion[as.replace('motion.', '')] || motion.div;
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      custom={delay}
      variants={fadeUp}
    >
      {children}
    </Component>
  );
}
