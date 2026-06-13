import { cn } from '@/lib/cn';

export function AscendMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative grid place-items-center overflow-hidden rounded-[1.15rem] bg-stone-950 text-white shadow-[0_18px_34px_-22px_rgba(12,12,10,0.9)] dark:bg-white dark:text-zinc-950',
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-x-1 top-1 h-3 rounded-full bg-teal-300/80 blur-sm" />
      <svg viewBox="0 0 48 48" className="relative h-7 w-7" fill="none">
        <path
          d="M24 9 36.5 35H30l-2.25-5.4h-7.6L17.9 35h-6.4L24 9Z"
          fill="currentColor"
        />
        <path d="M21.8 24.7h4.45L24 19.3l-2.2 5.4Z" fill="rgb(45 212 191)" />
      </svg>
    </div>
  );
}
