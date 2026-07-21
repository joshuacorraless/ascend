import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Rótulo pequeño sobre el título. */
  eyebrow?: string;
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, right }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4 pt-5">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
