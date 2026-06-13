import type { SupplementTime } from '@/lib/schema';

export const SUPPLEMENT_TIME_ORDER: SupplementTime[] = [
  'mañana',
  'tarde',
  'noche',
  'preentreno',
  'postentreno',
  'con_comida',
  'otro',
];

export const SUPPLEMENT_TIME_LABELS: Record<SupplementTime, string> = {
  mañana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
  preentreno: 'Preentreno',
  postentreno: 'Postentreno',
  con_comida: 'Con comida',
  otro: 'Otro',
};
