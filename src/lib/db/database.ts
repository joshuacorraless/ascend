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
 * Base de datos local (IndexedDB vía Dexie). El versionado de Dexie cubre la
 * forma de almacenes e índices y es independiente de SCHEMA_VERSION, que
 * versiona el esquema lógico de los datos exportables.
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
