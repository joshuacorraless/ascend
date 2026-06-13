import type { DateKey } from '@/lib/datetime';
import type {
  BackupEnvelope,
  BodyWeightEntry,
  Exercise,
  ExerciseLog,
  Food,
  MealEntry,
  MealType,
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

export interface ListOptions {
  includeArchived?: boolean;
}

export interface SettingsRepository {
  get(): Promise<UserSettings | undefined>;
  put(settings: UserSettings): Promise<void>;
  update(patch: Partial<Omit<UserSettings, 'id' | 'createdAt'>>): Promise<UserSettings>;
}

export interface GoalRepository {
  list(): Promise<NutritionGoal[]>;
  put(goal: NutritionGoal): Promise<void>;
  remove(id: string): Promise<void>;
  /** Objetivo vigente para una fecha (mayor effectiveDate <= fecha). */
  resolveForDate(date: DateKey): Promise<NutritionGoal | undefined>;
  /** Objetivo más reciente (para precargar el formulario). */
  latest(): Promise<NutritionGoal | undefined>;
}

export interface FoodRepository {
  list(opts?: ListOptions): Promise<Food[]>;
  get(id: string): Promise<Food | undefined>;
  put(food: Food): Promise<void>;
  remove(id: string): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
}

export interface RecipeRepository {
  list(opts?: ListOptions): Promise<Recipe[]>;
  get(id: string): Promise<Recipe | undefined>;
  put(recipe: Recipe): Promise<void>;
  remove(id: string): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
}

export interface MealRepository {
  listByDate(date: DateKey): Promise<MealEntry[]>;
  get(id: string): Promise<MealEntry | undefined>;
  put(entry: MealEntry): Promise<void>;
  remove(id: string): Promise<void>;
  /** Entradas más recientes (para "repetir última comida"). */
  recent(limit: number): Promise<MealEntry[]>;
  /** Entradas del día más reciente (distinto de `excludeDate`) para un tipo de comida. */
  lastEntriesForMeal(mealType: MealType, excludeDate: DateKey): Promise<MealEntry[]>;
  datesWithEntries(): Promise<DateKey[]>;
}

export interface WaterRepository {
  listByDate(date: DateKey): Promise<WaterEntry[]>;
  add(entry: WaterEntry): Promise<void>;
  remove(id: string): Promise<void>;
  listRange(from: DateKey, to: DateKey): Promise<WaterEntry[]>;
}

export interface SupplementRepository {
  list(opts?: ListOptions): Promise<Supplement[]>;
  get(id: string): Promise<Supplement | undefined>;
  put(supplement: Supplement): Promise<void>;
  remove(id: string): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
}

export interface SupplementLogRepository {
  listByDate(date: DateKey): Promise<SupplementLog[]>;
  getFor(supplementId: string, date: DateKey): Promise<SupplementLog | undefined>;
  put(log: SupplementLog): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ExerciseRepository {
  list(opts?: ListOptions): Promise<Exercise[]>;
  get(id: string): Promise<Exercise | undefined>;
  put(exercise: Exercise): Promise<void>;
  remove(id: string): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
  count(): Promise<number>;
  bulkPut(list: Exercise[]): Promise<void>;
}

export interface RoutineRepository {
  list(opts?: ListOptions): Promise<WorkoutRoutine[]>;
  get(id: string): Promise<WorkoutRoutine | undefined>;
  put(routine: WorkoutRoutine): Promise<void>;
  remove(id: string): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
}

/** Fachada de sesiones + logs de ejercicios + series (entidad WorkoutRepository). */
export interface WorkoutRepository {
  getActiveSession(): Promise<WorkoutSession | undefined>;
  getSession(id: string): Promise<WorkoutSession | undefined>;
  listSessions(): Promise<WorkoutSession[]>;
  putSession(session: WorkoutSession): Promise<void>;
  /** Elimina una sesión y, en cascada, sus logs y series. */
  removeSession(id: string): Promise<void>;

  listExerciseLogs(sessionId: string): Promise<ExerciseLog[]>;
  putExerciseLog(log: ExerciseLog): Promise<void>;
  removeExerciseLog(id: string): Promise<void>;

  listSetLogs(sessionId: string): Promise<SetLog[]>;
  /** Todas las series de un ejercicio (para historial y progreso). */
  listSetLogsForExercise(exerciseId: string): Promise<SetLog[]>;
  putSetLog(set: SetLog): Promise<void>;
  removeSetLog(id: string): Promise<void>;
}

export interface BodyWeightRepository {
  list(): Promise<BodyWeightEntry[]>;
  get(id: string): Promise<BodyWeightEntry | undefined>;
  put(entry: BodyWeightEntry): Promise<void>;
  remove(id: string): Promise<void>;
  latest(): Promise<BodyWeightEntry | undefined>;
}

export type TableCounts = Record<string, number>;

export interface StorageRepository {
  exportAll(): Promise<BackupEnvelope>;
  /** Reemplaza todos los datos por los del respaldo. */
  importReplace(envelope: BackupEnvelope): Promise<void>;
  clearAll(): Promise<void>;
  counts(): Promise<TableCounts>;
  isEmpty(): Promise<boolean>;
}

export interface Repositories {
  settings: SettingsRepository;
  goals: GoalRepository;
  foods: FoodRepository;
  recipes: RecipeRepository;
  meals: MealRepository;
  water: WaterRepository;
  supplements: SupplementRepository;
  supplementLogs: SupplementLogRepository;
  exercises: ExerciseRepository;
  routines: RoutineRepository;
  workout: WorkoutRepository;
  bodyWeight: BodyWeightRepository;
  storage: StorageRepository;
}
