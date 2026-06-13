import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { newEntity } from '@/lib/factories';
import { nowIso } from '@/lib/ids';
import { localTime } from '@/lib/datetime';
import { formatWeight, weightToKg } from '@/lib/units';
import type { DateKey } from '@/lib/datetime';
import type { BodyWeightEntry } from '@/lib/schema';

export function WeightQuickAddModal({
  open,
  onClose,
  dateKey,
  defaultKg,
}: {
  open: boolean;
  onClose: () => void;
  dateKey: DateKey;
  defaultKg?: number;
}) {
  const { settings } = useSettings();
  const { success } = useToast();
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const save = async () => {
    const num = Number(value.replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) return;
    const repos = getRepositories();
    await repos.bodyWeight.put(
      newEntity<BodyWeightEntry>({
        localDate: dateKey,
        loggedAt: nowIso(),
        weightKg: weightToKg(num, settings.weightUnit),
        time: localTime(new Date(), settings.timeZone),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    );
    success(`Peso registrado: ${formatWeight(weightToKg(num, settings.weightUnit), settings.weightUnit)}`);
    setValue('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar peso"
      footer={
        <button className="btn-primary w-full" onClick={save} disabled={!value}>
          Guardar
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="bw-value">
            Peso ({settings.weightUnit})
          </label>
          <input
            id="bw-value"
            type="number"
            inputMode="decimal"
            step="any"
            autoFocus
            className="input text-lg"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={defaultKg ? String(defaultKg) : '0'}
          />
        </div>
        <div>
          <label className="label" htmlFor="bw-notes">
            Notas (opcional)
          </label>
          <input
            id="bw-notes"
            type="text"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="En ayunas, después de entrenar…"
          />
        </div>
      </div>
    </Modal>
  );
}
