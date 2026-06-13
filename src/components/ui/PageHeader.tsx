import type { ReactNode } from 'react';
import { AscendMark } from '@/components/brand/AscendMark';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 pt-4">
      <div className="flex items-center gap-3">
        <AscendMark className="h-11 w-11 shrink-0" />
        <div>
          <h1 className="text-2xl font-black">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm font-medium text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
