import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DateNav } from '@/components/ui/DateNav';
import { DayLog } from './DayLog';
import { FoodLibrary } from './FoodLibrary';
import { useSettings } from '@/app/providers/settings';
import { useToday } from '@/app/hooks/useToday';
import type { DateKey } from '@/lib/datetime';

export function NutritionScreen() {
  const { settings } = useSettings();
  const { dateKey: today } = useToday();
  const [view, setView] = useState<'diario' | 'biblioteca'>('diario');
  const [date, setDate] = useState<DateKey>(today);

  return (
    <div className="space-y-4">
      <PageHeader title="Alimentación" />

      <SegmentedControl
        className="w-full"
        value={view}
        onChange={setView}
        options={[
          { value: 'diario', label: 'Diario' },
          { value: 'biblioteca', label: 'Biblioteca' },
        ]}
      />

      {view === 'diario' ? (
        <>
          <DateNav dateKey={date} onChange={setDate} timeZone={settings.timeZone} max={today} />
          <DayLog dateKey={date} />
        </>
      ) : (
        <FoodLibrary />
      )}
    </div>
  );
}
