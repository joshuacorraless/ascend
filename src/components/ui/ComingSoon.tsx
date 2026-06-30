import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';

/** Placeholder honesto para módulos que se implementan en una fase posterior. */
export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} />
      <EmptyState
        eyebrow="En construcción"
        title="Próximamente"
        description={`Este módulo llega en ${phase}.`}
      />
    </div>
  );
}
