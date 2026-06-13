import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[1.35rem] border border-dashed border-stone-300 bg-white/55 px-6 py-10 text-center backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/55">
      {Icon && (
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div>
        <p className="font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
