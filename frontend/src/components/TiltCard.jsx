import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function TiltCard({ children, className = '', intensity = 12 }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 260, damping: 22 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 260, damping: 22 });

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={`tilt-card ${className}`}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={{ z: 24 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <motion.div className="tilt-card-inner" style={{ transform: 'translateZ(28px)' }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
