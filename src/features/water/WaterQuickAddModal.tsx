import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { newEntity } from '@/lib/factories';
import { nowIso } from '@/lib/ids';
import { sumWater } from '@/lib/domain';
import { formatVolume, round, volumeToMl } from '@/lib/units';
import { parseDecimalInput } from '@/lib/numberInput';
import type { DateKey } from '@/lib/datetime';
import type { WaterEntry } from '@/lib/schema';

const PRESETS_ML = [250, 500, 750];

export function WaterQuickAddModal({
  open,
  onClose,
  dateKey,
}: {
  open: boolean;
  onClose: () => void;
  dateKey: DateKey;
}) {
  const { settings } = useSettings();
  const { success } = useToast();
  const repos = getRepositories();
  const [custom, setCustom] = useState('');

  const entries = useLiveQuery(
    () => repos.water.listByDate(dateKey),
    [dateKey],
    [] as WaterEntry[],
  );
  const goal = useLiveQuery(() => repos.goals.resolveForDate(dateKey), [dateKey]);

  const total = sumWater(entries ?? []);
  const target = goal?.waterMl ?? 0;
  const percent = target > 0 ? (total / target) * 100 : 0;

  const add = async (ml: number) => {
    if (ml <= 0) return;
    await repos.water.add(
      newEntity<WaterEntry>({ localDate: dateKey, loggedAt: nowIso(), amountMl: round(ml) }),
    );
    success(`+${formatVolume(ml, settings.volumeUnit)} de agua`);
  };

  const addCustom = async () => {
    const value = parseDecimalInput(custom);
    if (!Number.isFinite(value) || value <= 0) return;
    await add(volumeToMl(value, settings.volumeUnit));
    setCustom('');
  };

  const undoLast = async () => {
    const list = entries ?? [];
    if (list.length === 0) return;
    const last = [...list].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0];
    if (last) await repos.water.remove(last.id);
  };

  return (
    <Modal open={open} onClose={onClose} title="Agua">
      <div className="space-y-5">
        <div className="rounded-2xl border border-line bg-canvas p-5 text-center">
          <p className="nums text-3xl font-semibold text-ink">
            {formatVolume(total, settings.volumeUnit)}
          </p>
          <p className="eyebrow mt-1.5">
            de {formatVolume(target, settings.volumeUnit)} · {Math.round(percent)}%
          </p>
          <ProgressBar percent={percent} color="#4DABF7" className="mt-4" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PRESETS_ML.map((ml) => (
            <button key={ml} className="btn-secondary !py-3" onClick={() => add(ml)}>
              <span className="nums text-base font-semibold">
                {formatVolume(ml, settings.volumeUnit)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="label" htmlFor="water-custom">
              Cantidad personalizada ({settings.volumeUnit === 'l' ? 'L' : 'ml'})
            </label>
            <input
              id="water-custom"
              type="text"
              inputMode="decimal"
              className="input"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="0"
            />
          </div>
          <button className="btn-primary" onClick={addCustom} disabled={!custom}>
            Añadir
          </button>
        </div>

        <button
          className="btn-ghost w-full"
          onClick={undoLast}
          disabled={(entries ?? []).length === 0}
        >
          Deshacer último
        </button>
      </div>
    </Modal>
  );
}
