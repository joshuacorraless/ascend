import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Caret } from '@/components/ui/Caret';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { mealsOf, newMealId } from './mealTypes';
import type { MealDef } from '@/lib/schema';

/** Gestiona los tiempos de comida del usuario (añadir, renombrar, reordenar). */
export function MealTimesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update } = useSettings();
  const { success } = useToast();
  const [meals, setMeals] = useState<MealDef[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (open) {
      setMeals(mealsOf(settings).map((m) => ({ ...m })));
      setNewName('');
    }
  }, [open, settings]);

  const addMeal = () => {
    const name = newName.trim();
    if (!name) return;
    setMeals((prev) => [...prev, { id: newMealId(), name }]);
    setNewName('');
  };
  const rename = (i: number, name: string) =>
    setMeals((prev) => prev.map((m, idx) => (idx === i ? { ...m, name } : m)));
  const removeMeal = (i: number) => setMeals((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setMeals((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const a = next[i]!;
      next[i] = next[j]!;
      next[j] = a;
      return next;
    });

  const save = async () => {
    const cleaned = meals.map((m) => ({ ...m, name: m.name.trim() })).filter((m) => m.name);
    if (cleaned.length === 0) return;
    await update({ meals: cleaned });
    success('Tiempos de comida guardados.');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tiempos de comida"
      footer={
        <button className="btn-primary w-full" onClick={save}>
          Guardar
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Estos son los apartados de tu diario. Añade los tuyos (pre-entreno, segunda cena…),
          renómbralos o cámbialos de orden.
        </p>

        <div className="space-y-2">
          {meals.map((m, i) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <input
                className="input flex-1"
                value={m.name}
                onChange={(e) => rename(i, e.target.value)}
                aria-label="Nombre del tiempo de comida"
              />
              <button
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:text-ink disabled:opacity-25"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Subir"
              >
                <Caret dir="up" />
              </button>
              <button
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:text-ink disabled:opacity-25"
                onClick={() => move(i, 1)}
                disabled={i === meals.length - 1}
                aria-label="Bajar"
              >
                <Caret dir="down" />
              </button>
              <button
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-ink-muted transition hover:text-danger-600 disabled:opacity-25"
                onClick={() => removeMeal(i)}
                disabled={meals.length <= 1}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2 border-t border-line pt-4">
          <input
            className="input flex-1"
            placeholder="Nuevo tiempo (p. ej. Pre-entreno)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMeal();
              }
            }}
          />
          <button className="btn-secondary px-4" onClick={addMeal} disabled={!newName.trim()}>
            Añadir
          </button>
        </div>
      </div>
    </Modal>
  );
}
