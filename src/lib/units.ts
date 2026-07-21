import type { VolumeUnit, WeightUnit } from './schema/common';

export const KG_PER_LB = 0.45359237;

/** Redondea a `digits` decimales evitando ruido de coma flotante. */
export function round(value: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

// Peso (interno siempre en kg)

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** Convierte un peso en kg al número mostrado en la unidad elegida. */
export function weightToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg);
}

/** Convierte un número introducido en la unidad elegida a kg para guardar. */
export function weightToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value);
}

export function formatWeight(kg: number, unit: WeightUnit, digits = 1): string {
  return `${round(weightToDisplay(kg, unit), digits)} ${unit}`;
}

// Volumen / agua (interno siempre en ml)

export function volumeToDisplay(ml: number, unit: VolumeUnit): number {
  return unit === 'ml' ? ml : ml / 1000;
}

export function volumeToMl(value: number, unit: VolumeUnit): number {
  return unit === 'ml' ? value : value * 1000;
}

export function formatVolume(ml: number, unit: VolumeUnit): string {
  if (unit === 'l') return `${round(ml / 1000, 2)} L`;
  return `${round(ml)} ml`;
}

// Etiquetas legibles de unidades de porción

export const PORTION_UNIT_LABELS: Record<string, string> = {
  g: 'g',
  ml: 'ml',
  unidad: 'unidad',
  porcion: 'porción',
};

/** Formatea un número "bonito": sin decimales si es entero, si no 1-2 decimales. */
export function formatNumber(value: number, maxDigits = 1): string {
  if (Number.isInteger(value)) return value.toString();
  return round(value, maxDigits).toString();
}
