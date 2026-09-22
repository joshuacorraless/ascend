import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { NotFoundScreen } from './NotFoundScreen';

const NutritionScreen = lazy(() =>
  import('@/features/nutrition/NutritionScreen').then((m) => ({ default: m.NutritionScreen })),
);
const TrainingScreen = lazy(() =>
  import('@/features/training/TrainingScreen').then((m) => ({ default: m.TrainingScreen })),
);
const SessionScreen = lazy(() =>
  import('@/features/training/SessionScreen').then((m) => ({ default: m.SessionScreen })),
);
const ProgressScreen = lazy(() =>
  import('@/features/progress/ProgressScreen').then((m) => ({ default: m.ProgressScreen })),
);
const RoutineProgressScreen = lazy(() =>
  import('@/features/progress/RoutineProgressScreen').then((m) => ({
    default: m.RoutineProgressScreen,
  })),
);
const ExerciseDetailScreen = lazy(() =>
  import('@/features/progress/ExerciseDetailScreen').then((m) => ({
    default: m.ExerciseDetailScreen,
  })),
);
const WaterScreen = lazy(() =>
  import('@/features/water/WaterScreen').then((m) => ({ default: m.WaterScreen })),
);
const SupplementsScreen = lazy(() =>
  import('@/features/supplements/SupplementsScreen').then((m) => ({
    default: m.SupplementsScreen,
  })),
);
const BodyWeightScreen = lazy(() =>
  import('@/features/bodyweight/BodyWeightScreen').then((m) => ({ default: m.BodyWeightScreen })),
);
const SettingsScreen = lazy(() =>
  import('@/features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardScreen /> },
      { path: 'alimentacion', element: <NutritionScreen /> },
      { path: 'entrenamiento', element: <TrainingScreen /> },
      { path: 'entrenamiento/sesion/:sessionId', element: <SessionScreen /> },
      { path: 'progreso', element: <ProgressScreen /> },
      { path: 'progreso/rutina/:routineId', element: <RoutineProgressScreen /> },
      { path: 'progreso/rutina/:routineId/ejercicio/:exerciseId', element: <ExerciseDetailScreen /> },
      { path: 'progreso/ejercicio/:exerciseId', element: <ExerciseDetailScreen /> },
      { path: 'agua', element: <WaterScreen /> },
      { path: 'suplementos', element: <SupplementsScreen /> },
      { path: 'peso', element: <BodyWeightScreen /> },
      { path: 'ajustes', element: <SettingsScreen /> },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
]);
