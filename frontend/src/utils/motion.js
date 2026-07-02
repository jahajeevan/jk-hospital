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

// Calm entrance (no 3D tilt) — for transactional/dense surfaces like booking,
// payment, and dashboards where motion should guide, not decorate.
export const softFadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease } })
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease } }
};

// Hover lift for cards/buttons — use with whileHover="hover" initial="rest".
export const hoverLift = {
  rest: { y: 0, transition: { duration: 0.2, ease } },
  hover: { y: -4, transition: { duration: 0.2, ease } }
};

// Reduced-motion-safe fallback: fade only, no transforms. Components should
// swap to this when useReducedMotion() is true, because framer-motion animates
// via JS/rAF and is NOT stopped by the global CSS prefers-reduced-motion rule.
export const staticReveal = { hidden: { opacity: 1 }, show: { opacity: 1 } };
