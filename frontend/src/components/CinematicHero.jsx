import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export default function CinematicHero({
  image,
  alt = 'JK Hospital',
  eyebrow,
  title,
  subtitle,
  children,
  align = 'left',
  minHeight = 'min-h-[82vh]'
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1.18]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.35]);

  return (
    <section ref={ref} className={`cinematic-hero relative overflow-hidden ${minHeight}`}>
      <motion.div className="absolute inset-0" style={{ y, scale, opacity }}>
        <img src={image} alt={alt} className="cinematic-hero-media h-full w-full object-cover" />
      </motion.div>
      <motion.div
        className="cinematic-hero-scan absolute inset-0"
        animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
        transition={{ duration: 12, repeat: Infinity, repeatType: 'mirror', ease: 'linear' }}
      />
      <motion.div
        className="cinematic-hero-grain absolute inset-0"
        animate={{ opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="cinematic-hero-vignette absolute inset-0"
        initial={{ opacity: 0.72 }}
        animate={{ opacity: [0.72, 0.82, 0.72] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className={`container-pad relative z-10 flex ${minHeight} items-center py-16 ${align === 'center' ? 'justify-center text-center' : ''}`}>
        <motion.div
          className={align === 'center' ? 'max-w-3xl' : 'max-w-3xl'}
          initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          {eyebrow}
          {title}
          {subtitle}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
