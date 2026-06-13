import { getDb } from '@/lib/db/database';
import { addDaysToKey, todayKey, type DateKey } from '@/lib/datetime';
import { macrosOf, scaleMacros } from '@/lib/domain';
import type {
  BodyWeightEntry,
  Exercise,
  ExerciseLog,
  Food,
  MealEntry,
  MealType,
  NutritionGoal,
  SetLog,
  Supplement,
  SupplementLog,
  WaterEntry,
  WorkoutRoutine,
  WorkoutSession,
} from '@/lib/schema';

const PREFIX = 'demo-';
const iso = (key: DateKey, hour = 8) => `${key}T${String(hour).padStart(2, '0')}:00:00.000Z`;
const meta = (key: DateKey) => ({ createdAt: iso(key), updatedAt: iso(key) });

function buildDemo() {
  const today = todayKey();
  const d = (n: number) => addDaysToKey(today, n);

  // ── Objetivo (vigente desde hace 40 días) ──────────────────────────────────
  const goal: NutritionGoal = {
    id: `${PREFIX}goal`,
    effectiveDate: d(-40),
    calories: 2400,
    protein: 180,
    carbs: 240,
    fat: 70,
    waterMl: 3000,
    ...meta(d(-40)),
  };

  // ── Alimentos ──────────────────────────────────────────────────────────────
  const mkFood = (id: string, name: string, ps: number, pu: Food['portionUnit'], m: number[], fav = false): Food => ({
    id: `${PREFIX}food-${id}`,
    name,
    portionSize: ps,
    portionUnit: pu,
    calories: m[0]!,
    protein: m[1]!,
    carbs: m[2]!,
    fat: m[3]!,
    source: 'demo',
    favorite: fav,
    archived: false,
    ...meta(d(-40)),
  });
  const pollo = mkFood('pollo', 'Pechuga de pollo', 100, 'g', [165, 31, 0, 3.6], true);
  const arroz = mkFood('arroz', 'Arroz blanco cocido', 100, 'g', [130, 2.4, 28, 0.3]);
  const avena = mkFood('avena', 'Avena en hojuelas', 40, 'g', [150, 5, 27, 3]);
  const huevo = mkFood('huevo', 'Huevo', 1, 'unidad', [72, 6.3, 0.4, 4.8], true);
  const yogur = mkFood('yogur', 'Yogur griego natural', 170, 'g', [100, 17, 6, 0.7], true);
  const foods = [pollo, arroz, avena, huevo, yogur];

  // ── Entradas de comida (hoy + ayer) ────────────────────────────────────────
  let mealCounter = 0;
  const entry = (key: DateKey, mealType: MealType, food: Food, quantity: number, label: string): MealEntry => ({
    id: `${PREFIX}meal-${mealCounter++}`,
    localDate: key,
    loggedAt: iso(key, 8),
    mealType,
    foodId: food.id,
    name: food.name,
    quantity,
    portionLabel: label,
    ...scaleMacros(macrosOf(food), quantity),
    ...meta(key),
  });
  const mealEntries: MealEntry[] = [
    entry(today, 'desayuno', avena, 1.5, '60 g'),
    entry(today, 'desayuno', yogur, 1, '170 g'),
    entry(today, 'almuerzo', pollo, 1.5, '150 g'),
    entry(today, 'almuerzo', arroz, 2, '200 g'),
    entry(d(-1), 'desayuno', huevo, 3, '3 unidades'),
    entry(d(-1), 'almuerzo', pollo, 2, '200 g'),
    entry(d(-1), 'cena', arroz, 1.5, '150 g'),
  ];

  // ── Agua (últimos 7 días) ──────────────────────────────────────────────────
  const waterEntries: WaterEntry[] = [];
  for (let n = 0; n >= -6; n--) {
    const key = d(n);
    const total = n === 0 ? 1500 : 2200 + ((n % 3) + 1) * 250;
    let acc = 0;
    let i = 0;
    while (acc < total) {
      const amt = Math.min(500, total - acc);
      waterEntries.push({
        id: `${PREFIX}water-${key}-${i++}`,
        localDate: key,
        loggedAt: iso(key, 9 + i),
        amountMl: amt,
        ...meta(key),
      });
      acc += amt;
    }
  }

  // ── Suplementos + registros de hoy ─────────────────────────────────────────
  const supplements: Supplement[] = [
    { id: `${PREFIX}sup-multi`, name: 'Multivitamínico', dose: '1 cápsula', time: 'mañana', daysOfWeek: [], archived: false, ...meta(d(-40)) },
    { id: `${PREFIX}sup-mag`, name: 'Magnesio', dose: '300 mg', time: 'noche', daysOfWeek: [], archived: false, ...meta(d(-40)) },
    { id: `${PREFIX}sup-creatina`, name: 'Creatina', dose: '5 g', time: 'postentreno', daysOfWeek: [], archived: false, ...meta(d(-40)) },
  ];
  const supplementLogs: SupplementLog[] = [
    { id: `${PREFIX}suplog-multi`, supplementId: `${PREFIX}sup-multi`, localDate: today, completed: true, completedAt: iso(today, 8), name: 'Multivitamínico', dose: '1 cápsula', ...meta(today) },
  ];

  // ── Ejercicios ─────────────────────────────────────────────────────────────
  const mkEx = (id: string, name: string, muscle: Exercise['primaryMuscle'], type: Exercise['type'], eq: Exercise['equipment']): Exercise => ({
    id: `${PREFIX}ex-${id}`,
    name,
    primaryMuscle: muscle,
    secondaryMuscles: [],
    type,
    equipment: eq,
    trackingType: 'weight_reps',
    unilateral: false,
    archived: false,
    ...meta(d(-40)),
  });
  const press = mkEx('press', 'Press de banca', 'pecho', 'compuesto', 'barra');
  const sentadilla = mkEx('sentadilla', 'Sentadilla', 'cuadriceps', 'compuesto', 'barra');
  const remo = mkEx('remo', 'Remo con barra', 'espalda', 'compuesto', 'barra');
  const exercises = [press, sentadilla, remo];

  // ── Rutina ─────────────────────────────────────────────────────────────────
  const routine: WorkoutRoutine = {
    id: `${PREFIX}routine-fullbody`,
    name: 'Full Body A',
    description: 'Rutina de cuerpo completo de ejemplo.',
    daysOfWeek: [1, 4],
    active: true,
    archived: false,
    exercises: [
      { exerciseId: press.id, order: 0, targetSets: 3, repRangeMin: 5, repRangeMax: 8, restSeconds: 120 },
      { exerciseId: sentadilla.id, order: 1, targetSets: 3, repRangeMin: 5, repRangeMax: 8, restSeconds: 150 },
      { exerciseId: remo.id, order: 2, targetSets: 3, repRangeMin: 8, repRangeMax: 12, restSeconds: 90 },
    ],
    ...meta(d(-30)),
  };

  // ── Sesiones históricas (progresión en press) ──────────────────────────────
  const sessions: WorkoutSession[] = [];
  const exerciseLogs: ExerciseLog[] = [];
  const setLogs: SetLog[] = [];
  const sessionDays = [-18, -11, -4];
  const pressWeights = [60, 62.5, 65];
  sessionDays.forEach((day, si) => {
    const key = d(day);
    const sid = `${PREFIX}session-${si}`;
    sessions.push({
      id: sid,
      routineId: routine.id,
      name: routine.name,
      localDate: key,
      startedAt: iso(key, 18),
      endedAt: iso(key, 19),
      durationSeconds: 3600,
      status: 'completed',
      ...meta(key),
    });
    const exForSession: Array<[Exercise, number, number]> = [
      [press, pressWeights[si]!, 6],
      [sentadilla, 80 + si * 5, 6],
      [remo, 50 + si * 2.5, 10],
    ];
    exForSession.forEach(([ex, weight, reps], ei) => {
      const logId = `${sid}-log-${ei}`;
      exerciseLogs.push({
        id: logId,
        sessionId: sid,
        exerciseId: ex.id,
        exerciseName: ex.name,
        trackingType: 'weight_reps',
        order: ei,
        ...meta(key),
      });
      for (let s = 1; s <= 3; s++) {
        setLogs.push({
          id: `${logId}-set-${s}`,
          sessionId: sid,
          exerciseLogId: logId,
          exerciseId: ex.id,
          setNumber: s,
          weightKg: weight,
          reps,
          setType: 'efectiva',
          completed: true,
          ...meta(key),
        });
      }
    });
  });

  // ── Peso corporal (tendencia ligera a la baja) ─────────────────────────────
  const bodyWeightEntries: BodyWeightEntry[] = [];
  for (let n = 30; n >= 0; n -= 3) {
    const key = d(-n);
    const weightKg = Math.round((80 - (30 - n) * 0.05) * 10) / 10;
    bodyWeightEntries.push({
      id: `${PREFIX}bw-${key}`,
      localDate: key,
      loggedAt: iso(key, 7),
      weightKg,
      time: '07:00',
      ...meta(key),
    });
  }

  return {
    goal,
    foods,
    mealEntries,
    waterEntries,
    supplements,
    supplementLogs,
    exercises,
    routine,
    sessions,
    exerciseLogs,
    setLogs,
    bodyWeightEntries,
  };
}

/** Carga el conjunto de datos de demostración (no borra los datos reales). */
export async function loadDemoData(): Promise<void> {
  const db = getDb();
  const data = buildDemo();
  await Promise.all([
    db.goals.put(data.goal),
    db.foods.bulkPut(data.foods),
    db.mealEntries.bulkPut(data.mealEntries),
    db.waterEntries.bulkPut(data.waterEntries),
    db.supplements.bulkPut(data.supplements),
    db.supplementLogs.bulkPut(data.supplementLogs),
    db.exercises.bulkPut(data.exercises),
    db.routines.put(data.routine),
    db.sessions.bulkPut(data.sessions),
    db.exerciseLogs.bulkPut(data.exerciseLogs),
    db.setLogs.bulkPut(data.setLogs),
    db.bodyWeightEntries.bulkPut(data.bodyWeightEntries),
  ]);
}

const DEMO_TABLES = [
  'goals',
  'foods',
  'recipes',
  'mealEntries',
  'waterEntries',
  'supplements',
  'supplementLogs',
  'exercises',
  'routines',
  'sessions',
  'exerciseLogs',
  'setLogs',
  'bodyWeightEntries',
] as const;

/** Elimina únicamente los registros de demostración (id con prefijo "demo-"). */
export async function removeDemoData(): Promise<void> {
  const db = getDb();
  for (const name of DEMO_TABLES) {
    const table = db.table(name);
    const rows = await table.toArray();
    const ids = rows.map((r) => r.id as string).filter((id) => id.startsWith(PREFIX));
    if (ids.length) await table.bulkDelete(ids);
  }
}

/** ¿Existen datos de demostración cargados? */
export async function hasDemoData(): Promise<boolean> {
  const db = getDb();
  const count = await db.foods.where('id').startsWith(PREFIX).count();
  return count > 0;
}
