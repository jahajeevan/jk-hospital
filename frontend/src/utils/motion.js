export const ease = [0.22, 1, 0.36, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 32, rotateX: 12, transformPerspective: 1200 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { delay: i * 0.07, duration: 0.65, ease }
  })
};

export const fadeIn3D = {
  hidden: { opacity: 0, scale: 0.92, rotateY: -8, z: -40 },
  show: {
    opacity: 1,
    scale: 1,
    rotateY: 0,
    z: 0,
    transition: { duration: 0.7, ease }
  }
};

export const page3D = {
  initial: { opacity: 0, y: 10, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.34, ease } },
  exit: { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.16, ease } }
};

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};
