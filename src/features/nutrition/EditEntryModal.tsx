import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { MacroChips } from './MacroChips';
import { mealsForEntries } from './mealTypes';
import { amountToPortions, describeAmount, previewFoodMacros } from './entryBuilders';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { useConfirm } from '@/app/providers/confirm';
import { useBusy } from '@/app/hooks/useBusy';
import { getRepositories } from '@/lib/repositories';
import { touch } from '@/lib/factories';
import { macrosOf, macrosOfEntry, scaleMacros } from '@/lib/domain';
import { PORTION_UNIT_LABELS } from '@/lib/units';
import { parseDecimalInput } from '@/lib/numberInput';
import type { MealEntry, MealType } from '@/lib/schema';

export function EditEntryModal({
  open,
  onClose,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  entry: MealEntry;
}) {
  const { settings } = useSettings();
  const { success } = useToast();
  const confirm = useConfirm();
  const { busy, run } = useBusy();
  const food = useLiveQuery(
    () => (entry.foodId ? getRepositories().foods.get(entry.foodId) : Promise.resolve(undefined)),
    [entry.foodId],
  );

  const [mealType, setMealType] = useState<MealType>(entry.mealType);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (food) {
      const amount =
        food.portionUnit === 'g' || food.portionUnit === 'ml'
          ? entry.quantity * food.portionSize
          : entry.quantity;
      setValue(String(Number(amount.toFixed(2))));
    } else {
      setValue(String(entry.quantity));
    }
    setMealType(entry.mealType);
  }, [food, entry]);

  const num = parseDecimalInput(value) || 0;
  const hasFood = !!food;

  const preview = food
    ? previewFoodMacros(food, num)
    : scaleMacros(macrosOfEntry(entry), entry.quantity > 0 ? num / entry.quantity : 0);

  const save = async () => {
    if (num <= 0) return;
    const repos = getRepositories();
    let updated: MealEntry;
    if (food) {
      const quantity = amountToPortions(food, num);
      updated = touch({
        ...entry,
        mealType,
        quantity,
        name: food.name,
        ...(food.brand ? { brand: food.brand } : { brand: undefined }),
        portionLabel: describeAmount(food, num),
        ...scaleMacros(macrosOf(food), quantity),
      });
    } else {
      const factor = entry.quantity > 0 ? num / entry.quantity : 0;
      updated = touch({
        ...entry,
        mealType,
        quantity: num,
        ...scaleMacros(macrosOfEntry(entry), factor),
      });
    }
    await repos.meals.put(updated);
    success('Entrada actualizada.');
    onClose();
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Eliminar entrada',
      message: `¿Quitar "${entry.name}" de tu registro del día?`,
      danger: true,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    await getRepositories().meals.remove(entry.id);
    success('Entrada eliminada.');
    onClose();
  };

  const unitLabel = food
    ? food.portionUnit === 'g' || food.portionUnit === 'ml'
      ? (PORTION_UNIT_LABELS[food.portionUnit] ?? food.portionUnit)
      : `nº de ${PORTION_UNIT_LABELS[food.portionUnit] ?? food.portionUnit}`
    : 'porciones';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry.name}
      footer={
        <div className="flex gap-2">
          <button className="btn-danger" onClick={() => run(remove)} disabled={busy}>
            Eliminar
          </button>
          <button
            className="btn-primary flex-1"
            onClick={() => run(save)}
            disabled={num <= 0 || busy}
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label={`Cantidad (${unitLabel})`} htmlFor="edit-amt">
          <input
            id="edit-amt"
            type="text"
            inputMode="decimal"
            className="input text-lg"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label="Comida" htmlFor="edit-meal">
          <select
            id="edit-meal"
            className="input"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            {mealsForEntries(settings, [entry.mealType]).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="rounded-xl border border-line bg-canvas p-3.5">
          <MacroChips macros={preview} />
          {!hasFood && (
            <p className="mt-2 text-xs text-ink-muted">
              El alimento original ya no está disponible; se ajusta proporcionalmente.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
