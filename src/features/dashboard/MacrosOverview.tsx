import { ProgressRing } from '@/components/ui/ProgressRing';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { macroProgress, type MacroProgress } from '@/lib/domain';
import { round } from '@/lib/units';
import type { Macros, NutritionGoal } from '@/lib/schema';

const MACRO_COLORS = {
  cal: '#51CF66',
  protein: '#FF8787',
  carbs: '#FFD43B',
  fat: '#4DABF7',
} as const;

function MacroRow({ label, p, unit, color }: { label: string; p: MacroProgress; unit: string; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
          {label}
        </span>
        <span className="nums text-ink-muted">
          <span className="font-bold text-ink">{round(p.consumed)}</span>
          {' / '}
          {round(p.target)} {unit}
          {p.over > 0 ? (
            <span className="ml-1.5 font-semibold text-danger-400">+{p.over}</span>
          ) : (
            <span className="ml-1.5 text-ink-faint">·&nbsp;{p.remaining}</span>
          )}
        </span>
      </div>
      <ProgressBar percent={p.percent} over={p.over > 0} color={color} />
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
      <div className="flex items-center gap-5">
        <ProgressRing percent={cal.percent} over={cal.over > 0} color={MACRO_COLORS.cal} size={112} strokeWidth={11}>
          <div className="text-center leading-none">
            <p className="nums text-2xl font-extrabold text-ink">{round(cal.consumed)}</p>
            <p className="eyebrow mt-1">de {round(cal.target)}</p>
          </div>
        </ProgressRing>
        <div className="flex-1">
          <p className="eyebrow">Calorías</p>
          {cal.over > 0 ? (
            <p className="mt-1 text-lg font-bold text-danger-400">
              <span className="nums">{cal.over}</span> kcal de más
            </p>
          ) : (
            <p className="mt-1 text-lg font-bold text-ink">
              <span className="nums">{cal.remaining}</span>{' '}
              <span className="text-sm font-medium text-ink-muted">kcal restantes</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <MacroRow label="Proteína" p={protein} unit="g" color={MACRO_COLORS.protein} />
        <MacroRow label="Carbohidratos" p={carbs} unit="g" color={MACRO_COLORS.carbs} />
        <MacroRow label="Grasas" p={fat} unit="g" color={MACRO_COLORS.fat} />
      </div>
    </div>
  );
}
