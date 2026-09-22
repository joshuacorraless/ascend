import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { Caret } from '@/components/ui/Caret';
import { useExerciseProgress } from './useExerciseProgress';
import { useSettings } from '@/app/providers/settings';
import { useToday } from '@/app/hooks/useToday';
import { getRepositories } from '@/lib/repositories';
import { addDaysToKey, formatKeyRelative, formatKeyShort, localTime } from '@/lib/datetime';
import { formatWeight } from '@/lib/units';
import {
  buildSetSessions,
  compareSessionSets,
  setChartData,
  type SetChange,
  type SetSession,
} from './setPerformance';
import type { SetLog, WeightUnit } from '@/lib/schema';

const COLORS = ['#8DD9B0', '#7FB5F2', '#F3C979', '#D6A6F2', '#F1A6A6', '#77D4D1'];
const RANGES = [
  { value: '28', label: '4 sem' },
  { value: '84', label: '12 sem' },
  { value: 'all', label: 'Todo' },
] as const;
const CHANGES: Record<SetChange, { label: string; style: string }> = {
  progress: { label: '↑ Avance', style: 'text-brand-500' },
  regress: { label: '↓ Retroceso', style: 'text-danger-400' },
  same: { label: '= Igual', style: 'text-ink-muted' },
  mixed: { label: '↕ Mixto', style: 'text-macro-carbs' },
  harder: { label: 'Más esfuerzo', style: 'text-macro-carbs' },
  new: { label: 'Nueva', style: 'text-ink-muted' },
  missing: { label: 'Sin registro', style: 'text-ink-muted' },
  ambiguous: { label: 'Revisar', style: 'text-macro-carbs' },
};

export function ExerciseDetailScreen() {
  const { exerciseId = '', routineId } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { dateKey } = useToday();
  const unit = settings.weightUnit;
  const exercise = useLiveQuery(
    () => (exerciseId ? getRepositories().exercises.get(exerciseId) : Promise.resolve(undefined)),
    [exerciseId],
  );
  const routine = useLiveQuery(
    () => (routineId ? getRepositories().routines.get(routineId) : Promise.resolve(undefined)),
    [routineId],
  );
  const progress = useExerciseProgress(exerciseId, routineId);
  const [metric, setMetric] = useState<'weight' | 'reps' | 'rir'>('weight');
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('84');
  const [selectedSet, setSelectedSet] = useState<number | 'all'>('all');
  const sessions = useMemo(
    () =>
      progress
        ? buildSetSessions(progress.sets, progress.sessionDates, progress.sessionStarts)
        : [],
    [progress],
  );
  const filtered = useMemo(
    () =>
      sessions.filter(
        (session) => range === 'all' || session.date >= addDaysToKey(dateKey, -Number(range) + 1),
      ),
    [sessions, range, dateKey],
  );
  const chart = useMemo(() => setChartData(filtered, metric, unit), [filtered, metric, unit]);
  const visibleNumbers =
    selectedSet === 'all'
      ? chart.numbers
      : chart.numbers.filter((number) => number === selectedSet);
  const latest = sessions.at(-1);
  const previous = sessions.at(-2);
  const sessionLabel = (id: string) => {
    const session = sessions.find((entry) => entry.sessionId === id);
    return session
      ? `${formatKeyShort(session.date)}${session.startedAt ? ` · ${localTime(new Date(session.startedAt), settings.timeZone)}` : ''}`
      : '';
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(routineId ? `/progreso/rutina/${routineId}` : '/progreso')}
        className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <Caret dir="left" /> {routine?.name ?? 'Progreso'}
      </button>
      <header className="px-1">
        <p className="eyebrow mb-2">
          {routineId ? 'Rutina / Ejercicio' : 'Ejercicio / Todas las rutinas'}
        </p>
        <h1 className="text-2xl font-semibold text-ink">
          {exercise?.name ?? 'Ejercicio anterior'}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">Peso, repeticiones y RIR, serie por serie.</p>
      </header>
      {routineId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 text-xs">
          <span className="text-ink-muted">Solo {routine?.name ?? 'esta rutina'}</span>
          <Link className="font-semibold text-brand-500" to={`/progreso/ejercicio/${exerciseId}`}>
            Ver todas las rutinas
          </Link>
        </div>
      )}
      {!progress ? (
        <p className="py-12 text-center text-sm text-ink-muted">Cargando tus series…</p>
      ) : !latest ? (
        <EmptyState
          title="Aún sin series registradas"
          description="Completa las series de este ejercicio y termina el entrenamiento para compararlas aquí."
        />
      ) : (
        <>
          <section className="card space-y-4">
            <div>
              <h2 className="text-base font-semibold text-ink">De una sesión a la siguiente</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Cada línea sigue la misma serie. Toca un punto para ver peso y reps juntos.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedControl
                size="sm"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: 'weight', label: `Peso (${unit})` },
                  { value: 'reps', label: 'Reps' },
                  { value: 'rir', label: 'RIR' },
                ]}
              />
              <SegmentedControl
                size="sm"
                value={range}
                onChange={(value) => {
                  setRange(value);
                  setSelectedSet('all');
                }}
                options={RANGES.map((entry) => ({ ...entry }))}
              />
            </div>
            {chart.data.length ? (
              <>
                {chart.data.some((point) =>
                  visibleNumbers.some((number) => typeof point[`set_${number}`] === 'number'),
                ) ? (
                  <SimpleLineChart
                    data={chart.data}
                    xKey="sessionId"
                    xFormatter={sessionLabel}
                    integer={metric === 'reps'}
                    unit={metric === 'weight' ? ` ${unit}` : metric === 'reps' ? ' reps' : ' RIR'}
                    connectNulls={false}
                    showDots
                    lines={visibleNumbers.map((number) => ({
                      key: `set_${number}`,
                      name: `Serie ${number}`,
                      color: COLORS[(number - 1) % COLORS.length]!,
                      dashed: number > COLORS.length,
                    }))}
                    tooltipValueFormatter={(_value, key, point) =>
                      `${point[`${key}_weight`]} ${unit} × ${point[`${key}_reps`]} reps${point[`${key}_effort`] ? ` · ${point[`${key}_effort`]}` : ''}`
                    }
                  />
                ) : (
                  <p className="py-10 text-center text-sm text-ink-muted">
                    {metric === 'rir'
                      ? 'Aún no hay RIR registrado para estas series.'
                      : 'Sin valores comparables para estas series.'}
                  </p>
                )}
                <div className="flex flex-wrap gap-2" aria-label="Series del gráfico">
                  <button
                    className={`chip ${selectedSet === 'all' ? 'chip-active' : ''}`}
                    aria-pressed={selectedSet === 'all'}
                    onClick={() => setSelectedSet('all')}
                  >
                    Todas
                  </button>
                  {chart.numbers.map((number) => (
                    <button
                      key={number}
                      className={`chip gap-2 ${selectedSet === number ? 'chip-active' : ''}`}
                      aria-pressed={selectedSet === number}
                      onClick={() => setSelectedSet(number)}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: COLORS[(number - 1) % COLORS.length] }}
                        aria-hidden
                      />
                      Serie {number}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-faint">
                  Las series sin registrar dejan un espacio; no se cuentan como cero.
                </p>
                {metric === 'rir' && (
                  <p className="text-xs text-ink-muted">
                    RIR = repeticiones que te quedaban. Más RIR con el mismo peso y reps indica más
                    reserva. Si no lo registraste, el punto queda vacío.
                  </p>
                )}
              </>
            ) : (
              <p className="py-8 text-center text-sm text-ink-muted">Sin series en este rango.</p>
            )}
          </section>

          <Comparison
            current={latest}
            previous={previous}
            unit={unit}
            sessionLabel={sessionLabel}
          />

          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-base font-semibold text-ink">Tus sesiones</h2>
              <span className="text-xs text-ink-muted">{sessions.length} registradas</span>
            </div>
            <ul className="space-y-3">
              {[...sessions].reverse().map((session) => (
                <li key={session.sessionId} className="card !p-4">
                  <p className="mb-3 text-sm font-semibold capitalize text-ink">
                    {formatKeyRelative(session.date, settings.timeZone)}
                    {session.startedAt &&
                      ` · ${localTime(new Date(session.startedAt), settings.timeZone)}`}
                  </p>
                  <div className="divide-y divide-line">
                    {session.sets.map((set) => (
                      <div key={set.id} className="flex items-baseline justify-between gap-3 py-2">
                        <span className="text-xs text-ink-muted">Serie {set.setNumber}</span>
                        <span className="nums text-right text-sm font-medium text-ink">
                          {formatWeight(set.weightKg, unit)} × {set.reps} reps
                          {(set.rir !== undefined || set.rpe !== undefined) && (
                            <span className="ml-2 text-xs font-normal text-ink-muted">
                              {set.rir !== undefined ? `RIR ${set.rir}` : `RPE ${set.rpe}`}
                            </span>
                          )}
                        </span>
                      </div>
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

function SetValue({ set, unit }: { set: SetLog | undefined; unit: WeightUnit }) {
  if (!set) return <span className="text-ink-faint">—</span>;
  return (
    <span className="nums whitespace-nowrap">
      {formatWeight(set.weightKg, unit)}
      <span className="block text-ink-muted">
        × {set.reps} reps
        {set.rir !== undefined
          ? ` · RIR ${set.rir}`
          : set.rpe !== undefined
            ? ` · RPE ${set.rpe}`
            : ''}
      </span>
    </span>
  );
}

function Comparison({
  current,
  previous,
  unit,
  sessionLabel,
}: {
  current: SetSession;
  previous?: SetSession;
  unit: WeightUnit;
  sessionLabel: (id: string) => string;
}) {
  const rows = compareSessionSets(current, previous);
  return (
    <section className="card !px-4">
      <h2 className="text-base font-semibold text-ink">Última vs. anterior</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        {previous
          ? `${sessionLabel(previous.sessionId)} → ${sessionLabel(current.sessionId)}`
          : 'Tu primera referencia. La próxima sesión se comparará serie por serie.'}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-ink-muted">
            <tr>
              <th className="pb-2 font-medium">Serie</th>
              <th className="pb-2 font-medium">Anterior</th>
              <th className="pb-2 font-medium">Última</th>
              <th className="pb-2 text-right font-medium">Cambio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.setNumber}>
                <th className="py-3 pr-2 align-top font-medium">{row.setNumber}</th>
                <td className="py-3 pr-2 align-top">
                  <SetValue set={row.previous} unit={unit} />
                </td>
                <td className="py-3 pr-2 align-top">
                  <SetValue set={row.current} unit={unit} />
                </td>
                <td
                  className={`py-3 text-right align-top font-medium ${CHANGES[row.change].style}`}
                >
                  {CHANGES[row.change].label}
                  {row.current && row.previous && (
                    <span className="mt-1 block text-2xs font-normal text-ink-muted">
                      {row.reserveDelta === undefined
                        ? 'RIR sin comparar'
                        : row.reserveDelta === 0
                          ? 'Mismo RIR'
                          : `${row.reserveDelta > 0 ? '+' : ''}${row.reserveDelta} RIR`}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        Avance: más peso o reps sin bajar el otro, o más RIR con ambos iguales. Si progresaste
        usando menos reserva, el cambio es mixto. Sin RIR comparable, la señal solo refleja peso y
        reps; considera también la técnica.
      </p>
      {rows.some((row) => row.change === 'ambiguous') && (
        <p className="mt-2 text-xs text-macro-carbs">
          Hay números de serie repetidos en una sesión; revisa el historial antes de compararlos.
        </p>
      )}
    </section>
  );
}
