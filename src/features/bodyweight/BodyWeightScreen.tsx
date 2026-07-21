import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { Caret } from '@/components/ui/Caret';
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

  const fmt = (kg: number) => `${round(weightToDisplay(kg, unit), 1)} ${unit}`;
  const fmtDelta = (kg: number) =>
    `${kg > 0 ? '+' : ''}${round(weightToDisplay(kg, unit), 1)} ${unit}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Composición"
        title="Peso corporal"
        right={
          <button
            className="btn-primary !min-h-0 px-3.5 py-2 text-sm"
            onClick={() => setAddOpen(true)}
          >
            Registrar
          </button>
        }
      />

      {list.length === 0 ? (
        <EmptyState
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
                <p className="eyebrow">Actual</p>
                <p className="nums mt-1 text-2xl font-semibold text-ink">
                  {stats.current !== undefined ? fmt(stats.current) : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="eyebrow">Últimos 7 días</p>
                <p className="nums mt-1 flex items-center justify-end gap-1.5 font-semibold text-ink">
                  {stats.trend === 'subiendo' && <Caret dir="up" className="text-ink-muted" />}
                  {stats.trend === 'bajando' && <Caret dir="down" className="text-ink-muted" />}
                  {stats.trend === 'estable' && <span className="text-ink-faint">—</span>}
                  {fmtDelta(stats.weeklyChange)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
              <div>
                <p className="eyebrow">Cambio total</p>
                <p className="nums mt-1 font-semibold text-ink">{fmtDelta(stats.totalChange)}</p>
              </div>
              <div className="text-right">
                <p className="eyebrow">Registros</p>
                <p className="nums mt-1 font-semibold text-ink">{list.length}</p>
              </div>
            </div>
          </section>

          {chartData.length >= 2 && (
            <section className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">Evolución</h2>
                <div className="flex items-center gap-3 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-macro-fat" /> Peso
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-px w-3 bg-ink-faint" /> Media 7d
                  </span>
                </div>
              </div>
              <SimpleLineChart
                data={chartData}
                xKey="date"
                xFormatter={formatKeyShort}
                unit={` ${unit}`}
                lines={[
                  { key: 'peso', name: 'Peso', color: '#4DABF7' },
                  { key: 'media', name: 'Media 7d', color: '#8C8C8C', dashed: true },
                ]}
              />
            </section>
          )}

          <section className="space-y-2.5">
            <h2 className="px-1 text-base font-semibold text-ink">Historial</h2>
            <ul className="space-y-2">
              {[...list].reverse().map((e) => (
                <li key={e.id} className="card flex items-center gap-3 !p-4">
                  <div className="min-w-0 flex-1">
                    <p className="nums font-semibold text-ink">{fmt(e.weightKg)}</p>
                    <p className="text-xs text-ink-muted">
                      {formatKeyRelative(e.localDate, settings.timeZone)}
                      {e.time ? ` · ${e.time}` : ''}
                      {e.notes ? ` · ${e.notes}` : ''}
                    </p>
                  </div>
                  <button
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:text-danger-600"
                    onClick={() => remove(e)}
                  >
                    Quitar
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
