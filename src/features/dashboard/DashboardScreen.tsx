import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/app/providers/settings';
import { useToday } from '@/app/hooks/useToday';
import { formatKeyHuman, formatKeyRelative } from '@/lib/datetime';
import { formatVolume, formatWeight, weightToDisplay } from '@/lib/units';
import { macroProgress } from '@/lib/domain';
import { cn } from '@/lib/cn';
import { Caret } from '@/components/ui/Caret';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useDashboard } from './useDashboard';
import { MacrosOverview } from './MacrosOverview';
import { WaterQuickAddModal } from '@/features/water/WaterQuickAddModal';
import { WeightQuickAddModal } from '@/features/bodyweight/WeightQuickAddModal';
import { setSupplementCompleted } from '@/features/supplements/logActions';
import type { SupplementStatus } from './useDashboard';

function QuickAction({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-[84px] flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 text-left shadow-card transition duration-200 ease-ascend hover:bg-canvas active:scale-[0.97]"
    >
      <span className="eyebrow">{detail}</span>
      <span className="text-sm font-semibold text-ink">{label}</span>
    </button>
  );
}

function Card({
  title,
  action,
  to,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  to?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        {to ? (
          <button
            onClick={() => navigate(to)}
            className="group flex items-center gap-1.5 text-base font-semibold text-ink"
          >
            {title}
            <Caret dir="right" className="text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink-muted" />
          </button>
        ) : (
          <h2 className="text-base font-semibold text-ink">{title}</h2>
        )}
        {action}
      </div>
      {children}
    </section>
  );
}

function SupplementItem({ status, dateKey }: { status: SupplementStatus; dateKey: string }) {
  const { supplement, completed } = status;
  return (
    <button
      onClick={() => setSupplementCompleted(supplement, dateKey, !completed)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-canvas"
    >
      <span
        className={cn(
          'grid h-6 w-6 shrink-0 place-items-center rounded-full border transition duration-200 ease-ascend',
          completed ? 'border-ink bg-ink' : 'border-line',
        )}
        aria-hidden
      >
        {completed && <span className="h-2 w-2 rounded-full bg-paper" />}
      </span>
      <span className="flex-1">
        <span className={cn('text-sm font-medium', completed ? 'text-ink-faint line-through' : 'text-ink')}>
          {supplement.name}
        </span>
        {supplement.dose && <span className="ml-2 text-xs text-ink-muted">{supplement.dose}</span>}
      </span>
    </button>
  );
}

export function DashboardScreen() {
  const { settings } = useSettings();
  const { dateKey, weekday } = useToday();
  const data = useDashboard(dateKey, weekday);
  const navigate = useNavigate();
  const [waterOpen, setWaterOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);

  if (!data) {
    return <div className="py-24 text-center text-sm text-ink-muted">Preparando tu día…</div>;
  }

  const waterTarget = data.goal?.waterMl ?? 0;
  const waterPct = macroProgress(data.waterMl, waterTarget).percent;
  const suppDone = data.supplementsToday.filter((s) => s.completed).length;

  return (
    <div className="space-y-5 pb-2">
      <header className="pt-6">
        <p className="eyebrow">{formatKeyRelative(dateKey, settings.timeZone)}</p>
        <h1 className="mt-1.5 text-3xl font-semibold capitalize text-ink">{formatKeyHuman(dateKey)}</h1>
      </header>

      <div className="grid grid-cols-4 gap-2.5">
        <QuickAction label="Comida" detail="registrar" onClick={() => navigate('/alimentacion')} />
        <QuickAction label="Agua" detail="sumar" onClick={() => setWaterOpen(true)} />
        <QuickAction label="Peso" detail="medir" onClick={() => setWeightOpen(true)} />
        <QuickAction label="Gym" detail="entrenar" onClick={() => navigate('/entrenamiento')} />
      </div>

      {data.goal ? (
        <MacrosOverview goal={data.goal} consumed={data.macros} />
      ) : (
        <Card title="Macros">
          <p className="text-sm text-ink-muted">
            Define tus metas en Ajustes y aquí aparece el cierre del día.
          </p>
        </Card>
      )}

      <Card
        title="Hidratación"
        to="/agua"
        action={
          <button
            className="rounded-lg px-2 py-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
            onClick={() => setWaterOpen(true)}
          >
            Añadir
          </button>
        }
      >
        <div className="flex items-baseline justify-between">
          <p className="nums text-lg font-semibold text-ink">
            {formatVolume(data.waterMl, settings.volumeUnit)}
            <span className="ml-1.5 text-sm font-normal text-ink-muted">
              / {formatVolume(waterTarget, settings.volumeUnit)}
            </span>
          </p>
          <span className="nums eyebrow">{Math.min(100, Math.round(waterPct))}%</span>
        </div>
        <ProgressBar percent={waterPct} className="mt-3" />
      </Card>

      <Card
        title="Suplementos"
        to="/suplementos"
        action={
          data.supplementsToday.length > 0 ? (
            <span className="nums eyebrow">
              {suppDone}/{data.supplementsToday.length}
            </span>
          ) : undefined
        }
      >
        {data.supplementsToday.length === 0 ? (
          <button onClick={() => navigate('/suplementos')} className="text-sm text-ink-muted">
            Sin suplementos programados.
          </button>
        ) : (
          <div className="-mx-2">
            {data.supplementsToday.map((s) => (
              <SupplementItem key={s.supplement.id} status={s} dateKey={dateKey} />
            ))}
          </div>
        )}
      </Card>

      <Card title="Entrenamiento">
        {data.activeSession ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{data.activeSession.name}</p>
              <p className="eyebrow mt-1 text-brand-600">En curso</p>
            </div>
            <button
              className="btn-primary"
              onClick={() => navigate(`/entrenamiento/sesion/${data.activeSession!.id}`)}
            >
              Continuar
            </button>
          </div>
        ) : data.routinesToday.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Plan de hoy</p>
              <p className="mt-1 truncate font-medium text-ink">
                {data.routinesToday.map((r) => r.name).join(', ')}
              </p>
            </div>
            <button className="btn-secondary" onClick={() => navigate('/entrenamiento')}>
              Ver
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Día libre.</p>
        )}
      </Card>

      <Card
        title="Peso corporal"
        to="/peso"
        action={
          <button
            className="rounded-lg px-2 py-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
            onClick={() => setWeightOpen(true)}
          >
            Registrar
          </button>
        }
      >
        {data.latestWeight ? (
          <div className="flex items-baseline gap-2.5">
            <p className="nums text-2xl font-semibold text-ink">
              {formatWeight(data.latestWeight.weightKg, settings.weightUnit)}
            </p>
            <p className="text-xs text-ink-muted">
              {formatKeyRelative(data.latestWeight.localDate, settings.timeZone)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Sin peso registrado.</p>
        )}
      </Card>

      <WaterQuickAddModal open={waterOpen} onClose={() => setWaterOpen(false)} dateKey={dateKey} />
      <WeightQuickAddModal
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        dateKey={dateKey}
        {...(data.latestWeight
          ? { defaultKg: Number(weightToDisplay(data.latestWeight.weightKg, settings.weightUnit).toFixed(1)) }
          : {})}
      />
    </div>
  );
}
