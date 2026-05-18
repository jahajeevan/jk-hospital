/**
 * Lightweight CSS confetti burst on payment success.
 */

import { useEffect, useState } from 'react';

const COLORS = ['#10b981', '#0d63ad', '#f59e0b', '#8b5cf6', '#ec4899'];

/**
 * @param {{ active?: boolean }} props
 */
export default function SuccessConfetti({ active = false }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }
    const next = Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${8 + Math.random() * 84}%`,
      top: `${10 + Math.random() * 30}%`,
      delay: `${Math.random() * 0.35}s`,
      color: COLORS[i % COLORS.length],
      rotate: `${Math.random() * 360}deg`
    }));
    setPieces(next);
    const timer = setTimeout(() => setPieces([]), 1400);
    return () => clearTimeout(timer);
  }, [active]);

  if (!pieces.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="pv-confetti-piece"
          style={{
            left: piece.left,
            top: piece.top,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            transform: `rotate(${piece.rotate})`
          }}
        />
      ))}
    </div>
  );
}
