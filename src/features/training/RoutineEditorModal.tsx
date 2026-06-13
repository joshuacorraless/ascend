import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { MUSCLE_LABELS } from './constants';
import { useToast } from '@/app/providers/toast';
import { useBusy } from '@/app/hooks/useBusy';
import { getRepositories } from '@/lib/repositories';
import { newEntity, touch } from '@/lib/factories';
import { WEEKDAY_LABELS } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import type { Exercise, RoutineExercise, WorkoutRoutine } from '@/lib/schema';

export function RoutineEditorModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: WorkoutRoutine;
}) {
  const { success, error } = useToast();
  const { busy, run } = useBusy();
  const exercises = useLiveQuery(() => getRepositories().exercises.list(), [], [] as Exercise[]);
  const exById = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises]);

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [days, setDays] = useState<number[]>(initial?.daysOfWeek ?? []);
  const [items, setItems] = useState<RoutineExercise[]>(
    initial?.exercises ? [...initial.exercises].sort((a, b) => a.order - b.order) : [],
  );
  const [picker, setPicker] = useState('');

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const addExercise = () => {
    if (!picker) return;
    setItems((prev) => [
      ...prev,
      { exerciseId: picker, order: prev.length, targetSets: 3, repRangeMin: 8, repRangeMax: 12, restSeconds: 90 },
    ]);
    setPicker('');
  };

  const update = (i: number, patch: Partial<RoutineExercise>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const a = next[i]!;
      const b = next[j]!;
      next[i] = b;
      next[j] = a;
      return next;
    });
  };

  const save = async () => {
    if (!name.trim()) {
      error('Ponle un nombre a la rutina.');
      return;
    }
    if (items.length === 0) {
      error('Agrega al menos un ejercicio.');
      return;
    }
    const repos = getRepositories();
    const normalized = items.map((it, i) => ({ ...it, order: i }));
    const values = {
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      daysOfWeek: days,
      exercises: normalized,
    };
    const saved: WorkoutRoutine = initial
      ? touch({ ...initial, ...values, description: description.trim() || undefined })
      : newEntity<WorkoutRoutine>({ ...values, active: true, archived: false });
    await repos.routines.put(saved);
    success(initial ? 'Rutina actualizada.' : 'Rutina creada.');
    onClose();
  };

  const available = (exercises ?? []).filter((e) => !e.archived);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar rutina' : 'Nueva rutina'}
      size="lg"
      footer={
        <button className="btn-primary w-full" onClick={() => run(save)} disabled={busy}>
          {busy ? 'Guardando…' : initial ? 'Guardar rutina' : 'Crear rutina'}
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre" htmlFor="rt-name">
          <input id="rt-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Push, Pull, Pierna…" autoFocus />
        </Field>
        <Field label="Descripción (opcional)" htmlFor="rt-desc">
          <input id="rt-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div>
          <span className="label">Días sugeridos (opcional)</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, idx) => (
              <button key={idx} onClick={() => toggleDay(idx)} className={cn('chip', days.includes(idx) && 'chip-active')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Ejercicios</span>
          <div className="mb-2 flex gap-2">
            <select className="input flex-1" value={picker} onChange={(e) => setPicker(e.target.value)}>
              <option value="">Seleccionar ejercicio…</option>
              {available.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <button className="btn-secondary" onClick={addExercise} disabled={!picker}>
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin ejercicios todavía.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((it, i) => {
                const ex = exById.get(it.exerciseId);
                return (
                  <li key={i} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex-1 font-medium">{ex?.name ?? 'Ejercicio'}</span>
                      <button className="rounded p-1 text-zinc-400 hover:text-brand-600 disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button className="rounded p-1 text-zinc-400 hover:text-brand-600 disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button className="rounded p-1 text-zinc-400 hover:text-red-600" onClick={() => remove(i)} aria-label="Quitar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <NumField label="Series" value={it.targetSets} onChange={(v) => update(i, { targetSets: v })} />
                      <NumField label="Rep min" value={it.repRangeMin} onChange={(v) => update(i, { repRangeMin: v })} />
                      <NumField label="Rep max" value={it.repRangeMax} onChange={(v) => update(i, { repRangeMax: v })} />
                      <NumField label="Desc (s)" value={it.restSeconds ?? 0} onChange={(v) => update(i, { restSeconds: v })} />
                    </div>
                    {ex && <p className="mt-1 text-xs text-zinc-400">{MUSCLE_LABELS[ex.primaryMuscle]}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-zinc-500">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        className="input !px-2 !py-1.5 text-center"
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
      />
    </label>
  );
}
