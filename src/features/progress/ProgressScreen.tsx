import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { Caret } from '@/components/ui/Caret';
import { ProgressCalendar } from './ProgressCalendar';
import { useSettings } from '@/app/providers/settings';
import { getRepositories } from '@/lib/repositories';
import { bodyWeightStats, withMovingAverage } from '@/lib/domain';
import { WEEKDAY_LABELS, formatKeyRelative, formatKeyShort } from '@/lib/datetime';
import { round, weightToDisplay } from '@/lib/units';
import { cn } from '@/lib/cn';
import type { BodyWeightEntry } from '@/lib/schema';

interface RoutineStat {
  count: number;
  last?: string;
}

export function ProgressScreen() {
  const [tab, setTab] = useState<'entreno' | 'peso' | 'dias'>('entreno');
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Análisis" title="Progreso" subtitle="Tu evolución y tus hábitos diarios." />
      <SegmentedControl
        stretch
        value={tab}
        onChange={setTab}
        options={[
          { value: 'entreno', label: 'Entreno' },
          { value: 'peso', label: 'Peso' },
          { value: 'dias', label: 'Calendario' },
        ]}
      />
      {tab === 'entreno' && <TrainingProgress />}
      {tab === 'peso' && <BodyWeightProgress />}
      {tab === 'dias' && <ProgressCalendar />}
    </div>
  );
}

// ── Entrenamiento: rutinas organizadas por día ───────────────────────────────
function TrainingProgress() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [day, setDay] = useState<number | 'all'>('all');

  const data = useLiveQuery(async () => {
    const repos = getRepositories();
    const routines = await repos.routines.list();
    const sessions = await repos.workout.listSessions();
    const byRoutine = new Map<string, RoutineStat>();
    for (const s of sessions) {
      if (!s.routineId) continue;
      const cur = byRoutine.get(s.routineId) ?? { count: 0 };
      cur.count += 1;
      if (!cur.last) cur.last = s.localDate; // sessions vienen descendentes
      byRoutine.set(s.routineId, cur);
    }
    return { routines, byRoutine };
  }, []);

  const routines = data?.routines ?? [];
  const filtered =
    day === 'all' ? routines : routines.filter((r) => r.daysOfWeek.includes(day as number));

  if (data && routines.length === 0) {
    return (
      <EmptyState
        title="Sin rutinas todavía"
        description="Crea una rutina y entrena para ver tu progreso aquí."
        action={
          <Link to="/entrenamiento" className="btn-primary">
            Ir a entrenamiento
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtro por día */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <button
          className={cn('chip shrink-0', day === 'all' && 'chip-active')}
          onClick={() => setDay('all')}
        >
          Todas
        </button>
        {WEEKDAY_LABELS.map((label, idx) => (
          <button
            key={idx}
            className={cn('chip shrink-0', day === idx && 'chip-active')}
            onClick={() => setDay(idx)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          No hay rutinas asignadas a este día. Asígnalas al editar la rutina.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((r) => {
            const stat = data?.byRoutine.get(r.id);
            return (
              <li key={r.id}>
                <button
                  onClick={() => navigate(`/progreso/rutina/${r.id}`)}
                  className="card flex w-full items-center gap-3 text-left transition duration-200 ease-ascend hover:-translate-y-0.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{r.name}</p>
                    <p className="nums mt-0.5 text-xs text-ink-muted">
                      {r.exercises.length} ejercicios
                      {r.daysOfWeek.length > 0
                        ? ` · ${r.daysOfWeek.map((d) => WEEKDAY_LABELS[d]).join(' ')}`
                        : ''}
                    </p>
                    <p className="nums mt-1 text-xs text-ink-faint">
                      {stat
                        ? `${stat.count} sesión${stat.count === 1 ? '' : 'es'} · última ${formatKeyRelative(stat.last ?? '', settings.timeZone)}`
                        : 'Aún sin sesiones'}
                    </p>
                  </div>
                  <Caret dir="right" className="shrink-0 text-ink-faint" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Peso corporal ────────────────────────────────────────────────────────────
function BodyWeightProgress() {
  const { settings } = useSettings();
  const entries = useLiveQuery(() => getRepositories().bodyWeight.list(), [], [] as BodyWeightEntry[]);
  const list = entries ?? [];
  const unit = settings.weightUnit;

  const stats = useMemo(() => bodyWeightStats(list), [list]);
  const dataPoints = useMemo(
    () =>
      withMovingAverage(list).map((p) => ({
        date: p.date,
        peso: round(weightToDisplay(p.weightKg, unit), 1),
        media: round(weightToDisplay(p.averageKg, unit), 1),
      })),
    [list, unit],
  );

  if (list.length === 0) {
    return (
      <EmptyState
        title="Sin registros de peso"
        description="Registra tu peso para ver tu tendencia."
        action={
          <Link to="/peso" className="btn-primary">
            Ir a peso corporal
          </Link>
        }
      />
    );
  }

  const fmtDelta = (kg: number) => `${kg > 0 ? '+' : ''}${round(weightToDisplay(kg, unit), 1)} ${unit}`;

  return (
    <div className="space-y-3">
      <section className="card grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="eyebrow">Actual</p>
          <p className="nums mt-1 font-semibold text-ink">
            {stats.current !== undefined ? `${round(weightToDisplay(stats.current, unit), 1)} ${unit}` : '—'}
          </p>
        </div>
        <div>
          <p className="eyebrow">7 días</p>
          <p className="nums mt-1 font-semibold text-ink">{fmtDelta(stats.weeklyChange)}</p>
        </div>
        <div>
          <p className="eyebrow">Total</p>
          <p className="nums mt-1 font-semibold text-ink">{fmtDelta(stats.totalChange)}</p>
        </div>
      </section>

      {dataPoints.length >= 2 && (
        <section className="card">
          <SimpleLineChart
            data={dataPoints}
            xKey="date"
            xFormatter={formatKeyShort}
            unit={` ${unit}`}
            lines={[
              { key: 'peso', name: 'Peso', color: '#4DABF7' },
              { key: 'media', name: 'Media 7d', color: '#8C8C8C', dashed: true },
            ]}
          />
        </section>
      )}

      <Link to="/peso" className="btn-secondary w-full">
        Ver historial completo
      </Link>
    </div>
  );
}
