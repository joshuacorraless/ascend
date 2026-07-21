import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '@/components/ui/Modal';
import { DateNav } from '@/components/ui/DateNav';
import { MacroChips } from './MacroChips';
import { mealsForEntries } from './mealTypes';
import { cloneEntryToDate } from './entryBuilders';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { totalsForEntries } from '@/lib/domain';
import { addDaysToKey, type DateKey } from '@/lib/datetime';
import type { MealEntry } from '@/lib/schema';

export function CopyDayModal({
  open,
  onClose,
  targetDate,
}: {
  open: boolean;
  onClose: () => void;
  targetDate: DateKey;
}) {
  const { settings } = useSettings();
  const { success, error } = useToast();
  const [source, setSource] = useState<DateKey>(addDaysToKey(targetDate, -1));

  const entries = useLiveQuery(
    () => getRepositories().meals.listByDate(source),
    [source],
    [] as MealEntry[],
  );
  const list = entries ?? [];

  const copyAll = async () => {
    if (list.length === 0) {
      error('Ese día no tiene comidas.');
      return;
    }
    const repos = getRepositories();
    await Promise.all(list.map((e) => repos.meals.put(cloneEntryToDate(e, targetDate))));
    success(`Copiadas ${list.length} entradas.`);
    onClose();
  };

  const copyMeal = async (meal: { id: string; name: string }) => {
    const repos = getRepositories();
    const subset = list.filter((e) => e.mealType === meal.id);
    if (subset.length === 0) return;
    await Promise.all(subset.map((e) => repos.meals.put(cloneEntryToDate(e, targetDate))));
    success(`Copiado ${meal.name}.`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Copiar de otro día"
      footer={
        <button className="btn-primary w-full" onClick={copyAll} disabled={list.length === 0}>
          Copiar todo el día
        </button>
      }
    >
      <div className="space-y-4">
        <DateNav
          dateKey={source}
          onChange={setSource}
          timeZone={settings.timeZone}
          max={targetDate}
        />

        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">Sin comidas ese día.</p>
        ) : (
          <div className="space-y-2.5">
            <MacroChips macros={totalsForEntries(list)} />
            {mealsForEntries(
              settings,
              list.map((e) => e.mealType),
            ).map((meal) => {
              const subset = list.filter((e) => e.mealType === meal.id);
              if (subset.length === 0) return null;
              return (
                <div
                  key={meal.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{meal.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {subset.map((e) => e.name).join(', ')}
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                    onClick={() => copyMeal(meal)}
                  >
                    Copiar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
