import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '@/components/ui/Modal';
import { DateNav } from '@/components/ui/DateNav';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { newEntity, touch } from '@/lib/factories';
import { nowIso } from '@/lib/ids';
import { localTime, todayKey } from '@/lib/datetime';
import { formatWeight, round, weightToDisplay, weightToKg } from '@/lib/units';
import { parseDecimalInput } from '@/lib/numberInput';
import { useBusy } from '@/app/hooks/useBusy';
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
  const { busy, run } = useBusy();
  const repos = getRepositories();

  const [date, setDate] = useState<DateKey>(dateKey);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const placeholder = defaultKg ? String(round(weightToDisplay(defaultKg, settings.weightUnit), 1)) : '0';

  // Al abrir, posiciona en el día indicado.
  useEffect(() => {
    if (open) setDate(dateKey);
  }, [open, dateKey]);

  // Un único registro por día: carga el del día seleccionado para editarlo.
  const existing = useLiveQuery(() => repos.bodyWeight.getByDate(date), [date]);
  useEffect(() => {
    if (existing) {
      setValue(String(round(weightToDisplay(existing.weightKg, settings.weightUnit), 1)));
      setNotes(existing.notes ?? '');
    } else {
      setValue('');
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, date, settings.weightUnit]);

  const save = async () => {
    const num = parseDecimalInput(value);
    if (!Number.isFinite(num) || num <= 0) return;
    const weightKg = weightToKg(num, settings.weightUnit);
    const time = localTime(new Date(), settings.timeZone);
    if (existing) {
      // Sobrescribe el peso de ese día (un valor por día).
      await repos.bodyWeight.put(
        touch({ ...existing, weightKg, time, notes: notes.trim() || undefined }),
      );
    } else {
      await repos.bodyWeight.put(
        newEntity<BodyWeightEntry>({
          localDate: date,
          loggedAt: nowIso(),
          weightKg,
          time,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      );
    }
    success(`Peso de ${date}: ${formatWeight(weightKg, settings.weightUnit)}`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar peso"
      footer={
        <button className="btn-primary w-full" onClick={() => run(save)} disabled={!value || busy}>
          {busy ? 'Guardando…' : existing ? 'Actualizar' : 'Guardar'}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="label">Día</span>
          <DateNav dateKey={date} onChange={setDate} timeZone={settings.timeZone} max={todayKey(settings.timeZone)} />
          {existing && (
            <p className="mt-1.5 text-xs text-ink-muted">
              Ya hay un peso ese día; al guardar lo reemplazas.
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="bw-value">
            Peso ({settings.weightUnit})
          </label>
          <input
            id="bw-value"
            type="text"
            inputMode="decimal"
            autoFocus
            className="input text-lg"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
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
