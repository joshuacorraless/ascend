import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '@/components/ui/Modal';
import { Caret } from '@/components/ui/Caret';
import { Field } from '@/components/ui/Field';
import { MUSCLE_LABELS } from './constants';
import { useToast } from '@/app/providers/toast';
import { useBusy } from '@/app/hooks/useBusy';
import { getRepositories } from '@/lib/repositories';
import { newEntity, touch } from '@/lib/factories';
import { WEEKDAY_LABELS } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import type { Exercise, RoutineExercise, WorkoutRoutine } from '@/lib/schema';
import { workoutRoutineSchema } from '@/lib/schema';

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
      {
        exerciseId: picker,
        order: prev.length,
        targetSets: 3,
        repRangeMin: 8,
        repRangeMax: 12,
        restSeconds: 90,
        toFailure: false,
      },
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
    if (
      !workoutRoutineSchema.safeParse(saved).success ||
      items.some((item) =>
        item.prescribedSets
          ? item.prescribedSets.length !== item.targetSets ||
            item.prescribedSets.some(
              (set) =>
                (!set.toFailure &&
                  (set.repRangeMin === undefined || set.repRangeMax === undefined)) ||
                (set.repRangeMin !== undefined &&
                  set.repRangeMax !== undefined &&
                  set.repRangeMin > set.repRangeMax),
            )
          : item.repRangeMin > item.repRangeMax,
      )
    ) {
      error(
        'Revisá los objetivos: 1–20 series, 1–100 reps y un máximo de reps mayor o igual al mínimo.',
      );
      return;
    }
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
          <input
            id="rt-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push, Pull, Pierna…"
            autoFocus
          />
        </Field>
        <Field label="Descripción (opcional)" htmlFor="rt-desc">
          <input
            id="rt-desc"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div>
          <span className="label">Días sugeridos (opcional)</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className={cn('chip', days.includes(idx) && 'chip-active')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Ejercicios</span>
          <div className="mb-2.5 flex gap-2">
            <select
              className="input flex-1"
              value={picker}
              onChange={(e) => setPicker(e.target.value)}
            >
              <option value="">Seleccionar ejercicio…</option>
              {available.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <button className="btn-secondary px-4" onClick={addExercise} disabled={!picker}>
              Añadir
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-ink-muted">Sin ejercicios todavía.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((it, i) => {
                const ex = exById.get(it.exerciseId);
                return (
                  <li key={i} className="rounded-xl border border-line bg-inset p-3.5">
                    <div className="mb-2.5 flex items-start gap-1.5">
                      <span className="flex-1 font-semibold leading-snug text-ink">
                        {ex?.name ?? 'Ejercicio'}
                      </span>
                      <button
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:text-ink disabled:opacity-25"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label="Subir"
                      >
                        <Caret dir="up" />
                      </button>
                      <button
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:text-ink disabled:opacity-25"
                        onClick={() => move(i, 1)}
                        disabled={i === items.length - 1}
                        aria-label="Bajar"
                      >
                        <Caret dir="down" />
                      </button>
                      <button
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-ink-muted transition hover:text-danger-600"
                        onClick={() => remove(i)}
                      >
                        Quitar
                      </button>
                    </div>

                    {!it.prescribedSets && (
                      <button
                        onClick={() => update(i, { toFailure: !it.toFailure })}
                        aria-pressed={!!it.toFailure}
                        className={cn('chip mb-2.5', it.toFailure && 'chip-active')}
                      >
                        Al fallo
                      </button>
                    )}

                    {it.prescribedSets && (
                      <div className="mb-3 space-y-3">
                        <p className="text-xs font-semibold">
                          {it.prescribedSets.length} series · objetivos individuales
                        </p>
                        {it.prescribedSets.map((set, s) => {
                          const updateSet = (patch: Partial<typeof set>) =>
                            update(i, {
                              prescribedSets: it.prescribedSets!.map((entry, index) =>
                                index === s ? { ...entry, ...patch } : entry,
                              ),
                            });
                          return (
                            <div key={s} className="space-y-2 rounded-lg border border-line p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold">Serie {s + 1}</span>
                                <button
                                  className={cn('chip', set.toFailure && 'chip-active')}
                                  aria-pressed={!!set.toFailure}
                                  onClick={() => updateSet({ toFailure: !set.toFailure })}
                                >
                                  Al fallo
                                </button>
                              </div>
                              {(set.repRangeMin !== undefined || !set.toFailure) && (
                                <div className="grid grid-cols-2 gap-2">
                                  <NumField
                                    label="Rep min"
                                    value={set.repRangeMin ?? 0}
                                    onChange={(value) => updateSet({ repRangeMin: value })}
                                  />
                                  <NumField
                                    label="Rep max"
                                    value={set.repRangeMax ?? 0}
                                    onChange={(value) => updateSet({ repRangeMax: value })}
                                  />
                                </div>
                              )}
                              <label className="block">
                                <span className="label">Indicación de la serie</span>
                                <input
                                  className="input text-sm"
                                  value={set.notes ?? ''}
                                  onChange={(event) => updateSet({ notes: event.target.value })}
                                />
                              </label>
                              <button
                                className="text-xs text-ink-muted"
                                disabled={it.prescribedSets!.length === 1}
                                onClick={() =>
                                  update(i, {
                                    prescribedSets: it.prescribedSets!.filter(
                                      (_, index) => index !== s,
                                    ),
                                    targetSets: it.prescribedSets!.length - 1,
                                  })
                                }
                              >
                                Quitar serie
                              </button>
                            </div>
                          );
                        })}
                        <button
                          className="btn-secondary w-full text-sm"
                          disabled={it.prescribedSets.length >= 20}
                          onClick={() =>
                            update(i, {
                              prescribedSets: [
                                ...it.prescribedSets!,
                                { ...it.prescribedSets!.at(-1) },
                              ],
                              targetSets: it.prescribedSets!.length + 1,
                            })
                          }
                        >
                          Añadir serie
                        </button>
                      </div>
                    )}

                    <div className={cn('grid gap-2', it.toFailure ? 'grid-cols-2' : 'grid-cols-4')}>
                      {!it.prescribedSets && (
                        <NumField
                          label="Series"
                          value={it.targetSets}
                          onChange={(v) => update(i, { targetSets: v })}
                        />
                      )}
                      {!it.prescribedSets && (
                        <>
                          <NumField
                            label="Rep min"
                            value={it.repRangeMin}
                            onChange={(v) => update(i, { repRangeMin: v })}
                          />
                          <NumField
                            label="Rep max"
                            value={it.repRangeMax}
                            onChange={(v) => update(i, { repRangeMax: v })}
                          />
                        </>
                      )}
                      <NumField
                        label="Desc (s)"
                        value={it.restSeconds ?? 0}
                        onChange={(v) => update(i, { restSeconds: v })}
                      />
                    </div>
                    {it.toFailure && (
                      <p className="mt-2 text-xs text-ink-muted">
                        Registrarás las repeticiones reales alcanzadas en cada serie.
                      </p>
                    )}
                    <label className="mt-3 block">
                      <span className="label">Notas del ejercicio</span>
                      <textarea
                        className="input text-sm"
                        value={it.notes ?? ''}
                        onChange={(event) => update(i, { notes: event.target.value })}
                      />
                    </label>
                    {ex && (
                      <p className="mt-1.5 text-xs text-ink-muted">
                        {MUSCLE_LABELS[ex.primaryMuscle]}
                      </p>
                    )}
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

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-2xs font-medium text-ink-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        className="input nums !px-2 !py-1.5 text-center"
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
      />
    </label>
  );
}
