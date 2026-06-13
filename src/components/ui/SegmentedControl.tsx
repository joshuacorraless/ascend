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
        'inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800',
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
              'rounded-lg font-medium transition',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
