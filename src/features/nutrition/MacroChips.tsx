import { round } from '@/lib/units';
import { cn } from '@/lib/cn';
import type { Macros } from '@/lib/schema';

export function MacroChips({ macros, className }: { macros: Macros; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 text-xs', className)}>
      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        {round(macros.calories)} kcal
      </span>
      <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
        P {round(macros.protein)}
      </span>
      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        C {round(macros.carbs)}
      </span>
      <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
        G {round(macros.fat)}
      </span>
    </div>
  );
}
