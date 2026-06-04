import { useId } from 'react';

export function BrandMark({ className = '', iconClassName = '', size = 'md' }) {
  const reactId = useId();
  const safeId = reactId.replace(/:/g, '');
  const blueId = `jk-shield-blue-${safeId}`;
  const tealId = `jk-shield-teal-${safeId}`;
  const shadowId = `jk-logo-shadow-${safeId}`;
  const sizes = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <span className={`brand-mark ${sizes[size] || sizes.md} ${className}`} aria-hidden="true">
      <svg className={`brand-mark-shield ${iconClassName}`} viewBox="0 0 96 108" role="img">
        <defs>
          <linearGradient id={blueId} x1="18" y1="8" x2="58" y2="76" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0d3f86" />
            <stop offset="1" stopColor="#0a63b7" />
          </linearGradient>
          <linearGradient id={tealId} x1="76" y1="24" x2="50" y2="96" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2dd4bf" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0d3f86" floodOpacity="0.2" />
          </filter>
        </defs>
        <path
          filter={`url(#${shadowId})`}
          d="M48 4C36 15 22 20 10 24v30c0 25 16 42 38 50 22-8 38-25 38-50V24C74 20 60 15 48 4Z"
          fill={`url(#${blueId})`}
        />
        <path
          d="M80 31c-7 28-25 37-38 52 8 8 20 12 30 14 12-10 18-24 18-43V31h-10Z"
          fill={`url(#${tealId})`}
        />
        <path
          d="M82 27C72 53 56 65 42 83"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="7"
        />
        <path d="M41 30h14v19h19v14H55v19H41V63H22V49h19V30Z" fill="white" />
      </svg>
    </span>
  );
}

export default function BrandLogo({ className = '', markSize = 'md', compact = false }) {
  return (
    <span className={`brand-lockup ${className}`}>
      <BrandMark size={markSize} />
      {!compact && (
        <span className="brand-wordmark">
          <span className="brand-jk">JK</span>
          <span className="brand-hospital">Hospital</span>
          <small>Trusted care. Better health.</small>
        </span>
      )}
    </span>
  );
}
