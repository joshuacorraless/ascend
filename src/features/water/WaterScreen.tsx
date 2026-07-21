import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useSettings } from '@/app/providers/settings';
import { useToday } from '@/app/hooks/useToday';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { newEntity } from '@/lib/factories';
import { nowIso } from '@/lib/ids';
import { dailyWaterTotals, sumWater, weeklyWaterAverage } from '@/lib/domain';
import { addDaysToKey, formatKeyShort, localTime } from '@/lib/datetime';
import { formatVolume, round, volumeToMl } from '@/lib/units';
import { cn } from '@/lib/cn';
import { parseDecimalInput } from '@/lib/numberInput';
import type { WaterEntry } from '@/lib/schema';

const PRESETS_ML = [250, 500, 750];

export function WaterScreen() {
  const { settings } = useSettings();
  const { dateKey } = useToday();
  const { success } = useToast();
  const repos = getRepositories();
  const [custom, setCustom] = useState('');

  const todayEntries = useLiveQuery(
    () => repos.water.listByDate(dateKey),
    [dateKey],
    [] as WaterEntry[],
  );
  const goal = useLiveQuery(() => repos.goals.resolveForDate(dateKey), [dateKey]);
  const from = addDaysToKey(dateKey, -6);
  const rangeEntries = useLiveQuery(
    () => repos.water.listRange(from, dateKey),
    [from, dateKey],
    [] as WaterEntry[],
  );

  const total = sumWater(todayEntries ?? []);
  const target = goal?.waterMl ?? 0;
  const percent = target > 0 ? (total / target) * 100 : 0;
  const days = dailyWaterTotals(rangeEntries ?? [], from, dateKey);
  const weekAvg = weeklyWaterAverage(rangeEntries ?? [], from, dateKey);
  const maxDay = Math.max(target, ...days.map((d) => d.ml), 1);

  const add = async (ml: number) => {
    if (ml <= 0) return;
    await repos.water.add(
      newEntity<WaterEntry>({ localDate: dateKey, loggedAt: nowIso(), amountMl: round(ml) }),
    );
    success(`+${formatVolume(ml, settings.volumeUnit)}`);
  };
  const addCustom = async () => {
    const v = parseDecimalInput(custom);
    if (!Number.isFinite(v) || v <= 0) return;
    await add(volumeToMl(v, settings.volumeUnit));
    setCustom('');
  };
  const undoLast = async () => {
    const list = todayEntries ?? [];
    const last = [...list].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0];
    if (last) await repos.water.remove(last.id);
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Hidratación" title="Agua" />

      <section className="card flex flex-col items-center text-center">
        <ProgressRing percent={percent} size={148} strokeWidth={12} color="#4DABF7">
          <div className="leading-none">
            <p className="nums text-2xl font-semibold text-ink">
              {formatVolume(total, settings.volumeUnit)}
            </p>
            <p className="eyebrow mt-1.5">
              de {formatVolume(target, settings.volumeUnit)} · {Math.round(percent)}%
            </p>
          </div>
        </ProgressRing>

        <div className="mt-6 grid w-full grid-cols-3 gap-2">
          {PRESETS_ML.map((ml) => (
            <button
              key={ml}
              className="btn-secondary !py-3 nums text-base font-semibold"
              onClick={() => add(ml)}
            >
              {formatVolume(ml, settings.volumeUnit)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex w-full items-end gap-2">
          <input
            type="text"
            inputMode="decimal"
            className="input flex-1"
            placeholder={`Personalizado (${settings.volumeUnit === 'l' ? 'L' : 'ml'})`}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button className="btn-primary" onClick={addCustom} disabled={!custom}>
            Añadir
          </button>
        </div>
        <button
          className="btn-ghost mt-2 w-full"
          onClick={undoLast}
          disabled={(todayEntries ?? []).length === 0}
        >
          Deshacer último
        </button>
      </section>

      {/* Últimos 7 días */}
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Últimos 7 días</h2>
          <span className="nums eyebrow">Prom. {formatVolume(weekAvg, settings.volumeUnit)}</span>
        </div>
        <div className="flex h-32 items-end justify-between gap-2">
          {days.map((d) => {
            const h = Math.max(4, (d.ml / maxDay) * 100);
            const met = target > 0 && d.ml >= target;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-all duration-500',
                      met ? 'bg-macro-fat' : 'bg-white/12',
                    )}
                    style={{ height: `${h}%` }}
                    title={formatVolume(d.ml, settings.volumeUnit)}
                  />
                </div>
                <span className="text-2xs text-ink-faint">
                  {formatKeyShort(d.date).split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Registros de hoy */}
      {(todayEntries ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-base font-semibold text-ink">Hoy</h2>
          <ul className="space-y-1.5">
            {[...(todayEntries ?? [])]
              .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
              .map((e) => (
                <li key={e.id} className="card flex items-center gap-3 !py-2.5">
                  <span className="nums flex-1 font-medium text-ink">
                    {formatVolume(e.amountMl, settings.volumeUnit)}
                  </span>
                  <span className="nums text-xs text-ink-muted">
                    {localTime(new Date(e.loggedAt), settings.timeZone)}
                  </span>
                  <button
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:text-danger-600"
                    onClick={() => repos.water.remove(e.id)}
                  >
                    Quitar
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
