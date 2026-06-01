import { Activity } from 'lucide-react';

export function BrandMark({ className = '', iconClassName = '', size = 'md' }) {
  const sizes = {
    sm: 'h-9 w-9 rounded-xl',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-14 w-14 rounded-2xl'
  };

  return (
    <span className={`brand-mark ${sizes[size] || sizes.md} ${className}`} aria-hidden="true">
      <Activity className={`brand-mark-pulse ${iconClassName}`} strokeWidth={2.6} />
    </span>
  );
}

export default function BrandLogo({ className = '', markSize = 'md', compact = false }) {
  return (
    <span className={`brand-lockup ${className}`}>
      <BrandMark size={markSize} />
      {!compact && (
        <span className="brand-wordmark">
          <span>JK</span>
          {' '}
          <span>Hospital</span>
        </span>
      )}
    </span>
  );
}
