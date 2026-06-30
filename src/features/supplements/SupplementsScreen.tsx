import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SupplementFormModal } from './SupplementFormModal';
import { SUPPLEMENT_TIME_LABELS } from './constants';
import { setSupplementCompleted } from './logActions';
import { useToday } from '@/app/hooks/useToday';
import { getRepositories } from '@/lib/repositories';
import { addDaysToKey, formatKeyShort, rangeOfKeys, weekdayOfKey } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import type { Supplement, SupplementLog } from '@/lib/schema';

export function SupplementsScreen() {
  const repos = getRepositories();
  const { dateKey, weekday } = useToday();
  const [edit, setEdit] = useState<Supplement | null>(null);
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const supplements = useLiveQuery(
    () => repos.supplements.list({ includeArchived: showArchived }),
    [showArchived],
    [] as Supplement[],
  );
  const todayLogs = useLiveQuery(
    () => repos.supplementLogs.listByDate(dateKey),
    [dateKey],
    [] as SupplementLog[],
  );
  const history = useLiveQuery(async () => {
    const sups = await repos.supplements.list();
    const days = rangeOfKeys(addDaysToKey(dateKey, -6), dateKey);
    return Promise.all(
      days.map(async (d) => {
        const wd = weekdayOfKey(d);
        const scheduled = sups.filter((s) => s.daysOfWeek.length === 0 || s.daysOfWeek.includes(wd));
        const logs = await repos.supplementLogs.listByDate(d);
        const completed = logs.filter((l) => l.completed).length;
        return { date: d, scheduled: scheduled.length, completed };
      }),
    );
  }, [dateKey]);

  const logBySupp = new Map((todayLogs ?? []).map((l) => [l.supplementId, l]));
  const active = (supplements ?? []).filter((s) => !s.archived);
  const scheduledToday = active.filter(
    (s) => s.daysOfWeek.length === 0 || s.daysOfWeek.includes(weekday),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Rutina diaria"
        title="Suplementos"
        right={
          <button className="btn-primary !min-h-0 px-3.5 py-2 text-sm" onClick={() => setCreating(true)}>
            Nuevo
          </button>
        }
      />

      {/* Checklist de hoy */}
      <section className="card">
        <h2 className="mb-3 text-base font-semibold text-ink">Hoy</h2>
        {scheduledToday.length === 0 ? (
          <p className="text-sm text-ink-muted">No hay suplementos programados para hoy.</p>
        ) : (
          <div className="-mx-2">
            {scheduledToday.map((s) => {
              const completed = logBySupp.get(s.id)?.completed ?? false;
              return (
                <button
                  key={s.id}
                  onClick={() => setSupplementCompleted(s, dateKey, !completed)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-canvas"
                >
                  <span
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full border transition duration-200 ease-ascend',
                      completed ? 'border-brand-500 bg-brand-500' : 'border-line',
                    )}
                    aria-hidden
                  >
                    {completed && <span className="h-2 w-2 rounded-full bg-canvas" />}
                  </span>
                  <span className="flex-1">
                    <span className={cn('text-sm font-medium', completed ? 'text-ink-faint line-through' : 'text-ink')}>
                      {s.name}
                    </span>
                    <span className="ml-2 text-xs text-ink-muted">
                      {s.dose ? `${s.dose} · ` : ''}
                      {SUPPLEMENT_TIME_LABELS[s.time]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Adherencia 7 días */}
      {history && history.some((d) => d.scheduled > 0) && (
        <section className="card">
          <h2 className="mb-4 text-base font-semibold text-ink">Últimos 7 días</h2>
          <div className="flex justify-between gap-1">
            {history.map((d) => {
              const ratio = d.scheduled > 0 ? d.completed / d.scheduled : 0;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={cn(
                      'nums grid h-9 w-9 place-items-center rounded-full text-xs font-bold',
                      d.scheduled === 0
                        ? 'border border-line text-ink-faint'
                        : ratio >= 1
                          ? 'bg-brand-500 text-[#10271b]'
                          : ratio > 0
                            ? 'bg-brand-500/30 text-ink'
                            : 'bg-inset text-ink-muted',
                    )}
                  >
                    {d.scheduled > 0 ? `${d.completed}/${d.scheduled}` : '–'}
                  </div>
                  <span className="text-2xs text-ink-faint">{formatKeyShort(d.date).split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Gestión */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-ink">Mis suplementos</h2>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <input
              type="checkbox"
              className="accent-ink"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Ver archivados
          </label>
        </div>
        {(supplements ?? []).length === 0 ? (
          <EmptyState
            title="Sin suplementos"
            description="Crea tu primer suplemento para verlo en tu checklist diario."
          />
        ) : (
          <ul className="space-y-2.5">
            {(supplements ?? []).map((s) => (
              <li key={s.id} className={cn('card !p-4', s.archived && 'opacity-60')}>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-ink-muted">
                    {s.dose ? `${s.dose} · ` : ''}
                    {SUPPLEMENT_TIME_LABELS[s.time]} ·{' '}
                    {s.daysOfWeek.length === 0 ? 'todos los días' : `${s.daysOfWeek.length} día(s)`}
                  </p>
                </div>
                <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2.5">
                  <button
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-canvas hover:text-ink"
                    onClick={() => setEdit(s)}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-canvas hover:text-ink"
                    onClick={() => repos.supplements.setArchived(s.id, !s.archived)}
                  >
                    {s.archived ? 'Restaurar' : 'Archivar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SupplementFormModal open={creating} onClose={() => setCreating(false)} />
      {edit && <SupplementFormModal open onClose={() => setEdit(null)} initial={edit} />}
    </div>
  );
}
