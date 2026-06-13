import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, ChevronRight, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { useConfirm } from '@/app/providers/confirm';
import { getRepositories } from '@/lib/repositories';
import { sessionDurationSeconds } from '@/lib/domain';
import { formatDuration, formatKeyRelative } from '@/lib/datetime';
import type { WorkoutSession } from '@/lib/schema';

export function SessionHistory() {
  const { settings } = useSettings();
  const { success } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const sessions = useLiveQuery(() => getRepositories().workout.listSessions(), [], [] as WorkoutSession[]);

  const remove = async (session: WorkoutSession) => {
    const ok = await confirm({
      title: 'Borrar sesión',
      message: `Se eliminará "${session.name}" y todas sus series registradas. Esta acción no se puede deshacer.`,
      danger: true,
      confirmLabel: 'Borrar',
      cancelLabel: 'Cancelar',
    });
    if (!ok) return;
    await getRepositories().workout.removeSession(session.id);
    success('Sesión eliminada.');
  };

  if ((sessions ?? []).length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sin sesiones todavía"
        description="Cuando completes un entrenamiento, aparecerá aquí tu historial."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {(sessions ?? []).map((s) => (
        <li key={s.id} className="card flex items-center gap-2">
          <button
            onClick={() => navigate(`/entrenamiento/sesion/${s.id}`)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-xs text-zinc-400">
                {formatKeyRelative(s.localDate, settings.timeZone)} · {formatDuration(sessionDurationSeconds(s))}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" />
          </button>
          <button
            onClick={() => remove(s)}
            aria-label={`Borrar ${s.name}`}
            className="shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
