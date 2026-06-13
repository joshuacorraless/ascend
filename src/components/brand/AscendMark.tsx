import { cn } from '@/lib/cn';

/**
 * Emblema de Ascend: barras en ascenso sobre un degradado índigo→violeta.
 * Las barras suben de izquierda a derecha (la idea de "ascender").
 */
export function AscendMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.15rem] shadow-[0_18px_34px_-22px_rgba(79,70,229,0.95)]',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="ascend-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4f46e5" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" fill="url(#ascend-bg)" />
        <g fill="#ffffff">
          <rect x="7.2" y="27" width="6" height="12" rx="2.4" opacity="0.68" />
          <rect x="16.4" y="20" width="6" height="19" rx="2.4" opacity="0.82" />
          <rect x="25.6" y="13" width="6" height="26" rx="2.4" opacity="0.92" />
          <rect x="34.8" y="6" width="6" height="33" rx="2.4" />
        </g>
      </svg>
    </div>
  );
}
