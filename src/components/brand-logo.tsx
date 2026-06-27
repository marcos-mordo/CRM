import { cn } from '@/lib/utils';

export function BrandLogo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="brandhubLogoGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset=".55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#DB2777" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#brandhubLogoGrad)" />
      <g stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" strokeLinecap="round">
        <line x1="32" y1="32" x2="48" y2="16" />
        <line x1="32" y1="32" x2="51" y2="32" />
        <line x1="32" y1="32" x2="48" y2="48" />
      </g>
      <g fill="#fff">
        <circle cx="48" cy="16" r="3.2" />
        <circle cx="51" cy="32" r="3.2" fillOpacity=".85" />
        <circle cx="48" cy="48" r="3.2" fillOpacity=".7" />
      </g>
      <path
        d="M16 14h11.5c5.3 0 8.5 2.6 8.5 7 0 3-1.7 4.8-3.7 5.5 2.6.6 4.7 2.6 4.7 6 0 4.7-3.5 7.5-9.2 7.5H16V14Zm5.5 4.6v6.1h5.2c2.7 0 4-1 4-3 0-2-1.3-3.1-4-3.1h-5.2Zm0 10.4v6.5h6c2.9 0 4.4-1.1 4.4-3.3 0-2.2-1.5-3.2-4.4-3.2h-6Z"
        fill="#fff"
      />
    </svg>
  );
}
