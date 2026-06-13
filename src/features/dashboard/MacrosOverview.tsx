import { ProgressRing } from '@/components/ui/ProgressRing';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { macroProgress, type MacroProgress } from '@/lib/domain';
import { round } from '@/lib/units';
import type { Macros, NutritionGoal } from '@/lib/schema';

function MacroRow({ label, p, unit }: { label: string; p: MacroProgress; unit: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="tabular-nums text-zinc-500">
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">{round(p.consumed)}</span>
          {' / '}
          {round(p.target)} {unit}
          {p.over > 0 ? (
            <span className="ml-1 text-amber-600 dark:text-amber-400">(+{p.over})</span>
          ) : (
            <span className="ml-1 text-zinc-400">· faltan {p.remaining}</span>
          )}
        </span>
      </div>
      <ProgressBar percent={p.percent} over={p.over > 0} />
    </div>
  );
}

export function MacrosOverview({ goal, consumed }: { goal: NutritionGoal; consumed: Macros }) {
  const cal = macroProgress(consumed.calories, goal.calories);
  const protein = macroProgress(consumed.protein, goal.protein);
  const carbs = macroProgress(consumed.carbs, goal.carbs);
  const fat = macroProgress(consumed.fat, goal.fat);

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <ProgressRing percent={cal.percent} over={cal.over > 0} size={104} strokeWidth={11}>
          <div className="text-center leading-tight">
            <p className="text-xl font-bold tabular-nums">{round(cal.consumed)}</p>
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">de {round(cal.target)}</p>
          </div>
        </ProgressRing>
        <div className="flex-1">
          <p className="text-sm text-zinc-500">Calorías</p>
          {cal.over > 0 ? (
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {cal.over} kcal de más
            </p>
          ) : (
            <p className="text-lg font-bold">
              {cal.remaining} <span className="text-sm font-medium text-zinc-500">kcal restantes</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <MacroRow label="Proteína" p={protein} unit="g" />
        <MacroRow label="Carbohidratos" p={carbs} unit="g" />
        <MacroRow label="Grasas" p={fat} unit="g" />
      </div>
    </div>
  );
}
