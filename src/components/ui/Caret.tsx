import { cn } from '@/lib/cn';

type Direction = 'right' | 'left' | 'up' | 'down';

const ROTATION: Record<Direction, string> = {
  right: 'rotate-45',
  left: '-rotate-[135deg]',
  up: '-rotate-45',
  down: 'rotate-[135deg]',
};

/**
 * Afordancia direccional puramente geométrica (dos hairlines), no un pictograma.
 * Sustituye a los chevrons de iconos: hereda `currentColor`.
 */
export function Caret({
  dir = 'right',
  className,
  size = 7,
}: {
  dir?: Direction;
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-block border-current', ROTATION[dir], className)}
      style={{
        width: size,
        height: size,
        borderTopWidth: 1.6,
        borderRightWidth: 1.6,
      }}
    />
  );
}
