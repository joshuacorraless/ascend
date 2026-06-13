import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Archive, ArchiveRestore, Copy, Dumbbell, Pencil, Play, Plus, Star } from 'lucide-react';
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
          className="flex w-full items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-left dark:border-amber-800 dark:bg-amber-950/40"
        >
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Sesión en curso</p>
            <p className="font-semibold">{activeSession.name}</p>
          </div>
          <span className="btn-primary !min-h-0 !px-3 !py-1.5 text-sm">Continuar</span>
        </button>
      )}

      <div className="flex items-center justify-between">
        <button className="btn-primary !min-h-0 !px-3 !py-1.5 text-sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nueva rutina
        </button>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Ver archivadas
        </label>
      </div>

      {(routines ?? []).length === 0 ? (
        <EmptyState icon={Dumbbell} title="Sin rutinas" description="Crea tu primera rutina (Push, Pull, Pierna…)." />
      ) : (
        <ul className="space-y-2">
          {(routines ?? []).map((r) => (
            <li key={r.id} className={cn('card space-y-3', r.archived && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold">{r.name}</p>
                    {r.active && !r.archived && <Star className="h-3.5 w-3.5 shrink-0 fill-brand-400 text-brand-400" />}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {r.exercises.length} ejercicios
                    {r.daysOfWeek.length > 0 ? ` · ${r.daysOfWeek.map((d) => WEEKDAY_LABELS[d]).join(' ')}` : ''}
                  </p>
                </div>
                {!r.archived && (
                  <button className="btn-primary !min-h-0 shrink-0 !px-3 !py-1.5 text-sm" onClick={() => start(r)}>
                    <Play className="h-4 w-4" /> Empezar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                <ActionBtn icon={Pencil} label="Editar" onClick={() => setEdit(r)} />
                <ActionBtn icon={Copy} label="Duplicar" onClick={() => duplicate(r)} />
                {!r.archived && (
                  <ActionBtn
                    icon={Star}
                    label={r.active ? 'Quitar activa' : 'Marcar activa'}
                    onClick={() => repos.routines.put({ ...r, active: !r.active, updatedAt: new Date().toISOString() })}
                  />
                )}
                <ActionBtn
                  icon={r.archived ? ArchiveRestore : Archive}
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

function ActionBtn({ icon: Icon, label, onClick }: { icon: typeof Pencil; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-brand-600 dark:hover:bg-zinc-800">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
