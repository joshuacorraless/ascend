import { getRepositories } from '@/lib/repositories';
import { newEntity } from '@/lib/factories';
import { todayKey } from '@/lib/datetime';
import type {
  Equipment,
  Exercise,
  ExerciseType,
  MuscleGroup,
  RoutineExercise,
  TrackingType,
  WorkoutRoutine,
} from '@/lib/schema';

/**
 * Importación ADITIVA de rutinas desde un JSON propio del usuario (p. ej. una
 * rutina que llevaba en otro lado). A diferencia del respaldo completo (que
 * reemplaza TODO), esto solo agrega: crea los ejercicios que falten en la
 * biblioteca —como si se hubieran metido a mano— y arma las rutinas por día.
 *
 * Formato (ver ROUTINE_TEMPLATE_JSON). Es tolerante: acepta faltantes, sinónimos
 * y alias en inglés, y aplica valores por defecto razonables. Las series al
 * fallo se marcan con `alFallo: true` (o `reps: "al fallo"`).
 */

// ── Forma intermedia ya normalizada y validada ───────────────────────────────
export interface ParsedExercise {
  name: string;
  primaryMuscle: MuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
  trackingType: TrackingType;
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
  toFailure: boolean;
  restSeconds?: number;
  notes?: string;
}

export interface ParsedRoutine {
  name: string;
  description?: string;
  daysOfWeek: number[];
  exercises: ParsedExercise[];
}

export type RoutineImportParse =
  | { ok: true; routines: ParsedRoutine[] }
  | { ok: false; error: string };

export interface RoutineImportSummary {
  exercisesCreated: number;
  routinesCreated: number;
  routineNames: string[];
}

// ── Utilidades de coerción ───────────────────────────────────────────────────
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Primer valor definido entre varias claves alternativas de un objeto. */
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

function asInt(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v.trim()) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function asBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = norm(v);
    if (['si', 'yes', 'true', '1', 'x', 'fallo', 'al fallo'].includes(s)) return true;
    if (['no', 'false', '0'].includes(s)) return false;
  }
  return undefined;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// ── Mapas de sinónimos ───────────────────────────────────────────────────────
const DAY_MAP: Record<string, number> = {
  // domingo = 0 … sábado = 6 (consistente con Date.getDay)
  domingo: 0, dom: 0, sunday: 0, sun: 0, d: 0,
  lunes: 1, lun: 1, monday: 1, mon: 1, l: 1,
  martes: 2, mar: 2, tuesday: 2, tue: 2,
  miercoles: 3, mie: 3, mier: 3, wednesday: 3, wed: 3, x: 3,
  jueves: 4, jue: 4, thursday: 4, thu: 4, j: 4,
  viernes: 5, vie: 5, friday: 5, fri: 5, v: 5,
  sabado: 6, sab: 6, saturday: 6, sat: 6, s: 6,
};

const MUSCLE_MAP: Record<string, MuscleGroup> = {
  pecho: 'pecho', pectoral: 'pecho', pectorales: 'pecho', chest: 'pecho',
  espalda: 'espalda', back: 'espalda', dorsal: 'espalda', dorsales: 'espalda', lat: 'espalda', lats: 'espalda',
  hombro: 'hombros', hombros: 'hombros', deltoides: 'hombros', delts: 'hombros', shoulders: 'hombros',
  biceps: 'biceps', bicep: 'biceps',
  triceps: 'triceps', tricep: 'triceps',
  cuadriceps: 'cuadriceps', cuads: 'cuadriceps', quad: 'cuadriceps', quads: 'cuadriceps', pierna: 'cuadriceps', piernas: 'cuadriceps', legs: 'cuadriceps',
  femoral: 'femoral', femorales: 'femoral', isquios: 'femoral', isquiotibiales: 'femoral', hamstring: 'femoral', hamstrings: 'femoral',
  gluteo: 'gluteo', gluteos: 'gluteo', glute: 'gluteo', glutes: 'gluteo',
  gemelo: 'gemelo', gemelos: 'gemelo', pantorrilla: 'gemelo', pantorrillas: 'gemelo', calf: 'gemelo', calves: 'gemelo',
  core: 'core', abdomen: 'core', abdominales: 'core', abs: 'core',
  antebrazo: 'antebrazo', antebrazos: 'antebrazo', forearm: 'antebrazo', forearms: 'antebrazo',
  trapecio: 'trapecio', trapecios: 'trapecio', traps: 'trapecio',
  cardio: 'cardio',
};

const EQUIPMENT_MAP: Record<string, Equipment> = {
  barra: 'barra', barbell: 'barra',
  mancuerna: 'mancuerna', mancuernas: 'mancuerna', dumbbell: 'mancuerna', dumbbells: 'mancuerna', db: 'mancuerna',
  maquina: 'maquina', machine: 'maquina',
  polea: 'polea', poleas: 'polea', cable: 'polea', cables: 'polea',
  'peso corporal': 'peso_corporal', peso_corporal: 'peso_corporal', corporal: 'peso_corporal', bodyweight: 'peso_corporal', calistenia: 'peso_corporal',
  smith: 'smith', multipower: 'smith',
};

const TYPE_MAP: Record<string, ExerciseType> = {
  compuesto: 'compuesto', compound: 'compuesto',
  aislamiento: 'aislamiento', aislado: 'aislamiento', isolation: 'aislamiento',
  cardio: 'cardio',
  otro: 'otro', other: 'otro',
};

function mapDay(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : undefined;
  if (n !== undefined) return n >= 0 && n <= 6 ? n : undefined;
  const s = asString(v);
  return s ? DAY_MAP[norm(s)] : undefined;
}

function parseDays(v: unknown): number[] {
  const raw = Array.isArray(v) ? v : v !== undefined ? [v] : [];
  const out = new Set<number>();
  for (const item of raw) {
    const d = mapDay(item);
    if (d !== undefined) out.add(d);
  }
  return [...out].sort((a, b) => a - b);
}

function mapMuscle(s?: string): MuscleGroup {
  return (s && MUSCLE_MAP[norm(s)]) || 'otro';
}

function mapEquipment(s?: string): Equipment {
  return (s && EQUIPMENT_MAP[norm(s)]) || 'maquina';
}

function mapType(s: string | undefined, muscle: MuscleGroup): ExerciseType {
  if (s && TYPE_MAP[norm(s)]) return TYPE_MAP[norm(s)]!;
  return muscle === 'cardio' ? 'cardio' : 'otro';
}

/** Resuelve el rango de reps a partir de min/max o de un campo `reps` ("8-12", 10…). */
function parseRepRange(min: number | undefined, max: number | undefined, raw: unknown): [number, number] {
  let lo = min;
  let hi = max;
  if ((lo === undefined || hi === undefined) && raw !== undefined) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      lo ??= Math.round(raw);
      hi ??= Math.round(raw);
    } else if (typeof raw === 'string') {
      const m = raw.match(/(\d+)\s*(?:[-–a]\s*(\d+))?/);
      if (m) {
        lo ??= Number(m[1]);
        hi ??= m[2] !== undefined ? Number(m[2]) : Number(m[1]);
      }
    }
  }
  let a = clamp(lo ?? 8, 1, 100);
  let b = clamp(hi ?? 12, 1, 100);
  if (a > b) [a, b] = [b, a];
  return [a, b];
}

// ── Parseo del archivo ───────────────────────────────────────────────────────
function extractRoutines(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (isRecord(json)) {
    const list = pick(json, ['rutinas', 'routines']);
    if (Array.isArray(list)) return list;
    // ¿Es una sola rutina suelta?
    if (pick(json, ['ejercicios', 'exercises']) !== undefined) return [json];
  }
  return null;
}

function parseExercise(raw: unknown): ParsedExercise | null {
  if (!isRecord(raw)) return null;
  const name = asString(pick(raw, ['nombre', 'name', 'ejercicio', 'exercise']));
  if (!name) return null;

  const muscle = mapMuscle(asString(pick(raw, ['musculo', 'músculo', 'muscle', 'primaryMuscle', 'grupo'])));
  const equipment = mapEquipment(asString(pick(raw, ['equipo', 'equipment', 'maquina', 'máquina'])));
  const type = mapType(asString(pick(raw, ['tipo', 'type'])), muscle);
  const targetSets = clamp(asInt(pick(raw, ['series', 'sets', 'targetSets'])) ?? 3, 1, 20);
  const repsRaw = pick(raw, ['reps', 'repeticiones', 'rango']);
  const [repRangeMin, repRangeMax] = parseRepRange(
    asInt(pick(raw, ['repsMin', 'repRangeMin', 'minReps', 'reps_min'])),
    asInt(pick(raw, ['repsMax', 'repRangeMax', 'maxReps', 'reps_max'])),
    repsRaw,
  );
  // "Al fallo": campo explícito (alFallo/fallo/toFailure…) o implícito en el
  // texto de reps ("al fallo", "AMRAP"…). Un false explícito gana.
  const toFailure =
    asBool(pick(raw, ['alFallo', 'al_fallo', 'alfallo', 'al fallo', 'fallo', 'toFailure', 'to_failure', 'failure'])) ??
    (typeof repsRaw === 'string' && /\b(fallo|failure|amrap)\b/.test(norm(repsRaw)));
  const restRaw = asInt(pick(raw, ['descanso', 'rest', 'restSeconds', 'descansoSegundos']));
  const notes = asString(pick(raw, ['notas', 'notes', 'nota']));

  return {
    name,
    primaryMuscle: muscle,
    equipment,
    type,
    trackingType: equipment === 'peso_corporal' ? 'bodyweight_reps' : 'weight_reps',
    targetSets,
    repRangeMin,
    repRangeMax,
    toFailure,
    ...(restRaw !== undefined ? { restSeconds: clamp(restRaw, 0, 3600) } : {}),
    ...(notes ? { notes } : {}),
  };
}

function parseRoutine(raw: unknown): ParsedRoutine | null {
  if (!isRecord(raw)) return null;
  const exercisesRaw = pick(raw, ['ejercicios', 'exercises']);
  if (!Array.isArray(exercisesRaw)) return null;
  const exercises = exercisesRaw.map(parseExercise).filter((e): e is ParsedExercise => e !== null);
  if (exercises.length === 0) return null;

  const name = asString(pick(raw, ['nombre', 'name'])) ?? 'Rutina importada';
  const description = asString(pick(raw, ['descripcion', 'descripción', 'description']));
  const daysOfWeek = parseDays(pick(raw, ['dias', 'días', 'days']));

  return { name, daysOfWeek, exercises, ...(description ? { description } : {}) };
}

/** Valida y normaliza el texto del archivo. No escribe en la BD. */
export function parseRoutineImport(text: string): RoutineImportParse {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
  const rawRoutines = extractRoutines(json);
  if (!rawRoutines) {
    return {
      ok: false,
      error: 'No encontré rutinas. Usa { "rutinas": [ … ] } o descarga la plantilla de ejemplo.',
    };
  }
  const routines = rawRoutines.map(parseRoutine).filter((r): r is ParsedRoutine => r !== null);
  if (routines.length === 0) {
    return { ok: false, error: 'Ninguna rutina tenía un ejercicio válido (revisa nombres y "ejercicios").' };
  }
  return { ok: true, routines };
}

// ── Construcción de entidades (pura, sin BD) ─────────────────────────────────
export function buildImportEntities(
  routines: ParsedRoutine[],
  existing: Exercise[],
): { newExercises: Exercise[]; routines: WorkoutRoutine[]; summary: RoutineImportSummary } {
  const byName = new Map<string, string>();
  for (const ex of existing) byName.set(norm(ex.name), ex.id);

  const newExercises: Exercise[] = [];
  const routinesOut: WorkoutRoutine[] = [];

  for (const r of routines) {
    const routineExercises: RoutineExercise[] = r.exercises.map((pe, i) => {
      const key = norm(pe.name);
      let id = byName.get(key);
      if (!id) {
        const ex = newEntity<Exercise>({
          name: pe.name,
          primaryMuscle: pe.primaryMuscle,
          secondaryMuscles: [],
          type: pe.type,
          equipment: pe.equipment,
          trackingType: pe.trackingType,
          unilateral: false,
          archived: false,
        });
        id = ex.id;
        byName.set(key, id);
        newExercises.push(ex);
      }
      return {
        exerciseId: id,
        order: i,
        targetSets: pe.targetSets,
        repRangeMin: pe.repRangeMin,
        repRangeMax: pe.repRangeMax,
        toFailure: pe.toFailure,
        ...(pe.restSeconds !== undefined ? { restSeconds: pe.restSeconds } : {}),
        ...(pe.notes ? { notes: pe.notes } : {}),
      };
    });

    routinesOut.push(
      newEntity<WorkoutRoutine>({
        name: r.name,
        daysOfWeek: r.daysOfWeek,
        exercises: routineExercises,
        active: false,
        archived: false,
        ...(r.description ? { description: r.description } : {}),
      }),
    );
  }

  return {
    newExercises,
    routines: routinesOut,
    summary: {
      exercisesCreated: newExercises.length,
      routinesCreated: routinesOut.length,
      routineNames: routinesOut.map((r) => r.name),
    },
  };
}

/** Aplica la importación: crea ejercicios faltantes y guarda las rutinas. */
export async function applyRoutineImport(routines: ParsedRoutine[]): Promise<RoutineImportSummary> {
  const repos = getRepositories();
  const existing = await repos.exercises.list({ includeArchived: true });
  const { newExercises, routines: routinesOut, summary } = buildImportEntities(routines, existing);
  if (newExercises.length > 0) await repos.exercises.bulkPut(newExercises);
  for (const routine of routinesOut) await repos.routines.put(routine);
  return summary;
}

// ── Plantilla de ejemplo descargable ─────────────────────────────────────────
export const ROUTINE_TEMPLATE_JSON = JSON.stringify(
  {
    rutinas: [
      {
        nombre: 'Empuje (Push)',
        dias: ['lunes', 'jueves'],
        descripcion: 'Pecho, hombro y tríceps',
        ejercicios: [
          { nombre: 'Press de banca', series: 4, repsMin: 6, repsMax: 10, descanso: 120, musculo: 'pecho', equipo: 'barra' },
          { nombre: 'Press inclinado con mancuernas', series: 3, reps: '8-12', musculo: 'pecho', equipo: 'mancuerna' },
          { nombre: 'Elevaciones laterales', series: 4, reps: 15, musculo: 'hombros', equipo: 'mancuerna' },
          { nombre: 'Extensión de tríceps en polea', series: 3, alFallo: true, musculo: 'triceps', equipo: 'polea' },
        ],
      },
      {
        nombre: 'Pierna',
        dias: ['martes', 'viernes'],
        ejercicios: [
          { nombre: 'Sentadilla', series: 4, reps: '5-8', descanso: 180, musculo: 'cuadriceps', equipo: 'barra' },
          { nombre: 'Prensa de piernas', series: 3, reps: 12, musculo: 'cuadriceps', equipo: 'maquina' },
          { nombre: 'Curl femoral', series: 3, reps: 12, musculo: 'femoral', equipo: 'maquina' },
          { nombre: 'Elevación de gemelos', series: 4, reps: 15, musculo: 'gemelo', equipo: 'maquina' },
        ],
      },
    ],
  },
  null,
  2,
);

/** Descarga la plantilla de ejemplo como archivo en el navegador. */
export function downloadRoutineTemplate(): void {
  const blob = new Blob([ROUTINE_TEMPLATE_JSON], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ascend-rutina-plantilla-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
