import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { RoutineList } from './RoutineList';
import { ExerciseLibrary } from './ExerciseLibrary';
import { SessionHistory } from './SessionHistory';

export function TrainingScreen() {
  const [tab, setTab] = useState<'rutinas' | 'ejercicios' | 'historial'>('rutinas');

  return (
    <div className="space-y-4">
      <PageHeader title="Entrenamiento" />

      <SegmentedControl
        className="w-full"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'rutinas', label: 'Rutinas' },
          { value: 'ejercicios', label: 'Ejercicios' },
          { value: 'historial', label: 'Historial' },
        ]}
      />

      {tab === 'rutinas' && <RoutineList />}
      {tab === 'ejercicios' && <ExerciseLibrary />}
      {tab === 'historial' && <SessionHistory />}
    </div>
  );
}
