import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { MacroChips } from './MacroChips';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { newEntity, touch } from '@/lib/factories';
import { recipeMacros, recipeMacrosPerServing } from '@/lib/domain';
import type { Food, Recipe, RecipeIngredient } from '@/lib/schema';

export function RecipeFormModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Recipe;
  onSaved?: (recipe: Recipe) => void;
}) {
  const { success, error } = useToast();
  const foods = useLiveQuery(() => getRepositories().foods.list(), [], [] as Food[]);
  const foodsById = useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods]);

  const [name, setName] = useState(initial?.name ?? '');
  const [servings, setServings] = useState(String(initial?.servings ?? 1));
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initial?.ingredients ?? [],
  );

  const draft: Recipe = {
    id: initial?.id ?? 'draft',
    name,
    servings: Number(servings) || 1,
    ingredients,
    favorite: initial?.favorite ?? false,
    archived: initial?.archived ?? false,
    createdAt: initial?.createdAt ?? '',
    updatedAt: '',
  };
  const total = recipeMacros(draft, foodsById);
  const perServing = recipeMacrosPerServing(draft, foodsById);

  const addIngredient = () => {
    const first = (foods ?? [])[0];
    if (!first) {
      error('Crea primero algún alimento.');
      return;
    }
    setIngredients((prev) => [...prev, { foodId: first.id, quantity: 1 }]);
  };

  const updateIngredient = (i: number, patch: Partial<RecipeIngredient>) => {
    setIngredients((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));
  };

  const removeIngredient = (i: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!name.trim()) {
      error('Ponle un nombre a la receta.');
      return;
    }
    if (ingredients.length === 0) {
      error('Agrega al menos un ingrediente.');
      return;
    }
    const repos = getRepositories();
    const values = {
      name: name.trim(),
      servings: Number(servings) || 1,
      ingredients,
    };
    const saved: Recipe = initial
      ? touch({ ...initial, ...values })
      : newEntity<Recipe>({ ...values, favorite: false, archived: false });
    await repos.recipes.put(saved);
    success(initial ? 'Receta actualizada.' : 'Receta creada.');
    onSaved?.(saved);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar receta' : 'Nueva receta'}
      size="lg"
      footer={
        <button className="btn-primary w-full" onClick={save}>
          {initial ? 'Guardar receta' : 'Crear receta'}
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre" htmlFor="r-name">
          <input id="r-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Porciones que rinde" htmlFor="r-serv" hint="Los macros se dividen entre estas porciones.">
          <input
            id="r-serv"
            type="number"
            inputMode="decimal"
            step="any"
            className="input"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Ingredientes</span>
            <button className="btn-ghost !min-h-0 !px-2 !py-1 text-xs text-brand-600" onClick={addIngredient}>
              <Plus className="h-4 w-4" /> Añadir
            </button>
          </div>
          {ingredients.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin ingredientes todavía.</p>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className="input flex-1"
                    value={ing.foodId}
                    onChange={(e) => updateIngredient(i, { foodId: e.target.value })}
                  >
                    {(foods ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                        {f.brand ? ` · ${f.brand}` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    className="input w-20"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(i, { quantity: Number(e.target.value) || 0 })}
                    aria-label="Porciones"
                  />
                  <button
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
                    onClick={() => removeIngredient(i)}
                    aria-label="Quitar ingrediente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="mb-1 text-xs font-medium text-zinc-500">Total receta</p>
          <MacroChips macros={total} />
          <p className="mb-1 mt-2 text-xs font-medium text-zinc-500">Por porción</p>
          <MacroChips macros={perServing} />
        </div>
      </div>
    </Modal>
  );
}
