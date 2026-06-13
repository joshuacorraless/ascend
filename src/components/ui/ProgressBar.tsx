import { cn } from '@/lib/cn';

interface ProgressBarProps {
  percent: number;
  over?: boolean;
  className?: string;
  /** Color de la barra cuando no hay exceso. */
  tone?: 'brand' | 'sky' | 'emerald';
}

const TONES: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  brand: 'bg-gradient-to-r from-teal-500 to-brand-500',
  sky: 'bg-gradient-to-r from-sky-500 to-cyan-400',
  emerald: 'bg-gradient-to-r from-emerald-500 to-teal-400',
};

export function ProgressBar({ percent, over = false, className, tone = 'brand' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-stone-200/80 dark:bg-zinc-800', className)}
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
