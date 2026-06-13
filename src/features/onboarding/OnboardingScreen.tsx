import { useState } from 'react';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { SUGGESTED_GOAL, createGoal } from '@/lib/defaults';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { GoalForm, type GoalValues } from '@/features/settings/GoalForm';
import type { VolumeUnit, WeightUnit } from '@/lib/schema';
import { AscendMark } from '@/components/brand/AscendMark';

export function OnboardingScreen() {
  const { settings, update } = useSettings();
  const { success } = useToast();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(settings.weightUnit);
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(settings.volumeUnit);

  const finish = async (values: GoalValues) => {
    const repos = getRepositories();
    await repos.goals.put(createGoal(values));
    await update({ weightUnit, volumeUnit, onboarded: true });
    success('¡Listo! Tus objetivos quedaron guardados.');
  };

  return (
    <div className="app-canvas min-h-dvh px-4 pb-12 pt-safe">
      <div className="mx-auto max-w-md space-y-6 pt-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <AscendMark className="h-16 w-16" />
          <div>
            <h1 className="text-2xl font-black">Ascend</h1>
            <p className="mt-1 text-sm font-medium text-zinc-500">
              Nutrición, agua, peso y entrenamiento en un solo registro privado.
            </p>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <span className="label mb-0">Unidad de peso</span>
            <SegmentedControl
              size="sm"
              value={weightUnit}
              onChange={setWeightUnit}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="label mb-0">Unidad de agua</span>
            <SegmentedControl
              size="sm"
              value={volumeUnit}
              onChange={setVolumeUnit}
              options={[
                { value: 'ml', label: 'ml' },
                { value: 'l', label: 'L' },
              ]}
            />
          </div>
        </div>

        <div className="card">
          <GoalForm
            volumeUnit={volumeUnit}
            initial={SUGGESTED_GOAL}
            submitLabel="Entrar"
            onSubmit={finish}
          />
          <p className="mt-3 text-center text-xs text-zinc-400">
            Todo queda en este dispositivo. Puedes ajustar metas después.
          </p>
        </div>
      </div>
    </div>
  );
}
