import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { SUPPLEMENT_TIME_LABELS, SUPPLEMENT_TIME_ORDER } from './constants';
import { useBusy } from '@/app/hooks/useBusy';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { newEntity, touch } from '@/lib/factories';
import { WEEKDAY_LABELS } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import type { Supplement, SupplementTime } from '@/lib/schema';

export function SupplementFormModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Supplement;
}) {
  const { success, error } = useToast();
  const { busy, run } = useBusy();
  const [name, setName] = useState(initial?.name ?? '');
  const [dose, setDose] = useState(initial?.dose ?? '');
  const [time, setTime] = useState<SupplementTime>(initial?.time ?? 'mañana');
  const [days, setDays] = useState<number[]>(initial?.daysOfWeek ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const save = async () => {
    if (!name.trim()) {
      error('Ponle un nombre al suplemento.');
      return;
    }
    const repos = getRepositories();
    const values = {
      name: name.trim(),
      ...(dose.trim() ? { dose: dose.trim() } : {}),
      time,
      daysOfWeek: days,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    const saved: Supplement = initial
      ? touch({
          ...initial,
          ...values,
          dose: dose.trim() || undefined,
          notes: notes.trim() || undefined,
        })
      : newEntity<Supplement>({ ...values, archived: false });
    await repos.supplements.put(saved);
    success(initial ? 'Suplemento actualizado.' : 'Suplemento creado.');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar suplemento' : 'Nuevo suplemento'}
      footer={
        <button className="btn-primary w-full" onClick={() => run(save)} disabled={busy}>
          {busy ? 'Guardando…' : initial ? 'Guardar' : 'Crear'}
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre" htmlFor="s-name">
          <input
            id="s-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Multivitamínico, Magnesio…"
          />
        </Field>
        <Field
          label="Dosis (opcional)"
          htmlFor="s-dose"
          hint="Solo informativo; la app no recomienda dosis."
        >
          <input
            id="s-dose"
            className="input"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="5 g, 1 cápsula…"
          />
        </Field>
        <Field label="Momento del día" htmlFor="s-time">
          <select
            id="s-time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value as SupplementTime)}
          >
            {SUPPLEMENT_TIME_ORDER.map((t) => (
              <option key={t} value={t}>
                {SUPPLEMENT_TIME_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <span className="label">Días (vacío = todos los días)</span>
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
        <Field label="Notas (opcional)" htmlFor="s-notes">
          <input
            id="s-notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
