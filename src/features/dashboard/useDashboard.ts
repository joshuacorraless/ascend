import { useLiveQuery } from 'dexie-react-hooks';
import { getRepositories } from '@/lib/repositories';
import { sumWater, totalsForEntries } from '@/lib/domain';
import type { DateKey } from '@/lib/datetime';
import type {
  BodyWeightEntry,
  Macros,
  NutritionGoal,
  Supplement,
  WorkoutRoutine,
  WorkoutSession,
} from '@/lib/schema';

export interface SupplementStatus {
  supplement: Supplement;
  completed: boolean;
  logId?: string;
}

export interface DashboardData {
  goal: NutritionGoal | undefined;
  macros: Macros;
  mealCount: number;
  waterMl: number;
  supplementsToday: SupplementStatus[];
  routinesToday: WorkoutRoutine[];
  activeSession: WorkoutSession | undefined;
  latestWeight: BodyWeightEntry | undefined;
}

/** Carga reactiva del estado del día (todo lo que muestra el inicio). */
export function useDashboard(dateKey: DateKey, weekday: number): DashboardData | undefined {
  return useLiveQuery(async () => {
    const repos = getRepositories();
    const [goal, meals, water, supplements, supplementLogs, routines, activeSession, latestWeight] =
      await Promise.all([
        repos.goals.resolveForDate(dateKey),
        repos.meals.listByDate(dateKey),
        repos.water.listByDate(dateKey),
        repos.supplements.list(),
        repos.supplementLogs.listByDate(dateKey),
        repos.routines.list(),
        repos.workout.getActiveSession(),
        repos.bodyWeight.latest(),
      ]);

    const logBySupp = new Map(supplementLogs.map((l) => [l.supplementId, l]));
    const supplementsToday: SupplementStatus[] = supplements
      .filter((s) => s.daysOfWeek.length === 0 || s.daysOfWeek.includes(weekday))
      .map((s) => {
        const log = logBySupp.get(s.id);
        return { supplement: s, completed: log?.completed ?? false, ...(log ? { logId: log.id } : {}) };
      });

    const routinesToday = routines.filter((r) => r.daysOfWeek.includes(weekday));

    return {
      goal,
      macros: totalsForEntries(meals),
      mealCount: meals.length,
      waterMl: sumWater(water),
      supplementsToday,
      routinesToday,
      activeSession,
      latestWeight,
    };
  }, [dateKey, weekday]);
}
