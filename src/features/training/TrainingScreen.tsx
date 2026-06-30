import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { RoutineList } from './RoutineList';
import { ExerciseLibrary } from './ExerciseLibrary';
import { SessionHistory } from './SessionHistory';

export function TrainingScreen() {
  const [tab, setTab] = useState<'rutinas' | 'ejercicios' | 'historial'>('rutinas');

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Fuerza" title="Entrenamiento" />

      <SegmentedControl
        stretch
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
