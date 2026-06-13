import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { getRepositories } from '@/lib/repositories';
import { SUGGESTED_GOAL, createGoal } from '@/lib/defaults';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { GoalForm, type GoalValues } from '@/features/settings/GoalForm';
import type { VolumeUnit, WeightUnit } from '@/lib/schema';

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
    <div className="min-h-dvh bg-zinc-50 px-4 pb-12 pt-safe dark:bg-zinc-950">
      <div className="mx-auto max-w-md space-y-6 pt-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <ArrowUp className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bienvenido a Ascend</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Tu registro personal de nutrición y entrenamiento. Todo se guarda en este dispositivo.
              Empecemos por tus objetivos diarios.
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
            submitLabel="Comenzar"
            onSubmit={finish}
          />
          <p className="mt-3 text-center text-xs text-zinc-400">
            Puedes cambiar estos valores cuando quieras desde Ajustes.
          </p>
        </div>
      </div>
    </div>
  );
}
