import Dexie, { type Table } from 'dexie';
import type {
  BodyWeightEntry,
  Exercise,
  ExerciseLog,
  Food,
  MealEntry,
  NutritionGoal,
  Recipe,
  SetLog,
  Supplement,
  SupplementLog,
  UserSettings,
  WaterEntry,
  WorkoutRoutine,
  WorkoutSession,
} from '@/lib/schema';

/**
 * Base de datos local (IndexedDB vía Dexie).
 *
 * El versionado de Dexie es independiente de SCHEMA_VERSION (el esquema lógico
 * de los datos exportables). Aquí versionamos la FORMA de los almacenes/índices.
 * Cuando cambie la estructura, añade `db.version(n).stores({...}).upgrade(...)`.
 */
export class AscendDatabase extends Dexie {
  settings!: Table<UserSettings, string>;
  goals!: Table<NutritionGoal, string>;
  foods!: Table<Food, string>;
  recipes!: Table<Recipe, string>;
  mealEntries!: Table<MealEntry, string>;
  waterEntries!: Table<WaterEntry, string>;
  supplements!: Table<Supplement, string>;
  supplementLogs!: Table<SupplementLog, string>;
  exercises!: Table<Exercise, string>;
  routines!: Table<WorkoutRoutine, string>;
  sessions!: Table<WorkoutSession, string>;
  exerciseLogs!: Table<ExerciseLog, string>;
  setLogs!: Table<SetLog, string>;
  bodyWeightEntries!: Table<BodyWeightEntry, string>;

  constructor() {
    super('ascend');

    // ── v1: esquema inicial ──────────────────────────────────────────────────
    this.version(1).stores({
      settings: 'id',
      goals: 'id, effectiveDate',
      foods: 'id, name',
      recipes: 'id, name',
      mealEntries: 'id, localDate, mealType, [localDate+mealType]',
      waterEntries: 'id, localDate',
      supplements: 'id',
      supplementLogs: 'id, supplementId, localDate, [supplementId+localDate]',
      exercises: 'id, name',
      routines: 'id',
      sessions: 'id, status, localDate, startedAt',
      exerciseLogs: 'id, sessionId, exerciseId',
      setLogs: 'id, sessionId, exerciseLogId, exerciseId',
      bodyWeightEntries: 'id, localDate',
    });

    // Futuras migraciones (ejemplo documentado, no activo):
    // this.version(2).stores({ foods: 'id, name, brand' }).upgrade(async (tx) => {
    //   await tx.table('foods').toCollection().modify((f) => { f.brand ??= ''; });
    // });
  }
}

let _db: AscendDatabase | null = null;

/** Singleton de la base de datos. */
export function getDb(): AscendDatabase {
  if (!_db) _db = new AscendDatabase();
  return _db;
}

/** Solo para pruebas: permite inyectar/cerrar instancias aisladas. */
export function __setDbForTests(db: AscendDatabase | null): void {
  _db = db;
}
