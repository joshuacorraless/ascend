import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Caret } from '@/components/ui/Caret';
import { useSettings } from '@/app/providers/settings';
import { getRepositories } from '@/lib/repositories';
import {
  dayHabitStatus,
  totalsForEntries,
  type HabitDayStatus,
  type HabitLevel,
} from '@/lib/domain';
import {
  WEEKDAY_LABELS,
  addMonthsToKey,
  daysInMonth,
  formatKeyHuman,
  formatMonthKey,
  startOfMonthKey,
  todayKey,
  weekdayOfKey,
  type DateKey,
} from '@/lib/datetime';
import { cn } from '@/lib/cn';
import type { NutritionGoal } from '@/lib/schema';

/** Objetivo vigente para una fecha (mayor effectiveDate <= fecha), en memoria. */
function resolveGoal(goals: NutritionGoal[], date: DateKey): NutritionGoal | undefined {
  let best: NutritionGoal | undefined;
  for (const g of goals) {
    if (g.effectiveDate <= date && (!best || g.effectiveDate > best.effectiveDate)) best = g;
  }
  return best;
}

type DayStatusMap = Map<DateKey, HabitDayStatus | null>;

function useHabitsCalendar(monthAnchor: DateKey, timeZone: string): DayStatusMap | undefined {
  return useLiveQuery(async (): Promise<DayStatusMap> => {
    const repos = getRepositories();
    const days = daysInMonth(monthAnchor);
    const start = days[0]!;
    const end = days[days.length - 1]!;
    const today = todayKey(timeZone);

    const [goals, supplements, waterEntries] = await Promise.all([
      repos.goals.list(),
      repos.supplements.list(),
      repos.water.listRange(start, end),
    ]);
    const waterByDay = new Map<DateKey, number>();
    for (const w of waterEntries)
      waterByDay.set(w.localDate, (waterByDay.get(w.localDate) ?? 0) + w.amountMl);

    const entries = await Promise.all(
      days.map(async (date): Promise<readonly [DateKey, HabitDayStatus | null]> => {
        if (date > today) return [date, null] as const; // días futuros: sin evaluar
        const [meals, suppLogs] = await Promise.all([
          repos.meals.listByDate(date),
          repos.supplementLogs.listByDate(date),
        ]);
        const weekday = weekdayOfKey(date);
        const scheduled = supplements.filter(
          (s) => s.daysOfWeek.length === 0 || s.daysOfWeek.includes(weekday),
        );
        const completedIds = new Set(
          suppLogs.filter((l) => l.completed).map((l) => l.supplementId),
        );
        const completedScheduled = scheduled.filter((s) => completedIds.has(s.id)).length;
        const waterMl = waterByDay.get(date) ?? 0;
        const status = dayHabitStatus({
          goal: resolveGoal(goals, date),
          macros: totalsForEntries(meals),
          waterMl,
          scheduledSupplements: scheduled.length,
          completedSupplements: completedScheduled,
          hasAnyData: meals.length > 0 || waterMl > 0 || completedIds.size > 0,
        });
        return [date, status] as const;
      }),
    );
    return new Map(entries);
  }, [monthAnchor, timeZone]);
}

// Mapa de hábitos en rampa de verde: lleno = todo cumplido.
const LEVEL_CELL: Record<HabitLevel, string> = {
  complete: 'bg-brand-500 text-[#10271b]',
  partial: 'bg-brand-500/30 text-ink',
  none: 'bg-inset text-ink-muted',
  empty: 'text-ink-faint',
};

export function ProgressCalendar() {
  const { settings } = useSettings();
  const [monthAnchor, setMonthAnchor] = useState(() =>
    startOfMonthKey(todayKey(settings.timeZone)),
  );
  const [selected, setSelected] = useState<DateKey | null>(null);

  const statuses = useHabitsCalendar(monthAnchor, settings.timeZone);
  const today = todayKey(settings.timeZone);
  const days = daysInMonth(monthAnchor);
  const leadingBlanks = weekdayOfKey(days[0]!); // 0 = domingo
  const thisMonth = startOfMonthKey(today);

  const selectedStatus = selected ? statuses?.get(selected) : undefined;

  return (
    <div className="space-y-3">
      <section className="card space-y-4">
        {/* Navegación de mes */}
        <div className="flex items-center justify-between">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
            onClick={() => {
              setSelected(null);
              setMonthAnchor((m) => addMonthsToKey(m, -1));
            }}
            aria-label="Mes anterior"
          >
            <Caret dir="left" />
          </button>
          <p className="font-semibold capitalize text-ink">{formatMonthKey(monthAnchor)}</p>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink disabled:opacity-25"
            onClick={() => {
              setSelected(null);
              setMonthAnchor((m) => addMonthsToKey(m, 1));
            }}
            disabled={monthAnchor >= thisMonth}
            aria-label="Mes siguiente"
          >
            <Caret dir="right" />
          </button>
        </div>

        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-2xs font-medium text-ink-faint">
          {WEEKDAY_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Grilla del mes */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {days.map((date) => {
            const status = statuses?.get(date) ?? null;
            const level: HabitLevel = status?.level ?? 'empty';
            const isFuture = date > today;
            const isToday = date === today;
            const dayNum = Number(date.slice(8, 10));
            return (
              <button
                key={date}
                onClick={() => !isFuture && setSelected(date)}
                disabled={isFuture}
                className={cn(
                  'nums grid aspect-square place-items-center rounded-lg text-sm font-semibold transition',
                  isFuture ? 'text-ink-faint' : LEVEL_CELL[level],
                  isToday && 'ring-2 ring-brand-500 ring-offset-1 ring-offset-paper',
                  selected === date && 'outline outline-2 outline-ink',
                )}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-2xs text-ink-muted">
          <Legend className="bg-brand-500" label="Todo cumplido" />
          <Legend className="bg-brand-500/30" label="Parcial" />
          <Legend className="bg-inset" label="Sin cumplir" />
        </div>
      </section>

      {/* Desglose del día seleccionado */}
      {selected && (
        <section className="card space-y-3">
          <p className="font-semibold capitalize text-ink">{formatKeyHuman(selected)}</p>
          {selectedStatus ? (
            <div className="space-y-2 text-sm">
              <Criterion ok={selectedStatus.macros} label="Macros (calorías y proteína)" />
              <Criterion ok={selectedStatus.water} label="Hidratación" />
              <Criterion ok={selectedStatus.supplements} label="Suplementos" />
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Sin registros ese día.</p>
          )}
        </section>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded', className)} />
      {label}
    </span>
  );
}

function Criterion({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'grid h-5 w-5 place-items-center rounded-full border transition',
          ok ? 'border-brand-500 bg-brand-500' : 'border-line',
        )}
        aria-hidden
      >
        {ok && <span className="h-1.5 w-1.5 rounded-full bg-canvas" />}
      </span>
      <span className={cn(ok ? 'font-medium text-ink' : 'text-ink-muted')}>{label}</span>
    </div>
  );
}
