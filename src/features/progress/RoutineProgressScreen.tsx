import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { Caret } from '@/components/ui/Caret';
import { exerciseSessionSummaries } from '@/lib/domain';
import { useRoutineProgress } from './useRoutineProgress';
import { MUSCLE_LABELS } from '@/features/training/constants';
import { useSettings } from '@/app/providers/settings';
import { getRepositories } from '@/lib/repositories';
import { WEEKDAY_LABELS, formatKeyRelative } from '@/lib/datetime';
import { round, weightToDisplay } from '@/lib/units';
import type { Exercise } from '@/lib/schema';

export function RoutineProgressScreen() {
  const { routineId = '' } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const unit = settings.weightUnit;

  const data = useRoutineProgress(routineId);
  const exercises = useLiveQuery(
    () => getRepositories().exercises.list({ includeArchived: true }),
    [],
    [] as Exercise[],
  );
  const exById = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises]);

  if (data === undefined) {
    return <p className="py-20 text-center text-sm text-ink-muted">Cargando…</p>;
  }
  if (!data.routine) {
    return (
      <div className="space-y-5">
        <BackBar onBack={() => navigate('/progreso')} />
        <EmptyState
          title="Rutina no encontrada"
          description="Puede que se haya archivado o eliminado."
        />
      </div>
    );
  }

  const routine = data.routine;
  const orderedExercises = [...routine.exercises]
    .sort((a, b) => a.order - b.order)
    .map((exercise) => ({ ...exercise, historical: false }));
  const currentIds = new Set(orderedExercises.map((exercise) => exercise.exerciseId));
  const historicalIds = new Set(
    data.sessions
      .flatMap((session) => session.sets)
      .filter((set) => set.completed && set.setType !== 'calentamiento')
      .map((set) => set.exerciseId),
  );
  for (const id of historicalIds) {
    if (!currentIds.has(id)) {
      orderedExercises.push({
        exerciseId: id,
        order: orderedExercises.length,
        targetSets: 0,
        repRangeMin: 0,
        repRangeMax: 0,
        historical: true,
      });
    }
  }

  return (
    <div className="space-y-5">
      <BackBar onBack={() => navigate('/progreso')} />

      <header className="px-1">
        <p className="eyebrow mb-2">Progreso / Rutina</p>
        <h1 className="text-2xl font-semibold text-ink">{routine.name}</h1>
        {routine.daysOfWeek.length > 0 && (
          <p className="mt-1 text-sm text-ink-muted">
            {routine.daysOfWeek.map((d) => WEEKDAY_LABELS[d]).join(' · ')}
          </p>
        )}
      </header>

      {/* Progreso general */}
      <section className="card grid grid-cols-3 gap-2 text-center">
        <Stat label="Sesiones" value={`${data.sessionCount}`} />
        <Stat label="Por semana" value={`${data.perWeek}`} />
        <Stat
          label="Última"
          value={data.lastDate ? formatKeyRelative(data.lastDate, settings.timeZone) : '—'}
        />
      </section>

      {data.sessionCount === 0 && (
        <p className="rounded-xl border border-dashed border-line p-5 text-sm text-ink-muted">
          Tu primer entrenamiento completado aparecerá aquí.
        </p>
      )}

      {/* Ejercicios */}
      <section className="space-y-2.5">
        <div className="px-1">
          <h2 className="text-base font-semibold text-ink">Ejercicio por ejercicio</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Abre un ejercicio para comparar cada serie con las semanas anteriores.
          </p>
        </div>
        {orderedExercises.length === 0 ? (
          <p className="px-1 text-sm text-ink-muted">Esta rutina no tiene ejercicios.</p>
        ) : (
          <ul className="space-y-2.5">
            {orderedExercises.map((rex) => {
              const ex = exById.get(rex.exerciseId);
              const history = exerciseSessionSummaries(
                data.sessions.flatMap((s) => s.sets).filter((s) => s.exerciseId === rex.exerciseId),
                new Map(data.sessions.map((s) => [s.session.id, s.session.localDate])),
                settings.oneRmFormula,
                new Map(data.sessions.map((s) => [s.session.id, s.session.startedAt])),
              );
              const last = history[0];
              return (
                <li key={rex.exerciseId}>
                  <button
                    onClick={() =>
                      navigate(`/progreso/rutina/${routineId}/ejercicio/${rex.exerciseId}`)
                    }
                    className="card flex w-full items-center gap-3 text-left transition duration-200 ease-ascend hover:-translate-y-0.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {ex?.name ?? 'Ejercicio anterior'}
                      </p>
                      <p className="nums text-xs text-ink-muted">
                        {ex ? `${MUSCLE_LABELS[ex.primaryMuscle]} · ` : ''}
                        {rex.historical ? (
                          'En tu historial · fuera del plan actual'
                        ) : (
                          <>
                            {rex.targetSets} series ·{' '}
                            {rex.prescribedSets?.length
                              ? 'objetivos por serie'
                              : rex.toFailure
                                ? 'al fallo'
                                : `${rex.repRangeMin}–${rex.repRangeMax} reps`}
                          </>
                        )}
                      </p>
                      <div className="nums mt-3 space-y-1 text-xs text-ink-soft">
                        {last ? (
                          <>
                            <p className="mb-1 text-ink-muted">
                              Última sesión · {formatKeyRelative(last.date, settings.timeZone)}
                            </p>
                            {last.sets.map((set) => (
                              <p key={set.id}>
                                Serie {set.setNumber}{' '}
                                <span className="ml-2 font-semibold">
                                  {round(weightToDisplay(set.weightKg, unit), 1)} {unit} ×{' '}
                                  {set.reps} reps
                                  {set.rir !== undefined && ` · RIR ${set.rir}`}
                                </span>
                              </p>
                            ))}
                          </>
                        ) : (
                          <p>Sin registros todavía</p>
                        )}
                      </div>
                    </div>
                    <Caret dir="right" className="shrink-0 text-ink-faint" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
    >
      <Caret dir="left" /> Progreso
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="nums mt-1 font-semibold capitalize text-ink">{value}</p>
    </div>
  );
}
