import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Scale } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExerciseProgress } from './ExerciseProgress';
import { useSettings } from '@/app/providers/settings';
import { getRepositories } from '@/lib/repositories';
import { bodyWeightStats, withMovingAverage } from '@/lib/domain';
import { formatKeyShort } from '@/lib/datetime';
import { round, weightToDisplay } from '@/lib/units';
import type { BodyWeightEntry } from '@/lib/schema';

export function ProgressScreen() {
  const [tab, setTab] = useState<'fuerza' | 'peso'>('fuerza');

  return (
    <div className="space-y-4">
      <PageHeader title="Progreso" />
      <SegmentedControl
        className="w-full"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'fuerza', label: 'Fuerza' },
          { value: 'peso', label: 'Peso corporal' },
        ]}
      />
      {tab === 'fuerza' ? <ExerciseProgress /> : <BodyWeightProgress />}
    </div>
  );
}

function BodyWeightProgress() {
  const { settings } = useSettings();
  const entries = useLiveQuery(() => getRepositories().bodyWeight.list(), [], [] as BodyWeightEntry[]);
  const list = entries ?? [];
  const unit = settings.weightUnit;

  const stats = useMemo(() => bodyWeightStats(list), [list]);
  const data = useMemo(
    () =>
      withMovingAverage(list).map((p) => ({
        date: p.date,
        peso: round(weightToDisplay(p.weightKg, unit), 1),
        media: round(weightToDisplay(p.averageKg, unit), 1),
      })),
    [list, unit],
  );

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="Sin registros de peso"
        description="Registra tu peso para ver tu tendencia."
        action={
          <Link to="/peso" className="btn-primary">
            Ir a peso corporal
          </Link>
        }
      />
    );
  }

  const fmtDelta = (kg: number) => `${kg > 0 ? '+' : ''}${round(weightToDisplay(kg, unit), 1)} ${unit}`;

  return (
    <div className="space-y-3">
      <section className="card grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-zinc-500">Actual</p>
          <p className="font-bold">{stats.current !== undefined ? `${round(weightToDisplay(stats.current, unit), 1)} ${unit}` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">7 días</p>
          <p className="font-bold">{fmtDelta(stats.weeklyChange)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Total</p>
          <p className="font-bold">{fmtDelta(stats.totalChange)}</p>
        </div>
      </section>

      {data.length >= 2 && (
        <section className="card">
          <SimpleLineChart
            data={data}
            xKey="date"
            xFormatter={formatKeyShort}
            unit={` ${unit}`}
            lines={[
              { key: 'peso', name: 'Peso', color: '#6366f1' },
              { key: 'media', name: 'Media 7d', color: '#f59e0b', dashed: true },
            ]}
          />
        </section>
      )}

      <Link to="/peso" className="btn-secondary w-full">
        Ver historial completo
      </Link>
    </div>
  );
}
