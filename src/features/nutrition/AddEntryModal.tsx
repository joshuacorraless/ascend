import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, BookOpen, Plus, ScanLine, Search, Star } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MacroChips } from './MacroChips';
import { FoodFormModal } from './FoodFormModal';
import { LabelScanModal } from './LabelScanModal';
import { RecipeFormModal } from './RecipeFormModal';
import { MEAL_TYPE_LABELS } from './mealTypes';
import {
  buildEntryFromFood,
  buildEntryFromRecipe,
  defaultAmount,
  describeAmount,
  previewFoodMacros,
} from './entryBuilders';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { recipeMacrosPerServing, scaleMacros } from '@/lib/domain';
import { PORTION_UNIT_LABELS } from '@/lib/units';
import { cn } from '@/lib/cn';
import type { DateKey } from '@/lib/datetime';
import type { Food, MealEntry, MealType, Recipe } from '@/lib/schema';

export function AddEntryModal({
  open,
  onClose,
  dateKey,
  mealType,
}: {
  open: boolean;
  onClose: () => void;
  dateKey: DateKey;
  mealType: MealType;
}) {
  const { success } = useToast();
  const repos = getRepositories();
  const foods = useLiveQuery(() => repos.foods.list(), [], [] as Food[]);
  const recipes = useLiveQuery(() => repos.recipes.list(), [], [] as Recipe[]);
  const recent = useLiveQuery(() => repos.meals.recent(40), [], [] as MealEntry[]);
  const foodsById = useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods]);

  const [tab, setTab] = useState<'alimentos' | 'recetas'>('alimentos');
  const [search, setSearch] = useState('');
  const [selFood, setSelFood] = useState<Food | null>(null);
  const [selRecipe, setSelRecipe] = useState<Recipe | null>(null);
  const [amount, setAmount] = useState('');
  const [newFood, setNewFood] = useState(false);
  const [newRecipe, setNewRecipe] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const term = search.trim().toLowerCase();
  const filteredFoods = (foods ?? [])
    .filter((f) => !term || f.name.toLowerCase().includes(term) || (f.brand ?? '').toLowerCase().includes(term))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite));
  const filteredRecipes = (recipes ?? []).filter(
    (r) => !term || r.name.toLowerCase().includes(term),
  );

  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    const list: Food[] = [];
    for (const e of recent ?? []) {
      if (!e.foodId || seen.has(e.foodId)) continue;
      const f = foodsById.get(e.foodId);
      if (f) {
        seen.add(e.foodId);
        list.push(f);
      }
      if (list.length >= 6) break;
    }
    return list;
  }, [recent, foodsById]);

  const reset = () => {
    setSelFood(null);
    setSelRecipe(null);
    setAmount('');
  };

  const pickFood = (f: Food) => {
    setSelFood(f);
    setAmount(String(defaultAmount(f)));
  };
  const pickRecipe = (r: Recipe) => {
    setSelRecipe(r);
    setAmount('1');
  };

  const addFood = async () => {
    if (!selFood) return;
    const amt = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) return;
    await repos.meals.put(buildEntryFromFood(selFood, mealType, dateKey, amt));
    success(`Añadido a ${MEAL_TYPE_LABELS[mealType]}`);
    reset();
  };

  const addRecipe = async () => {
    if (!selRecipe) return;
    const servings = Number(amount.replace(',', '.'));
    if (!Number.isFinite(servings) || servings <= 0) return;
    await repos.meals.put(buildEntryFromRecipe(selRecipe, foodsById, mealType, dateKey, servings));
    success(`Añadido a ${MEAL_TYPE_LABELS[mealType]}`);
    reset();
  };

  // ── Vista: editor de cantidad de un alimento ───────────────────────────────
  if (selFood) {
    const amt = Number(amount.replace(',', '.')) || 0;
    const unit = PORTION_UNIT_LABELS[selFood.portionUnit] ?? selFood.portionUnit;
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={selFood.name}
        footer={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={reset}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <button className="btn-primary flex-1" onClick={addFood} disabled={amt <= 0}>
              Agregar
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="label" htmlFor="amt">
            Cantidad ({selFood.portionUnit === 'g' || selFood.portionUnit === 'ml' ? unit : `nº de ${unit}`})
          </label>
          <input
            id="amt"
            type="number"
            inputMode="decimal"
            step="any"
            autoFocus
            className="input text-lg"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <p className="mb-1 text-xs text-zinc-500">{describeAmount(selFood, amt)} aportan</p>
            <MacroChips macros={previewFoodMacros(selFood, amt)} />
          </div>
        </div>
      </Modal>
    );
  }

  // ── Vista: editor de porciones de una receta ───────────────────────────────
  if (selRecipe) {
    const servings = Number(amount.replace(',', '.')) || 0;
    const preview = scaleMacros(recipeMacrosPerServing(selRecipe, foodsById), servings);
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={selRecipe.name}
        footer={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={reset}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <button className="btn-primary flex-1" onClick={addRecipe} disabled={servings <= 0}>
              Agregar
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="label" htmlFor="serv">
            Porciones de la receta
          </label>
          <input
            id="serv"
            type="number"
            inputMode="decimal"
            step="any"
            autoFocus
            className="input text-lg"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <MacroChips macros={preview} />
          </div>
        </div>
      </Modal>
    );
  }

  // ── Vista: selector ────────────────────────────────────────────────────────
  return (
    <>
      <Modal open={open && !newFood && !newRecipe && !scanOpen} onClose={onClose} title={`Agregar a ${MEAL_TYPE_LABELS[mealType]}`}>
        <div className="space-y-3">
          <SegmentedControl
            className="w-full"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'alimentos', label: 'Alimentos' },
              { value: 'recetas', label: 'Recetas' },
            ]}
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              className="input pl-9"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {tab === 'alimentos' ? (
            <>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setNewFood(true)}>
                  <Plus className="h-4 w-4" /> Nuevo
                </button>
                <button className="btn-secondary flex-1" onClick={() => setScanOpen(true)}>
                  <ScanLine className="h-4 w-4" /> Escanear
                </button>
              </div>

              {recentFoods.length > 0 && !term && (
                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-500">Recientes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentFoods.map((f) => (
                      <button key={f.id} className="chip" onClick={() => pickFood(f)}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredFoods.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-500">
                    {term ? 'Sin resultados.' : 'Aún no tienes alimentos. Crea el primero.'}
                  </p>
                ) : (
                  filteredFoods.map((f) => (
                    <FoodRow key={f.id} food={f} onClick={() => pickFood(f)} />
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <button className="btn-secondary w-full" onClick={() => setNewRecipe(true)}>
                <Plus className="h-4 w-4" /> Nueva receta
              </button>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredRecipes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-500">
                    {term ? 'Sin resultados.' : 'Aún no tienes recetas.'}
                  </p>
                ) : (
                  filteredRecipes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => pickRecipe(r)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <BookOpen className="h-5 w-5 shrink-0 text-brand-500" />
                      <span className="flex-1 font-medium">{r.name}</span>
                      <span className="text-xs text-zinc-400">{r.servings} porc.</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      <FoodFormModal
        open={newFood}
        onClose={() => setNewFood(false)}
        onSaved={(f) => {
          setNewFood(false);
          pickFood(f);
        }}
      />
      <RecipeFormModal
        open={newRecipe}
        onClose={() => setNewRecipe(false)}
        onSaved={(r) => {
          setNewRecipe(false);
          pickRecipe(r);
        }}
      />
      <LabelScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
    </>
  );
}

function FoodRow({ food, onClick }: { food: Food; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn('truncate font-medium')}>{food.name}</span>
          {food.favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        </span>
        <span className="text-xs text-zinc-400">
          {food.brand ? `${food.brand} · ` : ''}
          {food.calories} kcal / {food.portionSize}
          {food.portionUnit === 'g' || food.portionUnit === 'ml' ? food.portionUnit : ` ${food.portionUnit}`}
        </span>
      </span>
      <Plus className="h-5 w-5 shrink-0 text-brand-500" />
    </button>
  );
}
