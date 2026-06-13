import { newEntity } from '@/lib/factories';
import type { Equipment, Exercise, ExerciseType, MuscleGroup, TrackingType } from '@/lib/schema';

interface SeedDef {
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  type: ExerciseType;
  equipment: Equipment;
  trackingType?: TrackingType;
  unilateral?: boolean;
}

const SEED: SeedDef[] = [
  { name: 'Press de banca', primaryMuscle: 'pecho', secondaryMuscles: ['triceps', 'hombros'], type: 'compuesto', equipment: 'barra' },
  { name: 'Sentadilla', primaryMuscle: 'cuadriceps', secondaryMuscles: ['gluteo', 'femoral'], type: 'compuesto', equipment: 'barra' },
  { name: 'Peso muerto', primaryMuscle: 'espalda', secondaryMuscles: ['femoral', 'gluteo'], type: 'compuesto', equipment: 'barra' },
  { name: 'Press militar', primaryMuscle: 'hombros', secondaryMuscles: ['triceps'], type: 'compuesto', equipment: 'barra' },
  { name: 'Remo con barra', primaryMuscle: 'espalda', secondaryMuscles: ['biceps'], type: 'compuesto', equipment: 'barra' },
  { name: 'Dominadas', primaryMuscle: 'espalda', secondaryMuscles: ['biceps'], type: 'compuesto', equipment: 'peso_corporal', trackingType: 'bodyweight_reps' },
  { name: 'Jalón al pecho', primaryMuscle: 'espalda', secondaryMuscles: ['biceps'], type: 'compuesto', equipment: 'polea' },
  { name: 'Press inclinado con mancuernas', primaryMuscle: 'pecho', secondaryMuscles: ['hombros', 'triceps'], type: 'compuesto', equipment: 'mancuerna' },
  { name: 'Prensa de piernas', primaryMuscle: 'cuadriceps', secondaryMuscles: ['gluteo'], type: 'compuesto', equipment: 'maquina' },
  { name: 'Curl femoral', primaryMuscle: 'femoral', type: 'aislamiento', equipment: 'maquina' },
  { name: 'Hip thrust', primaryMuscle: 'gluteo', secondaryMuscles: ['femoral'], type: 'compuesto', equipment: 'barra' },
  { name: 'Elevaciones laterales', primaryMuscle: 'hombros', type: 'aislamiento', equipment: 'mancuerna' },
  { name: 'Curl de bíceps con mancuerna', primaryMuscle: 'biceps', type: 'aislamiento', equipment: 'mancuerna', unilateral: true },
  { name: 'Extensión de tríceps en polea', primaryMuscle: 'triceps', type: 'aislamiento', equipment: 'polea' },
  { name: 'Zancadas', primaryMuscle: 'cuadriceps', secondaryMuscles: ['gluteo'], type: 'compuesto', equipment: 'mancuerna', unilateral: true },
  { name: 'Plancha', primaryMuscle: 'core', type: 'aislamiento', equipment: 'peso_corporal', trackingType: 'time' },
  { name: 'Elevación de gemelos', primaryMuscle: 'gemelo', type: 'aislamiento', equipment: 'maquina' },
];

/** Construye los ejercicios semilla (editables como cualquier otro). */
export function buildSeedExercises(): Exercise[] {
  return SEED.map((s) =>
    newEntity<Exercise>({
      name: s.name,
      primaryMuscle: s.primaryMuscle,
      secondaryMuscles: s.secondaryMuscles ?? [],
      type: s.type,
      equipment: s.equipment,
      trackingType: s.trackingType ?? 'weight_reps',
      unilateral: s.unilateral ?? false,
      archived: false,
    }),
  );
}
