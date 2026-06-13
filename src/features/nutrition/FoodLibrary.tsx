import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Archive, ArchiveRestore, BookOpen, Pencil, Plus, ScanLine, Search, Star } from 'lucide-react';
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
    .filter((f) => !term || f.name.toLowerCase().includes(term) || (f.brand ?? '').toLowerCase().includes(term))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite));
  const filteredRecipes = (recipes ?? []).filter((r) => !term || r.name.toLowerCase().includes(term));

  return (
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
        <input className="input pl-9" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            className="btn-primary !min-h-0 !px-3 !py-1.5 text-sm"
            onClick={() => (tab === 'alimentos' ? setNewFood(true) : setNewRecipe(true))}
          >
            <Plus className="h-4 w-4" /> {tab === 'alimentos' ? 'Nuevo' : 'Nueva receta'}
          </button>
          {tab === 'alimentos' && (
            <button className="btn-secondary !min-h-0 !px-3 !py-1.5 text-sm" onClick={() => setScanOpen(true)}>
              <ScanLine className="h-4 w-4" /> Escanear
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Archivados
        </label>
      </div>

      {tab === 'alimentos' ? (
        filteredFoods.length === 0 ? (
          <EmptyState
            title="Sin alimentos"
            description={term ? 'Sin resultados.' : 'Crea tu primer alimento para empezar a registrar.'}
          />
        ) : (
          <ul className="space-y-2">
            {filteredFoods.map((f) => (
              <li key={f.id} className={cn('card flex items-center gap-3 !p-3', f.archived && 'opacity-60')}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-medium">{f.name}</p>
                    {f.favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {f.brand ? `${f.brand} · ` : ''}por {f.portionSize}
                    {f.portionUnit === 'g' || f.portionUnit === 'ml' ? f.portionUnit : ` ${f.portionUnit}`}
                  </p>
                  <MacroChips macros={f} className="mt-1" />
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <IconBtn label="Favorito" onClick={() => repos.foods.setFavorite(f.id, !f.favorite)}>
                    <Star className={cn('h-4 w-4', f.favorite && 'fill-amber-400 text-amber-400')} />
                  </IconBtn>
                  <IconBtn label="Editar" onClick={() => setEditFood(f)}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label={f.archived ? 'Restaurar' : 'Archivar'}
                    onClick={() => repos.foods.setArchived(f.id, !f.archived)}
                  >
                    {f.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  </IconBtn>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : filteredRecipes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin recetas"
          description={term ? 'Sin resultados.' : 'Combina varios alimentos en una receta reutilizable.'}
        />
      ) : (
        <ul className="space-y-2">
          {filteredRecipes.map((r) => (
            <li key={r.id} className={cn('card flex items-center gap-3 !p-3', r.archived && 'opacity-60')}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-zinc-400">
                  {r.ingredients.length} ingredientes · {r.servings} porciones
                </p>
                <MacroChips macros={recipeMacrosPerServing(r, foodsById)} className="mt-1" />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <IconBtn label="Editar" onClick={() => setEditRecipe(r)}>
                  <Pencil className="h-4 w-4" />
                </IconBtn>
                <IconBtn
                  label={r.archived ? 'Restaurar' : 'Archivar'}
                  onClick={() => repos.recipes.setArchived(r.id, !r.archived)}
                >
                  {r.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FoodFormModal open={newFood} onClose={() => setNewFood(false)} />
      {editFood && <FoodFormModal open onClose={() => setEditFood(null)} initial={editFood} />}
      <LabelScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
      <RecipeFormModal open={newRecipe} onClose={() => setNewRecipe(false)} />
      {editRecipe && <RecipeFormModal open onClose={() => setEditRecipe(null)} initial={editRecipe} />}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-brand-600 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
