import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MacrosOverview } from '@/features/dashboard/MacrosOverview';
import { MacroChips } from './MacroChips';
import { AddEntryModal } from './AddEntryModal';
import { EditEntryModal } from './EditEntryModal';
import { CopyDayModal } from './CopyDayModal';
import { MealTimesModal } from './MealTimesModal';
import { mealLabel, mealsForEntries } from './mealTypes';
import { cloneEntryToDate } from './entryBuilders';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { totalsForEntries } from '@/lib/domain';
import { round } from '@/lib/units';
import type { DateKey } from '@/lib/datetime';
import type { MealEntry } from '@/lib/schema';

export function DayLog({ dateKey }: { dateKey: DateKey }) {
  const repos = getRepositories();
  const { settings } = useSettings();
  const { success } = useToast();
  const meals = useLiveQuery(() => repos.meals.listByDate(dateKey), [dateKey], [] as MealEntry[]);
  const goal = useLiveQuery(() => repos.goals.resolveForDate(dateKey), [dateKey]);

  const [addMeal, setAddMeal] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<MealEntry | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [timesOpen, setTimesOpen] = useState(false);

  const list = meals ?? [];
  const byMeal = new Map<string, MealEntry[]>();
  for (const e of list) {
    const arr = byMeal.get(e.mealType);
    if (arr) arr.push(e);
    else byMeal.set(e.mealType, [e]);
  }

  // Muestra todos los tiempos configurados (en orden) + los que existan en datos.
  const sections = mealsForEntries(settings, list.map((e) => e.mealType));

  const repeatLast = async (mealId: string) => {
    const prev = await repos.meals.lastEntriesForMeal(mealId, dateKey);
    if (prev.length === 0) {
      success('No hay una comida previa para repetir.');
      return;
    }
    await Promise.all(prev.map((e) => repos.meals.put(cloneEntryToDate(e, dateKey))));
    success(`Repetida la última: ${mealLabel(settings, mealId)}.`);
  };

  return (
    <div className="space-y-4">
      {goal ? (
        <MacrosOverview goal={goal} consumed={totalsForEntries(list)} />
      ) : (
        <div className="card">
          <p className="eyebrow mb-2.5">Total del día</p>
          <MacroChips macros={totalsForEntries(list)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-secondary" onClick={() => setCopyOpen(true)}>
          Copiar de otro día
        </button>
        <button className="btn-secondary" onClick={() => setTimesOpen(true)}>
          Tiempos de comida
        </button>
      </div>

      {sections.map((meal) => {
        const entries = byMeal.get(meal.id) ?? [];
        const subtotal = totalsForEntries(entries);
        return (
          <section key={meal.id} className="card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-baseline gap-2.5">
                <h3 className="text-base font-semibold text-ink">{meal.name}</h3>
                {entries.length > 0 && (
                  <span className="nums text-xs text-ink-muted">{round(subtotal.calories)} kcal</span>
                )}
              </div>
              <button
                className="rounded-lg px-2 py-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                onClick={() => setAddMeal(meal.id)}
              >
                Agregar
              </button>
            </div>

            {entries.length === 0 ? (
              <button
                onClick={() => repeatLast(meal.id)}
                className="w-full rounded-xl border border-dashed border-line py-3 text-xs font-medium text-ink-muted transition hover:border-ink-faint hover:text-ink"
              >
                Repetir última
              </button>
            ) : (
              <ul className="divide-y divide-line">
                {entries.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setEditEntry(e)} className="flex w-full items-center gap-3 py-2.5 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{e.name}</p>
                        <p className="text-xs text-ink-muted">{e.portionLabel}</p>
                      </div>
                      <MacroChips macros={e} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {addMeal && (
        <AddEntryModal
          open={addMeal !== null}
          onClose={() => setAddMeal(null)}
          dateKey={dateKey}
          mealType={addMeal}
        />
      )}
      {editEntry && (
        <EditEntryModal open={editEntry !== null} onClose={() => setEditEntry(null)} entry={editEntry} />
      )}
      <CopyDayModal open={copyOpen} onClose={() => setCopyOpen(false)} targetDate={dateKey} />
      <MealTimesModal open={timesOpen} onClose={() => setTimesOpen(false)} />
    </div>
  );
}
