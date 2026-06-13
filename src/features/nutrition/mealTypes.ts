import type { MealType } from '@/lib/schema';

export const MEAL_TYPE_ORDER: MealType[] = [
  'desayuno',
  'almuerzo',
  'cena',
  'merienda',
  'preentreno',
  'postentreno',
  'otra',
];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  merienda: 'Merienda',
  preentreno: 'Preentreno',
  postentreno: 'Postentreno',
  otra: 'Otra',
};
