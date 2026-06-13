import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Award, Dumbbell } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { useExerciseProgress } from './useExerciseProgress';
import { useSettings } from '@/app/providers/settings';
import { useToday } from '@/app/hooks/useToday';
import { getRepositories } from '@/lib/repositories';
import { personalRecords, progressSeries, type ProgressMetric } from '@/lib/domain';
import { addDaysToKey, formatKeyShort } from '@/lib/datetime';
import { formatWeight, round, weightToDisplay } from '@/lib/units';
import type { Exercise } from '@/lib/schema';

interface MetricDef {
  value: ProgressMetric;
  label: string;
  weighted: boolean;
}
const METRICS: MetricDef[] = [
  { value: 'estimatedOneRm', label: '1RM est.', weighted: true },
  { value: 'maxWeight', label: 'Peso máx', weighted: true },
  { value: 'volume', label: 'Volumen', weighted: true },
  { value: 'totalReps', label: 'Reps', weighted: false },
];

const RANGES = [
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '365', label: '1a' },
  { value: 'all', label: 'Todo' },
] as const;

export function ExerciseProgress() {
  const { settings } = useSettings();
  const { dateKey } = useToday();
  const exercises = useLiveQuery(() => getRepositories().exercises.list({ includeArchived: true }), [], [] as Exercise[]);
  const [exerciseId, setExerciseId] = useState('');
  const [metric, setMetric] = useState<ProgressMetric>('estimatedOneRm');
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('90');

  // Selecciona el primer ejercicio disponible por defecto.
  useEffect(() => {
    if (!exerciseId && exercises && exercises.length > 0) setExerciseId(exercises[0]!.id);
  }, [exercises, exerciseId]);

  const progress = useExerciseProgress(exerciseId);
  const metricDef = METRICS.find((m) => m.value === metric)!;
  const unitLabel = metricDef.weighted ? settings.weightUnit : 'reps';

  const points = useMemo(() => {
    if (!progress) return [];
    const all = progressSeries(progress.sets, progress.sessionDates, metric, settings.oneRmFormula);
    const filtered = range === 'all' ? all : all.filter((p) => p.date >= addDaysToKey(dateKey, -Number(range)));
    return filtered.map((p) => ({
      date: p.date,
      valor: metricDef.weighted ? round(weightToDisplay(p.value, settings.weightUnit), 1) : p.value,
    }));
  }, [progress, metric, range, settings, dateKey, metricDef.weighted]);

  const prs = useMemo(
    () => (progress ? personalRecords(progress.sets, settings.oneRmFormula) : undefined),
    [progress, settings.oneRmFormula],
  );

  if (exercises && exercises.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Sin ejercicios"
        description="Crea ejercicios y registra sesiones para ver tu progresión."
      />
    );
  }

  return (
    <div className="space-y-3">
      <select className="input" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
        {(exercises ?? []).map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
            {e.archived ? ' (archivado)' : ''}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          size="sm"
          value={metric}
          onChange={setMetric}
          options={METRICS.map((m) => ({ value: m.value, label: m.label }))}
        />
        <SegmentedControl size="sm" value={range} onChange={setRange} options={RANGES.map((r) => ({ ...r }))} />
      </div>

      <section className="card">
        {points.length < 1 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            Sin datos en este rango. Completa sesiones con este ejercicio.
          </p>
        ) : (
          <SimpleLineChart
            data={points}
            xKey="date"
            xFormatter={formatKeyShort}
            unit={metricDef.weighted ? ` ${settings.weightUnit}` : ''}
            lines={[{ key: 'valor', name: metricDef.label, color: '#6366f1', width: 2.5 }]}
          />
        )}
        <p className="mt-1 text-center text-[11px] text-zinc-400">
          {metric === 'estimatedOneRm' && '1RM estimado con la fórmula de Epley (no es una medición exacta).'}
          {metric === 'volume' && `Volumen = peso × reps de series efectivas (${unitLabel}).`}
        </p>
      </section>

      {prs && progress && progress.sessionCount > 0 && (
        <section className="card">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Award className="h-5 w-5 text-amber-500" /> Récords personales
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <PrStat label="Peso máximo" value={formatWeight(prs.maxWeightKg, settings.weightUnit)} />
            <PrStat label="Reps máximas" value={`${prs.maxReps}`} />
            <PrStat label="1RM estimado" value={formatWeight(prs.bestEstimatedOneRm, settings.weightUnit)} />
            <PrStat label="Volumen / sesión" value={`${round(weightToDisplay(prs.maxSessionVolume, settings.weightUnit))} ${settings.weightUnit}`} />
          </div>
          <p className="mt-3 text-xs text-zinc-400">{progress.sessionCount} sesiones registradas con este ejercicio.</p>
        </section>
      )}
    </div>
  );
}

function PrStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
