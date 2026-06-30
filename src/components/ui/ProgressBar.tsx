import { cn } from '@/lib/cn';

interface ProgressBarProps {
  percent: number;
  /** Meta superada: el relleno pasa a color de aviso. */
  over?: boolean;
  className?: string;
  /** Color del relleno (CSS). Por defecto blanco tenue. */
  color?: string;
}

export function ProgressBar({ percent, over = false, className, color = '#E2E2E2' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-inset', className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-ascend"
        style={{ width: `${clamped}%`, backgroundColor: over ? '#FA5252' : color }}
      />
    </div>
  );
}
