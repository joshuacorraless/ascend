import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Micro-rótulo opcional sobre el título (estilo editorial). */
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Estado vacío puramente tipográfico — sin iconos. La jerarquía nace del
 * rótulo, el título y el espacio.
 */
export function EmptyState({ eyebrow, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-line bg-paper/60 px-6 py-12 text-center">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <div className="max-w-xs">
        <p className="text-base font-semibold text-ink">{title}</p>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
