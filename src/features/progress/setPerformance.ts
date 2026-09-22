import type { SetLog, WeightUnit } from '@/lib/schema';
import { round, weightToDisplay } from '@/lib/units';

export interface SetSession {
  sessionId: string;
  date: string;
  startedAt: string;
  sets: SetLog[];
}

/** One point per actual session, keeping work sets separate and in their original numbers. */
export function buildSetSessions(
  sets: SetLog[],
  sessionDates: Map<string, string>,
  sessionStarts: Map<string, string>,
): SetSession[] {
  const sessions = new Map<string, SetSession>();
  for (const set of sets) {
    const date = sessionDates.get(set.sessionId);
    if (!date || !set.completed || set.setType === 'calentamiento') continue;
    let session = sessions.get(set.sessionId);
    if (!session) {
      session = {
        sessionId: set.sessionId,
        date,
        startedAt: sessionStarts.get(set.sessionId) ?? '',
        sets: [],
      };
      sessions.set(set.sessionId, session);
    }
    session.sets.push(set);
  }
  return [...sessions.values()]
    .map((session) => ({
      ...session,
      sets: session.sets.sort((a, b) => a.setNumber - b.setNumber),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
}

export type SetChange =
  | 'progress'
  | 'regress'
  | 'same'
  | 'mixed'
  | 'harder'
  | 'new'
  | 'missing'
  | 'ambiguous';

/** No volume or estimated strength score: compare the two measured values independently. */
export function assessSetChange(
  current?: Pick<SetLog, 'weightKg' | 'reps' | 'rir'>,
  previous?: Pick<SetLog, 'weightKg' | 'reps' | 'rir'>,
): SetChange {
  if (!current) return 'missing';
  if (!previous) return 'new';
  const weight =
    Math.abs(current.weightKg - previous.weightKg) < 0.001
      ? 0
      : Math.sign(current.weightKg - previous.weightKg);
  const reps = Math.sign(current.reps - previous.reps);
  const reserve =
    current.rir !== undefined && previous.rir !== undefined
      ? Math.sign(current.rir - previous.rir)
      : 0;
  if (!weight && !reps) return reserve > 0 ? 'progress' : reserve < 0 ? 'harder' : 'same';
  if (weight >= 0 && reps >= 0) return reserve < 0 ? 'mixed' : 'progress';
  if (weight <= 0 && reps <= 0) return reserve > 0 ? 'mixed' : 'regress';
  return 'mixed';
}

export function compareSessionSets(current: SetSession, previous?: SetSession) {
  const numbers = [
    ...new Set([...current.sets, ...(previous?.sets ?? [])].map((set) => set.setNumber)),
  ].sort((a, b) => a - b);
  return numbers.map((setNumber) => {
    const now = current.sets.filter((set) => set.setNumber === setNumber);
    const before = previous?.sets.filter((set) => set.setNumber === setNumber) ?? [];
    const ambiguous = now.length > 1 || before.length > 1;
    return {
      setNumber,
      current: now.length === 1 ? now[0] : undefined,
      previous: before.length === 1 ? before[0] : undefined,
      change: ambiguous ? ('ambiguous' as const) : assessSetChange(now[0], before[0]),
      reserveDelta:
        !ambiguous && now[0]?.rir !== undefined && before[0]?.rir !== undefined
          ? now[0].rir - before[0].rir
          : undefined,
    };
  });
}

export type SetChartPoint = Record<string, string | number | null>;

export function setChartData(
  sessions: SetSession[],
  metric: 'weight' | 'reps' | 'rir',
  unit: WeightUnit,
) {
  const numbers = [
    ...new Set(sessions.flatMap((session) => session.sets.map((set) => set.setNumber))),
  ].sort((a, b) => a - b);
  const data = sessions.map((session) => {
    const point: SetChartPoint = { sessionId: session.sessionId, date: session.date };
    for (const number of numbers) {
      const key = `set_${number}`;
      const matches = session.sets.filter((set) => set.setNumber === number);
      // Missing or duplicated numbers are a gap, never a zero or an arbitrary chosen set.
      const set = matches.length === 1 ? matches[0] : undefined;
      point[key] = set
        ? metric === 'weight'
          ? round(weightToDisplay(set.weightKg, unit), 1)
          : metric === 'reps'
            ? set.reps
            : (set.rir ?? null)
        : null;
      if (set) {
        point[`${key}_weight`] = round(weightToDisplay(set.weightKg, unit), 1);
        point[`${key}_reps`] = set.reps;
        if (set.rir !== undefined) point[`${key}_effort`] = `RIR ${set.rir}`;
        else if (set.rpe !== undefined) point[`${key}_effort`] = `RPE ${set.rpe}`;
      }
    }
    return point;
  });
  return { numbers, data };
}
