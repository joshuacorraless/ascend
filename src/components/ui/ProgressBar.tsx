import { cn } from '@/lib/cn';

interface ProgressBarProps {
  percent: number;
  over?: boolean;
  className?: string;
  /** Color de la barra cuando no hay exceso. */
  tone?: 'brand' | 'sky' | 'emerald';
}

const TONES: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  brand: 'bg-brand-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
};

export function ProgressBar({ percent, over = false, className, tone = 'brand' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800', className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', over ? 'bg-amber-500' : TONES[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
