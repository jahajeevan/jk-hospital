import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Count-up number for stat/metric cards (e.g. admin dashboard totals).
 * Respects prefers-reduced-motion by showing the final value instantly.
 *
 * Props:
 * - value: target number
 * - duration: ms (default 900)
 * - prefix / suffix: e.g. prefix="INR " for currency
 * - locale: Intl locale for grouping (default en-IN)
 */
export default function AnimatedNumber({ value = 0, duration = 900, prefix = '', suffix = '', locale = 'en-IN' }) {
  const reduce = useReducedMotion();
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(reduce ? target : 0);
  const rafRef = useRef();

  useEffect(() => {
    if (reduce) {
      setDisplay(target);
      return undefined;
    }
    const start = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, reduce]);

  return (
    <span>
      {prefix}
      {display.toLocaleString(locale)}
      {suffix}
    </span>
  );
}
