import { round } from '@/lib/units';
import { cn } from '@/lib/cn';
import type { Macros } from '@/lib/schema';

/**
 * Resumen de macros en colores vivos: calorías (verde), proteína (rojo),
 * carbohidratos (amarillo) y grasas (azul). Cada píldora con su color.
 */
export function MacroChips({ macros, className }: { macros: Macros; className?: string }) {
  return (
    <div className={cn('nums flex flex-wrap items-center gap-1.5 text-xs font-bold', className)}>
      <span className="rounded-md bg-macro-cal/20 px-1.5 py-0.5 text-macro-cal">
        {round(macros.calories)} kcal
      </span>
      <span className="rounded-md bg-macro-protein/20 px-1.5 py-0.5 text-macro-protein">
        <span className="opacity-70">P</span> {round(macros.protein)}
      </span>
      <span className="rounded-md bg-macro-carbs/20 px-1.5 py-0.5 text-macro-carbs">
        <span className="opacity-70">C</span> {round(macros.carbs)}
      </span>
      <span className="rounded-md bg-macro-fat/20 px-1.5 py-0.5 text-macro-fat">
        <span className="opacity-70">G</span> {round(macros.fat)}
      </span>
    </div>
  );
}
