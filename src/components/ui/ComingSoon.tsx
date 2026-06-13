import type { LucideIcon } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';

/** Placeholder honesto para módulos que se implementan en una fase posterior. */
export function ComingSoon({
  title,
  icon,
  phase,
}: {
  title: string;
  icon: LucideIcon;
  phase: string;
}) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <EmptyState icon={icon} title="En construcción" description={`Este módulo llega en ${phase}.`} />
    </div>
  );
}
