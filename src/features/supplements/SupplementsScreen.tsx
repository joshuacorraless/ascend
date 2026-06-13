import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Archive, ArchiveRestore, Check, Pencil, Pill, Plus } from 'lucide-react';
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
    <div className="space-y-4">
      <PageHeader
        title="Suplementos"
        right={
          <button className="btn-primary !min-h-0 !px-3 !py-1.5 text-sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        }
      />

      {/* Checklist de hoy */}
      <section className="card">
        <h2 className="mb-2 font-semibold">Hoy</h2>
        {scheduledToday.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay suplementos programados para hoy.</p>
        ) : (
          <div className="-mx-2">
            {scheduledToday.map((s) => {
              const completed = logBySupp.get(s.id)?.completed ?? false;
              return (
                <button
                  key={s.id}
                  onClick={() => setSupplementCompleted(s, dateKey, !completed)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition',
                      completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300 text-transparent dark:border-zinc-600',
                    )}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="flex-1">
                    <span className={cn('font-medium', completed && 'text-zinc-400 line-through')}>{s.name}</span>
                    <span className="ml-2 text-xs text-zinc-400">
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
          <h2 className="mb-3 font-semibold">Últimos 7 días</h2>
          <div className="flex justify-between gap-1">
            {history.map((d) => {
              const ratio = d.scheduled > 0 ? d.completed / d.scheduled : 0;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn(
                      'grid h-9 w-9 place-items-center rounded-full text-xs font-semibold',
                      d.scheduled === 0
                        ? 'bg-zinc-100 text-zinc-300 dark:bg-zinc-800'
                        : ratio >= 1
                          ? 'bg-emerald-500 text-white'
                          : ratio > 0
                            ? 'bg-amber-400 text-white'
                            : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800',
                    )}
                  >
                    {d.scheduled > 0 ? `${d.completed}/${d.scheduled}` : '–'}
                  </div>
                  <span className="text-[10px] text-zinc-400">{formatKeyShort(d.date).split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Gestión */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-semibold">Mis suplementos</h2>
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Ver archivados
          </label>
        </div>
        {(supplements ?? []).length === 0 ? (
          <EmptyState
            icon={Pill}
            title="Sin suplementos"
            description="Crea tu primer suplemento para verlo en tu checklist diario."
          />
        ) : (
          <ul className="space-y-2">
            {(supplements ?? []).map((s) => (
              <li key={s.id} className={cn('card flex items-center gap-3 !p-3', s.archived && 'opacity-60')}>
                <Pill className="h-5 w-5 shrink-0 text-brand-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="text-xs text-zinc-400">
                    {s.dose ? `${s.dose} · ` : ''}
                    {SUPPLEMENT_TIME_LABELS[s.time]} ·{' '}
                    {s.daysOfWeek.length === 0 ? 'todos los días' : `${s.daysOfWeek.length} día(s)`}
                  </p>
                </div>
                <button className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-brand-600 dark:hover:bg-zinc-800" onClick={() => setEdit(s)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-brand-600 dark:hover:bg-zinc-800"
                  onClick={() => repos.supplements.setArchived(s.id, !s.archived)}
                  aria-label={s.archived ? 'Restaurar' : 'Archivar'}
                >
                  {s.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </button>
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
