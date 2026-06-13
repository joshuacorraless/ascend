import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Scale, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { WeightQuickAddModal } from './WeightQuickAddModal';
import { useSettings } from '@/app/providers/settings';
import { useToday } from '@/app/hooks/useToday';
import { useConfirm } from '@/app/providers/confirm';
import { getRepositories } from '@/lib/repositories';
import { bodyWeightStats, withMovingAverage } from '@/lib/domain';
import { formatKeyRelative, formatKeyShort } from '@/lib/datetime';
import { round, weightToDisplay } from '@/lib/units';
import type { BodyWeightEntry } from '@/lib/schema';

export function BodyWeightScreen() {
  const { settings } = useSettings();
  const { dateKey } = useToday();
  const confirm = useConfirm();
  const repos = getRepositories();
  const [addOpen, setAddOpen] = useState(false);

  const entries = useLiveQuery(() => repos.bodyWeight.list(), [], [] as BodyWeightEntry[]);
  const list = entries ?? [];
  const unit = settings.weightUnit;

  const stats = useMemo(() => bodyWeightStats(list), [list]);
  const chartData = useMemo(
    () =>
      withMovingAverage(list).map((p) => ({
        date: p.date,
        peso: round(weightToDisplay(p.weightKg, unit), 1),
        media: round(weightToDisplay(p.averageKg, unit), 1),
      })),
    [list, unit],
  );

  const remove = async (e: BodyWeightEntry) => {
    const ok = await confirm({
      title: 'Eliminar registro',
      message: `¿Eliminar el peso del ${formatKeyShort(e.localDate)}?`,
      danger: true,
      confirmLabel: 'Eliminar',
    });
    if (ok) await repos.bodyWeight.remove(e.id);
  };

  const TrendIcon = stats.trend === 'subiendo' ? TrendingUp : stats.trend === 'bajando' ? TrendingDown : Minus;
  const fmt = (kg: number) => `${round(weightToDisplay(kg, unit), 1)} ${unit}`;
  const fmtDelta = (kg: number) => `${kg > 0 ? '+' : ''}${round(weightToDisplay(kg, unit), 1)} ${unit}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Peso corporal"
        right={
          <button className="btn-primary !min-h-0 !px-3 !py-1.5 text-sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Registrar
          </button>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Sin registros de peso"
          description="Registra tu peso para ver tu tendencia y la media móvil de 7 días."
          action={
            <button className="btn-primary" onClick={() => setAddOpen(true)}>
              Registrar peso
            </button>
          }
        />
      ) : (
        <>
          <section className="card">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-500">Actual</p>
                <p className="text-2xl font-bold">{stats.current !== undefined ? fmt(stats.current) : '—'}</p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <TrendIcon
                  className={
                    stats.trend === 'subiendo'
                      ? 'h-5 w-5 text-amber-500'
                      : stats.trend === 'bajando'
                        ? 'h-5 w-5 text-emerald-500'
                        : 'h-5 w-5 text-zinc-400'
                  }
                />
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Últimos 7 días</p>
                  <p className="font-semibold">{fmtDelta(stats.weeklyChange)}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500">Cambio total</p>
                <p className="font-semibold">{fmtDelta(stats.totalChange)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Registros</p>
                <p className="font-semibold">{list.length}</p>
              </div>
            </div>
          </section>

          {chartData.length >= 2 && (
            <section className="card">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">Evolución</h2>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-brand-500" /> Peso
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-3 rounded-full bg-amber-500" /> Media 7d
                  </span>
                </div>
              </div>
              <SimpleLineChart
                data={chartData}
                xKey="date"
                xFormatter={formatKeyShort}
                unit={` ${unit}`}
                lines={[
                  { key: 'peso', name: 'Peso', color: '#6366f1' },
                  { key: 'media', name: 'Media 7d', color: '#f59e0b', dashed: true },
                ]}
              />
            </section>
          )}

          <section className="space-y-2">
            <h2 className="px-1 font-semibold">Historial</h2>
            <ul className="space-y-2">
              {[...list].reverse().map((e) => (
                <li key={e.id} className="card flex items-center gap-3 !p-3">
                  <div className="flex-1">
                    <p className="font-semibold">{fmt(e.weightKg)}</p>
                    <p className="text-xs text-zinc-400">
                      {formatKeyRelative(e.localDate, settings.timeZone)}
                      {e.time ? ` · ${e.time}` : ''}
                      {e.notes ? ` · ${e.notes}` : ''}
                    </p>
                  </div>
                  <button
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
                    onClick={() => remove(e)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <WeightQuickAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        dateKey={dateKey}
        {...(stats.current !== undefined ? { defaultKg: stats.current } : {})}
      />
    </div>
  );
}
