import { cn } from '@/lib/cn';

interface ProgressBarProps {
  percent: number;
  /** Meta superada: el relleno pasa a color funcional (no decorativo). */
  over?: boolean;
  className?: string;
}

/**
 * Barra de progreso monocroma: relleno de tinta sobre riel neutro. El índigo
 * se reserva para acciones; los datos se cuentan en tinta.
 */
export function ProgressBar({ percent, over = false, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-ascend',
          over ? 'bg-danger-500' : 'bg-ink',
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
