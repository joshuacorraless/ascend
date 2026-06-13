import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useSettings } from '@/app/providers/settings';
import { getRepositories } from '@/lib/repositories';
import { dayHabitStatus, totalsForEntries, type HabitDayStatus, type HabitLevel } from '@/lib/domain';
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
    for (const w of waterEntries) waterByDay.set(w.localDate, (waterByDay.get(w.localDate) ?? 0) + w.amountMl);

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
        const completedIds = new Set(suppLogs.filter((l) => l.completed).map((l) => l.supplementId));
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

const LEVEL_CELL: Record<HabitLevel, string> = {
  complete: 'bg-emerald-500 text-white',
  partial: 'bg-amber-400 text-white',
  none: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300',
  empty: 'text-zinc-400',
};

export function ProgressCalendar() {
  const { settings } = useSettings();
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonthKey(todayKey(settings.timeZone)));
  const [selected, setSelected] = useState<DateKey | null>(null);

  const statuses = useHabitsCalendar(monthAnchor, settings.timeZone);
  const today = todayKey(settings.timeZone);
  const days = daysInMonth(monthAnchor);
  const leadingBlanks = weekdayOfKey(days[0]!); // 0 = domingo
  const thisMonth = startOfMonthKey(today);

  const selectedStatus = selected ? statuses?.get(selected) : undefined;

  return (
    <div className="space-y-3">
      <section className="card space-y-3">
        {/* Navegación de mes */}
        <div className="flex items-center justify-between">
          <button
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              setSelected(null);
              setMonthAnchor((m) => addMonthsToKey(m, -1));
            }}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="font-bold capitalize">{formatMonthKey(monthAnchor)}</p>
          <button
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            onClick={() => {
              setSelected(null);
              setMonthAnchor((m) => addMonthsToKey(m, 1));
            }}
            disabled={monthAnchor >= thisMonth}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-400">
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
                  'grid aspect-square place-items-center rounded-lg text-sm font-semibold transition',
                  isFuture ? 'text-zinc-300 dark:text-zinc-700' : LEVEL_CELL[level],
                  isToday && 'ring-2 ring-brand-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900',
                  selected === date && 'outline outline-2 outline-brand-500',
                )}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-zinc-500">
          <Legend className="bg-emerald-500" label="Todo cumplido" />
          <Legend className="bg-amber-400" label="Parcial" />
          <Legend className="bg-zinc-200 dark:bg-zinc-700" label="Sin cumplir" />
        </div>
      </section>

      {/* Desglose del día seleccionado */}
      {selected && (
        <section className="card space-y-2">
          <p className="font-bold capitalize">{formatKeyHuman(selected)}</p>
          {selectedStatus ? (
            <div className="space-y-1.5 text-sm">
              <Criterion ok={selectedStatus.macros} label="Macros (calorías y proteína)" />
              <Criterion ok={selectedStatus.water} label="Hidratación" />
              <Criterion ok={selectedStatus.supplements} label="Suplementos" />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Sin registros ese día.</p>
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
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'grid h-5 w-5 place-items-center rounded-full',
          ok ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-700',
        )}
      >
        {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className={cn(ok ? 'font-medium' : 'text-zinc-500')}>{label}</span>
    </div>
  );
}
