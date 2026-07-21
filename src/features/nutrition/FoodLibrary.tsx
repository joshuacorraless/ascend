import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MacroChips } from './MacroChips';
import { FoodFormModal } from './FoodFormModal';
import { LabelScanModal } from './LabelScanModal';
import { RecipeFormModal } from './RecipeFormModal';
import { getRepositories } from '@/lib/repositories';
import { recipeMacrosPerServing } from '@/lib/domain';
import { cn } from '@/lib/cn';
import type { Food, Recipe } from '@/lib/schema';

/** Marcador de favorito: disco geométrico (relleno = fijado), no un icono. */
function FavoriteDot({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={active ? 'Quitar de favoritos' : 'Marcar favorito'}
      aria-pressed={active}
      className={cn(
        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition duration-200 ease-ascend',
        active ? 'border-ink bg-ink' : 'border-line hover:border-ink-faint',
      )}
    >
      {active && <span className="h-1.5 w-1.5 rounded-full bg-paper" />}
    </button>
  );
}

function TextBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-canvas hover:text-ink"
    >
      {children}
    </button>
  );
}

export function FoodLibrary() {
  const repos = getRepositories();
  const [tab, setTab] = useState<'alimentos' | 'recetas'>('alimentos');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editFood, setEditFood] = useState<Food | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  const [newFood, setNewFood] = useState(false);
  const [newRecipe, setNewRecipe] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const foods = useLiveQuery(
    () => repos.foods.list({ includeArchived: showArchived }),
    [showArchived],
    [] as Food[],
  );
  const recipes = useLiveQuery(
    () => repos.recipes.list({ includeArchived: showArchived }),
    [showArchived],
    [] as Recipe[],
  );
  const allFoods = useLiveQuery(() => repos.foods.list(), [], [] as Food[]);
  const foodsById = useMemo(() => new Map((allFoods ?? []).map((f) => [f.id, f])), [allFoods]);

  const term = search.trim().toLowerCase();
  const filteredFoods = (foods ?? [])
    .filter(
      (f) =>
        !term ||
        f.name.toLowerCase().includes(term) ||
        (f.brand ?? '').toLowerCase().includes(term),
    )
    .sort((a, b) => Number(b.favorite) - Number(a.favorite));
  const filteredRecipes = (recipes ?? []).filter(
    (r) => !term || r.name.toLowerCase().includes(term),
  );

  return (
    <div className="space-y-4">
      <SegmentedControl
        stretch
        value={tab}
        onChange={setTab}
        options={[
          { value: 'alimentos', label: 'Alimentos' },
          { value: 'recetas', label: 'Recetas' },
        ]}
      />

      <input
        className="input"
        placeholder="Buscar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            className="btn-primary !min-h-0 px-3.5 py-2 text-sm"
            onClick={() => (tab === 'alimentos' ? setNewFood(true) : setNewRecipe(true))}
          >
            {tab === 'alimentos' ? 'Nuevo' : 'Nueva receta'}
          </button>
          {tab === 'alimentos' && (
            <button
              className="btn-secondary !min-h-0 px-3.5 py-2 text-sm"
              onClick={() => setScanOpen(true)}
            >
              Escanear
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            className="accent-ink"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Archivados
        </label>
      </div>

      {tab === 'alimentos' ? (
        filteredFoods.length === 0 ? (
          <EmptyState
            title="Sin alimentos"
            description={
              term ? 'Sin resultados.' : 'Crea tu primer alimento para empezar a registrar.'
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {filteredFoods.map((f) => (
              <li key={f.id} className={cn('card !p-4', f.archived && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <FavoriteDot
                    active={f.favorite}
                    onClick={() => repos.foods.setFavorite(f.id, !f.favorite)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{f.name}</p>
                    <p className="nums text-xs text-ink-muted">
                      {f.brand ? `${f.brand} · ` : ''}por {f.portionSize}
                      {f.portionUnit === 'g' || f.portionUnit === 'ml'
                        ? f.portionUnit
                        : ` ${f.portionUnit}`}
                    </p>
                    <MacroChips macros={f} className="mt-2" />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2.5">
                  <TextBtn onClick={() => setEditFood(f)}>Editar</TextBtn>
                  <TextBtn onClick={() => repos.foods.setArchived(f.id, !f.archived)}>
                    {f.archived ? 'Restaurar' : 'Archivar'}
                  </TextBtn>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : filteredRecipes.length === 0 ? (
        <EmptyState
          title="Sin recetas"
          description={
            term ? 'Sin resultados.' : 'Combina varios alimentos en una receta reutilizable.'
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {filteredRecipes.map((r) => (
            <li key={r.id} className={cn('card !p-4', r.archived && 'opacity-60')}>
              <p className="truncate font-medium text-ink">{r.name}</p>
              <p className="nums text-xs text-ink-muted">
                {r.ingredients.length} ingredientes · {r.servings} porciones
              </p>
              <MacroChips macros={recipeMacrosPerServing(r, foodsById)} className="mt-2" />
              <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2.5">
                <TextBtn onClick={() => setEditRecipe(r)}>Editar</TextBtn>
                <TextBtn onClick={() => repos.recipes.setArchived(r.id, !r.archived)}>
                  {r.archived ? 'Restaurar' : 'Archivar'}
                </TextBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FoodFormModal open={newFood} onClose={() => setNewFood(false)} />
      {editFood && <FoodFormModal open onClose={() => setEditFood(null)} initial={editFood} />}
      <LabelScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
      <RecipeFormModal open={newRecipe} onClose={() => setNewRecipe(false)} />
      {editRecipe && (
        <RecipeFormModal open onClose={() => setEditRecipe(null)} initial={editRecipe} />
      )}
    </div>
  );
}
