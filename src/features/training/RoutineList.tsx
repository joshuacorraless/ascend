import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { RoutineEditorModal } from './RoutineEditorModal';
import { startSessionFromRoutine } from './sessionActions';
import { useToday } from '@/app/hooks/useToday';
import { useToast } from '@/app/providers/toast';
import { useConfirm } from '@/app/providers/confirm';
import { getRepositories } from '@/lib/repositories';
import { newEntity } from '@/lib/factories';
import { WEEKDAY_LABELS } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import type { Exercise, WorkoutRoutine, WorkoutSession } from '@/lib/schema';

export function RoutineList() {
  const repos = getRepositories();
  const navigate = useNavigate();
  const { dateKey } = useToday();
  const { success } = useToast();
  const confirm = useConfirm();
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState<WorkoutRoutine | null>(null);

  const routines = useLiveQuery(
    () => repos.routines.list({ includeArchived: showArchived }),
    [showArchived],
    [] as WorkoutRoutine[],
  );
  const exercises = useLiveQuery(() => repos.exercises.list({ includeArchived: true }), [], [] as Exercise[]);
  const exById = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises]);
  const activeSession = useLiveQuery(() => repos.workout.getActiveSession(), []);

  const start = async (routine: WorkoutRoutine) => {
    const active: WorkoutSession | undefined = activeSession ?? undefined;
    if (active) {
      const ok = await confirm({
        title: 'Ya tienes una sesión activa',
        message: `"${active.name}" está en curso. ¿Descartarla y empezar "${routine.name}"?`,
        danger: true,
        confirmLabel: 'Descartar y empezar',
        cancelLabel: 'Seguir la actual',
      });
      if (!ok) {
        navigate(`/entrenamiento/sesion/${active.id}`);
        return;
      }
      await repos.workout.removeSession(active.id);
    }
    const id = await startSessionFromRoutine(routine, exById, dateKey);
    navigate(`/entrenamiento/sesion/${id}`);
  };

  const duplicate = async (routine: WorkoutRoutine) => {
    await repos.routines.put(
      newEntity<WorkoutRoutine>({
        name: `${routine.name} (copia)`,
        ...(routine.description ? { description: routine.description } : {}),
        daysOfWeek: routine.daysOfWeek,
        exercises: routine.exercises,
        active: false,
        archived: false,
      }),
    );
    success('Rutina duplicada.');
  };

  return (
    <div className="space-y-3">
      {activeSession && (
        <button
          onClick={() => navigate(`/entrenamiento/sesion/${activeSession.id}`)}
          className="card flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <p className="eyebrow text-brand-600">Sesión en curso</p>
            <p className="mt-1 truncate font-semibold text-ink">{activeSession.name}</p>
          </div>
          <span className="btn-primary !min-h-0 shrink-0 px-3.5 py-2 text-sm">Continuar</span>
        </button>
      )}

      <div className="flex items-center justify-between">
        <button className="btn-primary !min-h-0 px-3.5 py-2 text-sm" onClick={() => setCreating(true)}>
          Nueva rutina
        </button>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            className="accent-ink"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Ver archivadas
        </label>
      </div>

      {(routines ?? []).length === 0 ? (
        <EmptyState title="Sin rutinas" description="Crea tu primera rutina (Push, Pull, Pierna…)." />
      ) : (
        <ul className="space-y-2.5">
          {(routines ?? []).map((r) => (
            <li key={r.id} className={cn('card space-y-3', r.archived && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {r.active && !r.archived && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                    )}
                    <p className="truncate font-semibold text-ink">{r.name}</p>
                  </div>
                  <p className="nums mt-0.5 text-xs text-ink-muted">
                    {r.exercises.length} ejercicios
                    {r.daysOfWeek.length > 0 ? ` · ${r.daysOfWeek.map((d) => WEEKDAY_LABELS[d]).join(' ')}` : ''}
                  </p>
                </div>
                {!r.archived && (
                  <button className="btn-primary !min-h-0 shrink-0 px-3.5 py-2 text-sm" onClick={() => start(r)}>
                    Empezar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 border-t border-line pt-2.5">
                <ActionBtn label="Editar" onClick={() => setEdit(r)} />
                <ActionBtn label="Duplicar" onClick={() => duplicate(r)} />
                {!r.archived && (
                  <ActionBtn
                    label={r.active ? 'Quitar activa' : 'Marcar activa'}
                    onClick={() => repos.routines.put({ ...r, active: !r.active, updatedAt: new Date().toISOString() })}
                  />
                )}
                <ActionBtn
                  label={r.archived ? 'Restaurar' : 'Archivar'}
                  onClick={() => repos.routines.setArchived(r.id, !r.archived)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <RoutineEditorModal open={creating} onClose={() => setCreating(false)} />
      {edit && <RoutineEditorModal open onClose={() => setEdit(null)} initial={edit} />}
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg py-1.5 text-xs font-medium text-ink-muted transition hover:bg-canvas hover:text-ink"
    >
      {label}
    </button>
  );
}
