import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Botón de acción menor: mínimo pero claramente pulsable (relleno hundido +
 * borde sutil). Para filas de acciones como Editar / Duplicar / Archivar.
 */
export function ActionButton({
  children,
  onClick,
  className,
  'aria-pressed': ariaPressed,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  'aria-pressed'?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ariaPressed}
      className={cn(
        'rounded-lg border border-line bg-inset px-3 py-1.5 text-xs font-semibold text-ink-soft',
        'transition duration-200 ease-ascend hover:border-ink-faint hover:bg-paper hover:text-ink active:scale-[0.97]',
        ariaPressed && 'border-brand-500/60 bg-brand-500/15 text-brand-600',
        className,
      )}
    >
      {children}
    </button>
  );
}
