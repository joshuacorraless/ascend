import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import {
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
  MUSCLE_LABELS,
  MUSCLE_ORDER,
  TRACKING_TYPE_LABELS,
} from './constants';
import { useToast } from '@/app/providers/toast';
import { useBusy } from '@/app/hooks/useBusy';
import { getRepositories } from '@/lib/repositories';
import { newEntity, touch } from '@/lib/factories';
import { cn } from '@/lib/cn';
import type { Equipment, Exercise, ExerciseType, MuscleGroup, TrackingType } from '@/lib/schema';

export function ExerciseFormModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Exercise;
  onSaved?: (exercise: Exercise) => void;
}) {
  const { success, error } = useToast();
  const { busy, run } = useBusy();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [primaryMuscle, setPrimary] = useState<MuscleGroup>(initial?.primaryMuscle ?? 'pecho');
  const [secondary, setSecondary] = useState<MuscleGroup[]>(initial?.secondaryMuscles ?? []);
  const [type, setType] = useState<ExerciseType>(initial?.type ?? 'compuesto');
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? 'barra');
  const [tracking, setTracking] = useState<TrackingType>(initial?.trackingType ?? 'weight_reps');
  const [unilateral, setUnilateral] = useState(initial?.unilateral ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const toggleSecondary = (m: MuscleGroup) =>
    setSecondary((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const save = async () => {
    if (!name.trim()) {
      error('Ponle un nombre al ejercicio.');
      return;
    }
    const repos = getRepositories();
    const values = {
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      primaryMuscle,
      secondaryMuscles: secondary.filter((m) => m !== primaryMuscle),
      type,
      equipment,
      trackingType: tracking,
      unilateral,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    const saved: Exercise = initial
      ? touch({
          ...initial,
          ...values,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
        })
      : newEntity<Exercise>({ ...values, archived: false });
    await repos.exercises.put(saved);
    success(initial ? 'Ejercicio actualizado.' : 'Ejercicio creado.');
    onSaved?.(saved);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      footer={
        <button className="btn-primary w-full" onClick={() => run(save)} disabled={busy}>
          {busy ? 'Guardando…' : initial ? 'Guardar' : 'Crear ejercicio'}
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre" htmlFor="e-name">
          <input
            id="e-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>
        <Field
          label="Descripción (opcional)"
          htmlFor="e-desc"
          hint="Se muestra bajo el nombre (variante, agarre, ángulo…)."
        >
          <input
            id="e-desc"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="p. ej. agarre cerrado, banco a 30°"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Músculo principal" htmlFor="e-prim">
            <select
              id="e-prim"
              className="input"
              value={primaryMuscle}
              onChange={(e) => setPrimary(e.target.value as MuscleGroup)}
            >
              {MUSCLE_ORDER.map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Equipo" htmlFor="e-eq">
            <select
              id="e-eq"
              className="input"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as Equipment)}
            >
              {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((eq) => (
                <option key={eq} value={eq}>
                  {EQUIPMENT_LABELS[eq]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo" htmlFor="e-type">
            <select
              id="e-type"
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as ExerciseType)}
            >
              {(Object.keys(EXERCISE_TYPE_LABELS) as ExerciseType[]).map((t) => (
                <option key={t} value={t}>
                  {EXERCISE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Registro" htmlFor="e-track">
            <select
              id="e-track"
              className="input"
              value={tracking}
              onChange={(e) => setTracking(e.target.value as TrackingType)}
            >
              {(Object.keys(TRACKING_TYPE_LABELS) as TrackingType[]).map((t) => (
                <option key={t} value={t}>
                  {TRACKING_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <span className="label">Músculos secundarios (opcional)</span>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_ORDER.filter((m) => m !== primaryMuscle).map((m) => (
              <button
                key={m}
                onClick={() => toggleSecondary(m)}
                className={cn('chip', secondary.includes(m) && 'chip-active')}
              >
                {MUSCLE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            className="accent-ink"
            checked={unilateral}
            onChange={(e) => setUnilateral(e.target.checked)}
          />
          Ejercicio unilateral (un lado a la vez)
        </label>

        <Field label="Notas técnicas (opcional)" htmlFor="e-notes">
          <input
            id="e-notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
