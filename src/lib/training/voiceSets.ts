import { z } from 'zod';
import type { WeightUnit } from '@/lib/schema';

export const spokenSetSchema = z
  .object({
    setNumber: z.number().int().min(1).max(100),
    weight: z.number().finite().min(0).max(2000),
    unit: z.enum(['kg', 'lb']),
    reps: z.number().int().min(1).max(1000),
    rir: z.number().finite().min(0).max(10).optional(),
    rpe: z.number().finite().min(0).max(10).optional(),
  })
  .refine((set) => set.rir === undefined || set.rpe === undefined, {
    message: 'Selecciona RIR o RPE para cada serie.',
  });
export type SpokenSet = z.infer<typeof spokenSetSchema>;

export interface ParsedSpokenSet {
  setNumber?: number;
  weight?: number;
  unit: WeightUnit;
  reps?: number;
  rir?: number;
  rpe?: number;
}

const smallNumbers: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintiuna: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900,
  mil: 1000,
};

/** Speech services return either digits or Spanish number words. */
export function normalizeSpokenText(text: string): string {
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const vocabulary = Object.keys(smallNumbers)
    .sort((a, b) => b.length - a.length)
    .join('|');
  normalized = normalized.replace(
    new RegExp(`\\b(?:${vocabulary})(?:\\s+(?:y\\s+)?(?:${vocabulary}))*\\b`, 'g'),
    (phrase) => {
      const parts = phrase.split(/\s+/).filter((part) => part !== 'y');
      // "diez cero" is deliberately not treated as 10, 0, RPE, or RIR.
      if (parts.length > 1 && parts.some((part) => smallNumbers[part] === 0)) return phrase;
      const numbers = parts.map((part) => smallNumbers[part]!);
      if (numbers.length > 1 && numbers[0]! < 30) return phrase;
      if (numbers.length > 1 && numbers.some((n, i) => i > 0 && n >= numbers[i - 1]!)) {
        return phrase;
      }
      return String(numbers.reduce((total, n) => total + n, 0));
    },
  );
  return normalized
    .replace(/(\d)\s*(?:coma|punto)\s*(\d)/g, '$1.$2')
    .replace(/(\d),(\d)/g, '$1.$2');
}

const ordinalNumbers: Record<string, number> = {
  primera: 1,
  primer: 1,
  segunda: 2,
  segundo: 2,
  tercera: 3,
  tercer: 3,
  cuarta: 4,
  cuarto: 4,
  quinta: 5,
  quinto: 5,
  sexta: 6,
  sexto: 6,
  septima: 7,
  septimo: 7,
  octava: 8,
  octavo: 8,
  novena: 9,
  noveno: 9,
  decima: 10,
  decimo: 10,
};

/** A dictation is scoped to one selected exercise; known other exercises need a new entry. */
export function findOtherExerciseMentions(
  text: string,
  selectedName: string,
  names: string[],
): string[] {
  const normalizeName = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\b(?:de|del|en|la|el|con)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  const selected = normalizeName(selectedName);
  let remaining = ` ${normalizeName(text)} `;
  // Avoid flagging "press banca" inside the selected "press banca inclinado".
  if (selected) remaining = remaining.replaceAll(` ${selected} `, ' ');
  return [...new Set(names)].filter((name) => {
    const normalized = normalizeName(name);
    return normalized && normalized !== selected && remaining.includes(` ${normalized} `);
  });
}

/**
 * Local, conservative interpretation: each phrase containing reps is one set.
 * Explicit units and named RIR/RPE are recognized; unclear effort stays empty.
 * Every interpretation is reviewed and editable before it touches the log.
 */
export function parseSpokenSets(
  text: string,
  defaultUnit: WeightUnit,
): {
  sets: ParsedSpokenSet[];
  warnings: string[];
} {
  const normalized = normalizeSpokenText(text);
  const warnings: string[] = [];
  const sets: ParsedSpokenSet[] = [];
  // Split at a new set phrase, or at a conjunction followed by a rep/weight value.
  // A repeated count ("dos series de ocho reps") is expanded below.
  const chunks = normalized.split(
    /(?:[;\n]+|\.(?!\d)|\b(?:luego|despues)\b|(?=\b(?:en\s+)?(?:la\s+)?(?:primera|segunda|tercera|cuarta|quinta|sexta|septima|octava|novena|decima|otra|siguiente)\b)|(?=\bserie\s+\d+\b)|\s+y\s+(?=(?:\d+(?:\.\d+)?\s*(?:reps?|repeticiones|kg|kilos?|kilogramos?|lb|libras?)\b)))/,
  );
  let lastWeight: number | undefined;
  let lastUnit = defaultUnit;
  let inheritedWeight = false;
  let usedDefaultUnit = false;
  for (const chunk of chunks) {
    const weightMatch = chunk.match(
      /(?<![-\d.])(\d+(?:\.\d+)?)\s*(kg|kilos?|kilogramos?|lb|lbs|libras?)\b/,
    );
    if (weightMatch) {
      lastWeight = Number(weightMatch[1]);
      lastUnit = /^(lb|libra)/.test(weightMatch[2]!) ? 'lb' : 'kg';
    }
    const repsMatches = [
      ...chunk.matchAll(/(?<![-\d.])(\d+(?:\.\d+)?)\s*(?:reps?|repeticiones)\b/g),
    ];
    if (repsMatches.length > 1) {
      warnings.push(
        'Hay varias series juntas que no pude separar. Usa «otra serie» o punto y coma entre ellas y vuelve a revisar.',
      );
      continue;
    }
    const repsMatch = repsMatches[0];
    const countMatch = chunk.match(/\b(\d+)\s*(?:series|sets)\b/);
    if (!repsMatch) continue;
    const ordinal = chunk.match(
      /\b(primera|primer|segunda|segundo|tercera|tercer|cuarta|cuarto|quinta|quinto|sexta|sexto|septima|septimo|octava|octavo|novena|noveno|decima|decimo)\b/,
    );
    const numbered = chunk.match(/\bserie\s+(\d+)\b/);
    const rir = chunk.match(
      /\b(?:rir|r\s*i\s*r|repeticiones?\s+en\s+reserva)\s*(?:de\s*)?(\d+(?:\.\d+)?)(?![\d.])/,
    );
    const rpe = chunk.match(/\b(?:rpe|r\s*p\s*e)\s*(?:de\s*)?(\d+(?:\.\d+)?)(?![\d.])/);
    const bodyweight = /\b(?:sin peso|peso corporal)\b/.test(chunk);
    const bareWeight = chunk.match(
      /\b(?:peso|con)\s+(\d+(?:\.\d+)?)(?![\d.])(?:\s*(?:,|y|para|a)|\s*$)/,
    );
    const weight = bodyweight
      ? 0
      : weightMatch
        ? Number(weightMatch[1])
        : bareWeight
          ? Number(bareWeight[1])
          : lastWeight;
    if (bareWeight && !weightMatch) {
      lastWeight = Number(bareWeight[1]);
      lastUnit = defaultUnit;
    }
    if (bodyweight) lastWeight = 0;
    if (bareWeight && !weightMatch) usedDefaultUnit = true;
    if (!weightMatch && !bareWeight && !bodyweight && lastWeight !== undefined)
      inheritedWeight = true;
    if (weight === undefined)
      warnings.push('Completa el peso que falta; puedes usar 0 para peso corporal.');
    const ambiguousEffort = /\b(?:10|diez)\s+(?:0|cero)\b/.test(chunk);
    if (ambiguousEffort || (/\b(?:rir|rpe)\b/.test(chunk) && !rir && !rpe)) {
      warnings.push(
        'No quedó claro el esfuerzo. Elige RIR o RPE y completa el valor, o déjalo sin registrar.',
      );
    }
    if (rir && rpe) warnings.push('Se escucharon RIR y RPE juntos. Elige cuál quieres registrar.');
    const explicitNumber = numbered
      ? Number(numbered[1])
      : ordinal
        ? ordinalNumbers[ordinal[1]!]
        : undefined;
    const count = countMatch ? Number(countMatch[1]) : 1;
    if (count < 1 || count > 20) {
      warnings.push('Puedes registrar de 1 a 20 series por dictado. Revisa la cantidad.');
      continue;
    }
    for (let n = 0; n < count; n++) {
      sets.push({
        ...(explicitNumber !== undefined ? { setNumber: explicitNumber + n } : {}),
        weight,
        unit: weightMatch || (!bareWeight && lastWeight !== undefined) ? lastUnit : defaultUnit,
        reps: Number(repsMatch[1]),
        ...(rir && !rpe && !ambiguousEffort ? { rir: Number(rir[1]) } : {}),
        ...(rpe && !rir && !ambiguousEffort ? { rpe: Number(rpe[1]) } : {}),
      });
    }
  }
  if (inheritedWeight)
    warnings.push(
      'Se reutilizó el último peso mencionado en las series sin peso. Revísalo antes de guardar.',
    );
  if (usedDefaultUnit) warnings.push(`Para los pesos sin unidad se usó ${defaultUnit}.`);
  if (!sets.length)
    warnings.push(
      'No pude separar las series. Prueba: «170 libras, 8 reps, RIR 0; otra de 7 reps, RIR 0». También puedes completar una serie abajo.',
    );
  if (sets.length > 20) warnings.push('Hay más de 20 series. Divide el registro en dos dictados.');
  return { sets: sets.slice(0, 20), warnings: [...new Set(warnings)] };
}
