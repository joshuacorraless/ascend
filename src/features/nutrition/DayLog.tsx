import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CopyPlus, Plus, RotateCcw } from 'lucide-react';
import { MacrosOverview } from '@/features/dashboard/MacrosOverview';
import { MacroChips } from './MacroChips';
import { AddEntryModal } from './AddEntryModal';
import { EditEntryModal } from './EditEntryModal';
import { CopyDayModal } from './CopyDayModal';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from './mealTypes';
import { cloneEntryToDate } from './entryBuilders';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { totalsForEntries } from '@/lib/domain';
import { round } from '@/lib/units';
import type { DateKey } from '@/lib/datetime';
import type { MealEntry, MealType } from '@/lib/schema';

const CORE_MEALS: MealType[] = ['desayuno', 'almuerzo', 'cena', 'merienda'];

export function DayLog({ dateKey }: { dateKey: DateKey }) {
  const repos = getRepositories();
  const { success } = useToast();
  const meals = useLiveQuery(() => repos.meals.listByDate(dateKey), [dateKey], [] as MealEntry[]);
  const goal = useLiveQuery(() => repos.goals.resolveForDate(dateKey), [dateKey]);

  const [addMeal, setAddMeal] = useState<MealType | null>(null);
  const [editEntry, setEditEntry] = useState<MealEntry | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  const list = meals ?? [];
  const byMeal = new Map<MealType, MealEntry[]>();
  for (const e of list) {
    const arr = byMeal.get(e.mealType);
    if (arr) arr.push(e);
    else byMeal.set(e.mealType, [e]);
  }

  const sections = MEAL_TYPE_ORDER.filter(
    (m) => CORE_MEALS.includes(m) || (byMeal.get(m)?.length ?? 0) > 0,
  );

  const repeatLast = async (meal: MealType) => {
    const prev = await repos.meals.lastEntriesForMeal(meal, dateKey);
    if (prev.length === 0) {
      success('No hay una comida previa para repetir.');
      return;
    }
    await Promise.all(prev.map((e) => repos.meals.put(cloneEntryToDate(e, dateKey))));
    success(`Repetida la última: ${MEAL_TYPE_LABELS[meal]}.`);
  };

  return (
    <div className="space-y-3">
      {goal ? (
        <MacrosOverview goal={goal} consumed={totalsForEntries(list)} />
      ) : (
        <div className="card">
          <p className="mb-2 text-sm text-zinc-500">Total del día</p>
          <MacroChips macros={totalsForEntries(list)} />
        </div>
      )}

      <button className="btn-secondary w-full" onClick={() => setCopyOpen(true)}>
        <CopyPlus className="h-4 w-4" /> Copiar de otro día
      </button>

      {sections.map((meal) => {
        const entries = byMeal.get(meal) ?? [];
        const subtotal = totalsForEntries(entries);
        return (
          <section key={meal} className="card">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h3 className="font-semibold">{MEAL_TYPE_LABELS[meal]}</h3>
                {entries.length > 0 && (
                  <span className="text-xs text-zinc-400">{round(subtotal.calories)} kcal</span>
                )}
              </div>
              <button
                className="btn-ghost !min-h-0 !px-2 !py-1 text-xs text-brand-600"
                onClick={() => setAddMeal(meal)}
              >
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>

            {entries.length === 0 ? (
              <button
                onClick={() => repeatLast(meal)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 py-2.5 text-xs text-zinc-400 hover:text-brand-600 dark:border-zinc-700"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Repetir última
              </button>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {entries.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setEditEntry(e)} className="flex w-full items-center gap-3 py-2 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.name}</p>
                        <p className="text-xs text-zinc-400">{e.portionLabel}</p>
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
    </div>
  );
}
