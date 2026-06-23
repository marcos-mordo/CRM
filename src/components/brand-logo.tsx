import { cn } from '@/lib/utils';

export function BrandLogo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="brandhubLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#brandhubLogoGrad)" />
      <path
        d="M9 8h6.5a3.5 3.5 0 0 1 2.4 6 3.5 3.5 0 0 1-2.4 6H9V8Zm3 2v4h3.2a2 2 0 1 0 0-4H12Zm0 6v4h3.5a2 2 0 1 0 0-4H12Z"
        fill="#fff"
      />
      <circle cx="23" cy="11" r="2" fill="#fff" opacity="0.85" />
      <circle cx="23" cy="16" r="2" fill="#fff" opacity="0.55" />
      <circle cx="23" cy="21" r="2" fill="#fff" opacity="0.3" />
    </svg>
  );
}
