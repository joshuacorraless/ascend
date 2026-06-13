import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowLeft, ArrowUp, Award, Minus } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { useExerciseProgress } from './useExerciseProgress';
import { useSettings } from '@/app/providers/settings';
import { useToday } from '@/app/hooks/useToday';
import { getRepositories } from '@/lib/repositories';
import {
  exerciseSessionSummaries,
  personalRecords,
  progressSeries,
  type ExerciseSessionSummary,
  type ProgressMetric,
} from '@/lib/domain';
import { addDaysToKey, formatKeyRelative, formatKeyShort } from '@/lib/datetime';
import { formatWeight, round, weightToDisplay } from '@/lib/units';
import { cn } from '@/lib/cn';

const METRICS: { value: ProgressMetric; label: string; weighted: boolean }[] = [
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

export function ExerciseDetailScreen() {
  const { exerciseId = '' } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { dateKey } = useToday();
  const unit = settings.weightUnit;

  const exercise = useLiveQuery(
    () => (exerciseId ? getRepositories().exercises.get(exerciseId) : Promise.resolve(undefined)),
    [exerciseId],
  );
  const progress = useExerciseProgress(exerciseId);
  const [metric, setMetric] = useState<ProgressMetric>('estimatedOneRm');
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('90');

  const metricDef = METRICS.find((m) => m.value === metric)!;

  const points = useMemo(() => {
    if (!progress) return [];
    const all = progressSeries(progress.sets, progress.sessionDates, metric, settings.oneRmFormula);
    const filtered = range === 'all' ? all : all.filter((p) => p.date >= addDaysToKey(dateKey, -Number(range)));
    return filtered.map((p) => ({
      date: p.date,
      valor: metricDef.weighted ? round(weightToDisplay(p.value, unit), 1) : p.value,
    }));
  }, [progress, metric, range, settings, dateKey, metricDef.weighted, unit]);

  const summaries = useMemo(
    () => (progress ? exerciseSessionSummaries(progress.sets, progress.sessionDates, settings.oneRmFormula) : []),
    [progress, settings.oneRmFormula],
  );
  const prs = useMemo(
    () => (progress ? personalRecords(progress.sets, settings.oneRmFormula) : undefined),
    [progress, settings.oneRmFormula],
  );

  const fmtW = (kg: number) => formatWeight(kg, unit);
  const fmtVol = (kg: number) => `${round(weightToDisplay(kg, unit))} ${unit}`;

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <header className="px-1">
        <h1 className="text-2xl font-black tracking-tight">{exercise?.name ?? 'Ejercicio'}</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {progress ? `${progress.sessionCount} sesión${progress.sessionCount === 1 ? '' : 'es'} registradas` : ''}
        </p>
      </header>

      {progress && progress.sessionCount === 0 ? (
        <EmptyState
          title="Aún sin datos"
          description="Completa una sesión con este ejercicio para ver gráficos e historial."
        />
      ) : (
        <>
          {/* Comparación última vs anterior */}
          {summaries.length >= 1 && (
            <Comparison last={summaries[0]!} prev={summaries[1]} fmtW={fmtW} fmtVol={fmtVol} />
          )}

          {/* Gráfico */}
          <section className="card space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedControl
                size="sm"
                value={metric}
                onChange={setMetric}
                options={METRICS.map((m) => ({ value: m.value, label: m.label }))}
              />
              <SegmentedControl size="sm" value={range} onChange={setRange} options={RANGES.map((r) => ({ ...r }))} />
            </div>
            {points.length < 1 ? (
              <p className="py-8 text-center text-sm text-zinc-500">Sin datos en este rango.</p>
            ) : (
              <SimpleLineChart
                data={points}
                xKey="date"
                xFormatter={formatKeyShort}
                unit={metricDef.weighted ? ` ${unit}` : ''}
                lines={[{ key: 'valor', name: metricDef.label, color: '#6366f1', width: 2.5 }]}
              />
            )}
            {metric === 'estimatedOneRm' && (
              <p className="text-center text-[11px] text-zinc-400">
                1RM estimado (fórmula de Epley); no es una medición exacta.
              </p>
            )}
          </section>

          {/* Récords */}
          {prs && (
            <section className="card">
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <Award className="h-5 w-5 text-amber-500" /> Récords personales
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Pr label="Peso máximo" value={fmtW(prs.maxWeightKg)} />
                <Pr label="Reps máximas" value={`${prs.maxReps}`} />
                <Pr label="1RM estimado" value={fmtW(prs.bestEstimatedOneRm)} />
                <Pr label="Volumen / sesión" value={fmtVol(prs.maxSessionVolume)} />
              </div>
            </section>
          )}

          {/* Historial real */}
          <section className="space-y-2">
            <h2 className="px-1 font-bold">Historial</h2>
            <ul className="space-y-2">
              {summaries.map((s) => (
                <li key={s.sessionId} className="card">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <p className="text-sm font-semibold capitalize">
                      {formatKeyRelative(s.date, settings.timeZone)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {s.workingSets} series · {s.totalReps} reps · {fmtVol(s.volume)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.sets.map((set) => (
                      <span
                        key={set.id}
                        className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {round(weightToDisplay(set.weightKg, unit), 1)}×{set.reps}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

// ── Comparación última vs anterior sesión ────────────────────────────────────
function Comparison({
  last,
  prev,
  fmtW,
  fmtVol,
}: {
  last: ExerciseSessionSummary;
  prev: ExerciseSessionSummary | undefined;
  fmtW: (kg: number) => string;
  fmtVol: (kg: number) => string;
}) {
  return (
    <section className="card">
      <h2 className="mb-1 font-bold">Última sesión vs anterior</h2>
      <p className="mb-3 text-xs text-zinc-400">
        {prev ? 'Comparado con tu sesión previa de este ejercicio.' : 'Aún no hay una sesión previa para comparar.'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Peso máx" current={fmtW(last.maxWeightKg)} delta={prev ? last.maxWeightKg - prev.maxWeightKg : undefined} display={(d) => fmtW(Math.abs(d))} />
        <Metric label="Volumen" current={fmtVol(last.volume)} delta={prev ? last.volume - prev.volume : undefined} display={(d) => fmtVol(Math.abs(d))} />
        <Metric label="Reps totales" current={`${last.totalReps}`} delta={prev ? last.totalReps - prev.totalReps : undefined} display={(d) => `${Math.abs(d)}`} />
        <Metric label="Series" current={`${last.workingSets}`} delta={prev ? last.workingSets - prev.workingSets : undefined} display={(d) => `${Math.abs(d)}`} />
      </div>
    </section>
  );
}

function Metric({
  label,
  current,
  delta,
  display,
}: {
  label: string;
  current: string;
  delta: number | undefined;
  display: (d: number) => string;
}) {
  const dir = delta === undefined || Math.abs(delta) < 1e-6 ? 0 : delta > 0 ? 1 : -1;
  const Icon = dir > 0 ? ArrowUp : dir < 0 ? ArrowDown : Minus;
  return (
    <div className="rounded-2xl bg-stone-100/75 px-3 py-2 dark:bg-zinc-800/50">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-black">{current}</p>
      {delta !== undefined && (
        <p
          className={cn(
            'mt-0.5 flex items-center gap-1 text-xs font-semibold',
            dir > 0 ? 'text-emerald-600 dark:text-emerald-400' : dir < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400',
          )}
        >
          <Icon className="h-3 w-3" /> {dir === 0 ? 'igual' : display(delta)}
        </p>
      )}
    </div>
  );
}

function Pr({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-100/75 px-3 py-2 dark:bg-zinc-800/50">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}
