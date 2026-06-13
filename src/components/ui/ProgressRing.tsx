import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ProgressRingProps {
  /** Porcentaje 0–100 (puede superar 100; el arco se limita a 100). */
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** true si se excedió la meta (cambia el color a ámbar). */
  over?: boolean;
  className?: string;
  trackClassName?: string;
  children?: ReactNode;
  ariaLabel?: string;
}

export function ProgressRing({
  percent,
  size = 72,
  strokeWidth = 8,
  over = false,
  className,
  trackClassName,
  children,
  ariaLabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `${Math.round(percent)} por ciento`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn('stroke-zinc-200 dark:stroke-zinc-800', trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset] duration-500',
            over ? 'stroke-amber-500' : 'stroke-brand-500',
          )}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
