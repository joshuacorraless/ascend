import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Archive, ArchiveRestore, Dumbbell, Pencil, Plus, Search, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExerciseFormModal } from './ExerciseFormModal';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from './constants';
import { buildSeedExercises } from './exerciseSeed';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { cn } from '@/lib/cn';
import type { Exercise } from '@/lib/schema';

export function ExerciseLibrary() {
  const repos = getRepositories();
  const { success } = useToast();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState<Exercise | null>(null);

  const exercises = useLiveQuery(
    () => repos.exercises.list({ includeArchived: showArchived }),
    [showArchived],
    [] as Exercise[],
  );

  const term = search.trim().toLowerCase();
  const filtered = (exercises ?? []).filter(
    (e) => !term || e.name.toLowerCase().includes(term) || MUSCLE_LABELS[e.primaryMuscle].toLowerCase().includes(term),
  );

  const loadSeed = async () => {
    await repos.exercises.bulkPut(buildSeedExercises());
    success('Ejercicios de ejemplo añadidos. Edítalos a tu gusto.');
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input className="input pl-9" placeholder="Buscar ejercicio…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-primary !min-h-0 !px-3 !py-1.5 text-sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nuevo
        </button>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Ver archivados
        </label>
      </div>

      {(exercises ?? []).length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sin ejercicios"
          description="Crea los tuyos o empieza con un set de ejercicios comunes (luego puedes editarlos)."
          action={
            <button className="btn-secondary" onClick={loadSeed}>
              <Sparkles className="h-4 w-4" /> Cargar ejercicios de ejemplo
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">Sin resultados.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <li key={e.id} className={cn('card flex items-center gap-3 !p-3', e.archived && 'opacity-60')}>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.name}</p>
                <p className="text-xs text-zinc-400">
                  {MUSCLE_LABELS[e.primaryMuscle]} · {EQUIPMENT_LABELS[e.equipment]}
                  {e.unilateral ? ' · unilateral' : ''}
                </p>
              </div>
              <button className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-brand-600 dark:hover:bg-zinc-800" onClick={() => setEdit(e)} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-brand-600 dark:hover:bg-zinc-800"
                onClick={() => repos.exercises.setArchived(e.id, !e.archived)}
                aria-label={e.archived ? 'Restaurar' : 'Archivar'}
              >
                {e.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ExerciseFormModal open={creating} onClose={() => setCreating(false)} />
      {edit && <ExerciseFormModal open onClose={() => setEdit(null)} initial={edit} />}
    </div>
  );
}
