import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionButton } from '@/components/ui/ActionButton';
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
      <input
        className="input"
        placeholder="Buscar ejercicio…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex items-center justify-between">
        <button className="btn-primary !min-h-0 px-3.5 py-2 text-sm" onClick={() => setCreating(true)}>
          Nuevo
        </button>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            className="accent-ink"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Ver archivados
        </label>
      </div>

      {(exercises ?? []).length === 0 ? (
        <EmptyState
          title="Sin ejercicios"
          description="Crea los tuyos o empieza con un set de ejercicios comunes (luego puedes editarlos)."
          action={
            <button className="btn-secondary" onClick={loadSeed}>
              Cargar ejercicios de ejemplo
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Sin resultados.</p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((e) => (
            <li key={e.id} className={cn('card !p-4', e.archived && 'opacity-60')}>
              <p className="font-semibold leading-snug text-ink">{e.name}</p>
              {e.description && (
                <p className="mt-0.5 text-sm leading-snug text-ink-soft">{e.description}</p>
              )}
              <p className="mt-1 text-xs text-ink-muted">
                {MUSCLE_LABELS[e.primaryMuscle]} · {EQUIPMENT_LABELS[e.equipment]}
                {e.unilateral ? ' · unilateral' : ''}
              </p>
              <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
                <ActionButton onClick={() => setEdit(e)}>Editar</ActionButton>
                <ActionButton onClick={() => repos.exercises.setArchived(e.id, !e.archived)}>
                  {e.archived ? 'Restaurar' : 'Archivar'}
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ExerciseFormModal open={creating} onClose={() => setCreating(false)} />
      {edit && <ExerciseFormModal open onClose={() => setEdit(null)} initial={edit} />}
    </div>
  );
}
