import { cn } from '@/lib/cn';

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex rounded-2xl border border-stone-200/80 bg-white/50 p-1 shadow-inner shadow-white/70 dark:border-white/10 dark:bg-zinc-900/80 dark:shadow-none',
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-xl font-semibold transition',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-2 text-sm',
              active
                ? 'bg-stone-950 text-white shadow-sm dark:bg-white dark:text-zinc-950'
                : 'text-zinc-500 hover:bg-white/70 hover:text-stone-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
