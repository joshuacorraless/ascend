import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSettings } from '@/app/providers/settings';
import { getRepositories } from '@/lib/repositories';
import { sessionDurationSeconds } from '@/lib/domain';
import { formatDuration, formatKeyRelative } from '@/lib/datetime';
import type { WorkoutSession } from '@/lib/schema';

export function SessionHistory() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const sessions = useLiveQuery(() => getRepositories().workout.listSessions(), [], [] as WorkoutSession[]);

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
        <li key={s.id}>
          <button
            onClick={() => navigate(`/entrenamiento/sesion/${s.id}`)}
            className="card flex w-full items-center gap-3 text-left"
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
        </li>
      ))}
    </ul>
  );
}
