import type { Equipment, ExerciseType, MuscleGroup, SetType, TrackingType } from '@/lib/schema';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  cuadriceps: 'Cuádriceps',
  femoral: 'Femoral',
  gluteo: 'Glúteo',
  gemelo: 'Gemelo',
  core: 'Core',
  antebrazo: 'Antebrazo',
  trapecio: 'Trapecio',
  cardio: 'Cardio',
  otro: 'Otro',
};

export const MUSCLE_ORDER = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barra: 'Barra libre',
  mancuerna: 'Mancuernas',
  maquina: 'Máquina',
  polea: 'Polea',
  peso_corporal: 'Peso corporal',
  smith: 'Máquina Smith',
};

export const EQUIPMENT_ORDER = Object.keys(EQUIPMENT_LABELS) as Equipment[];

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  compuesto: 'Compuesto',
  aislamiento: 'Aislamiento',
  cardio: 'Cardio',
  otro: 'Otro',
};

export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  weight_reps: 'Peso × reps',
  bodyweight_reps: 'Peso corporal × reps',
  time: 'Tiempo',
  distance: 'Distancia',
};

export const SET_TYPE_LABELS: Record<SetType, string> = {
  calentamiento: 'Calentamiento',
  efectiva: 'Efectiva',
  dropset: 'Drop set',
  fallo: 'Al fallo',
};

export const SET_TYPE_SHORT: Record<SetType, string> = {
  calentamiento: 'W',
  efectiva: '',
  dropset: 'D',
  fallo: 'F',
};
