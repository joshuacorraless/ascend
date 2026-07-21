import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Rótulo pequeño sobre el título. */
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ eyebrow, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-line bg-paper/60 px-6 py-12 text-center">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <div className="max-w-xs">
        <p className="text-base font-semibold text-ink">{title}</p>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
