import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Droplet, Undo2 } from 'lucide-react';
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

  const entries = useLiveQuery(() => repos.water.listByDate(dateKey), [dateKey], [] as WaterEntry[]);
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
        <div className="rounded-2xl bg-sky-50 p-4 text-center dark:bg-sky-950/40">
          <Droplet className="mx-auto h-7 w-7 text-sky-500" />
          <p className="mt-2 text-2xl font-bold">{formatVolume(total, settings.volumeUnit)}</p>
          <p className="text-sm text-zinc-500">
            de {formatVolume(target, settings.volumeUnit)} ({Math.round(percent)}%)
          </p>
          <ProgressBar percent={percent} tone="sky" className="mt-3" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PRESETS_ML.map((ml) => (
            <button key={ml} className="btn-secondary flex-col !py-3" onClick={() => add(ml)}>
              <span className="text-base font-bold">{formatVolume(ml, settings.volumeUnit)}</span>
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
          <Undo2 className="h-4 w-4" /> Deshacer último
        </button>
      </div>
    </Modal>
  );
}
