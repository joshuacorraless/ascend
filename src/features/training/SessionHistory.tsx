import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { Caret } from '@/components/ui/Caret';
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
  const sessions = useLiveQuery(
    () => getRepositories().workout.listSessions(),
    [],
    [] as WorkoutSession[],
  );

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
        title="Sin sesiones todavía"
        description="Cuando completes un entrenamiento, aparecerá aquí tu historial."
      />
    );
  }

  return (
    <ul className="space-y-2.5">
      {(sessions ?? []).map((s) => (
        <li key={s.id} className="card flex items-center gap-2 !py-3">
          <button
            onClick={() => navigate(`/entrenamiento/sesion/${s.id}`)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{s.name}</p>
              <p className="nums text-xs text-ink-muted">
                {formatKeyRelative(s.localDate, settings.timeZone)} ·{' '}
                {formatDuration(sessionDurationSeconds(s))}
              </p>
            </div>
            <Caret dir="right" className="shrink-0 text-ink-faint" />
          </button>
          <button
            onClick={() => remove(s)}
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:text-danger-600"
          >
            Quitar
          </button>
        </li>
      ))}
    </ul>
  );
}
