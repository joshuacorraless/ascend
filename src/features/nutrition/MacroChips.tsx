import { round } from '@/lib/units';
import { cn } from '@/lib/cn';
import type { Macros } from '@/lib/schema';

/**
 * Resumen de macros monocromo. Las calorías destacan en tinta; P/C/G van en
 * píldoras neutras con la inicial como rótulo. Sin color decorativo.
 */
export function MacroChips({ macros, className }: { macros: Macros; className?: string }) {
  return (
    <div className={cn('nums flex flex-wrap items-center gap-1.5 text-xs', className)}>
      <span className="rounded-md bg-ink px-1.5 py-0.5 font-semibold text-paper">
        {round(macros.calories)} kcal
      </span>
      <span className="rounded-md border border-line px-1.5 py-0.5 text-ink-soft">
        <span className="text-ink-faint">P</span> {round(macros.protein)}
      </span>
      <span className="rounded-md border border-line px-1.5 py-0.5 text-ink-soft">
        <span className="text-ink-faint">C</span> {round(macros.carbs)}
      </span>
      <span className="rounded-md border border-line px-1.5 py-0.5 text-ink-soft">
        <span className="text-ink-faint">G</span> {round(macros.fat)}
      </span>
    </div>
  );
}
