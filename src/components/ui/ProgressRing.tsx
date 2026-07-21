import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ProgressRingProps {
  /** Puede superar 100; el arco se limita a 100. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  over?: boolean;
  color?: string;
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
  color = '#F5F5F5',
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
          className={cn('stroke-line', trackClassName)}
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
          stroke={over ? '#FA5252' : color}
          className="transition-[stroke-dashoffset] duration-700 ease-ascend"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
