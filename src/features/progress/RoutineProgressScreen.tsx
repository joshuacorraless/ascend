import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRoutineProgress } from './useRoutineProgress';
import { MUSCLE_LABELS } from '@/features/training/constants';
import { useSettings } from '@/app/providers/settings';
import { getRepositories } from '@/lib/repositories';
import { WEEKDAY_LABELS, formatKeyRelative, formatKeyShort } from '@/lib/datetime';
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

  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data.sessions]
      .sort((a, b) => a.session.localDate.localeCompare(b.session.localDate))
      .map((s) => ({
        date: s.session.localDate,
        volumen: round(weightToDisplay(s.volume, unit), 1),
      }));
  }, [data, unit]);

  if (data === undefined) {
    return <p className="py-20 text-center text-sm text-zinc-400">Cargando…</p>;
  }
  if (!data.routine) {
    return (
      <div className="space-y-4">
        <BackBar onBack={() => navigate('/progreso')} />
        <EmptyState title="Rutina no encontrada" description="Puede que se haya archivado o eliminado." />
      </div>
    );
  }

  const routine = data.routine;
  const orderedExercises = [...routine.exercises].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <BackBar onBack={() => navigate('/progreso')} />

      <header className="px-1">
        <h1 className="text-2xl font-black tracking-tight">{routine.name}</h1>
        {routine.daysOfWeek.length > 0 && (
          <p className="mt-1 text-sm text-zinc-500">
            {routine.daysOfWeek.map((d) => WEEKDAY_LABELS[d]).join(' · ')}
          </p>
        )}
      </header>

      {/* Progreso general */}
      <section className="card grid grid-cols-3 gap-2 text-center">
        <Stat label="Sesiones" value={`${data.sessionCount}`} />
        <Stat label="Por semana" value={`${data.perWeek}`} />
        <Stat label="Última" value={data.lastDate ? formatKeyRelative(data.lastDate, settings.timeZone) : '—'} />
      </section>

      {chartData.length >= 2 && (
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Volumen por sesión ({unit})
          </h2>
          <SimpleLineChart
            data={chartData}
            xKey="date"
            xFormatter={formatKeyShort}
            unit={` ${unit}`}
            lines={[{ key: 'volumen', name: 'Volumen', color: '#14b8a6', width: 2.5 }]}
          />
        </section>
      )}

      {/* Ejercicios */}
      <section className="space-y-2">
        <h2 className="px-1 font-bold">Ejercicios</h2>
        {orderedExercises.length === 0 ? (
          <p className="px-1 text-sm text-zinc-500">Esta rutina no tiene ejercicios.</p>
        ) : (
          <ul className="space-y-2">
            {orderedExercises.map((rex) => {
              const ex = exById.get(rex.exerciseId);
              return (
                <li key={rex.exerciseId}>
                  <button
                    onClick={() => navigate(`/progreso/ejercicio/${rex.exerciseId}`)}
                    className="card flex w-full items-center gap-3 text-left transition hover:-translate-y-0.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{ex?.name ?? 'Ejercicio'}</p>
                      <p className="text-xs text-zinc-400">
                        {ex ? MUSCLE_LABELS[ex.primaryMuscle] : ''} · {rex.targetSets}×{rex.repRangeMin}-{rex.repRangeMax}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" />
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
    <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
      <ArrowLeft className="h-4 w-4" /> Progreso
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-black capitalize">{value}</p>
    </div>
  );
}
