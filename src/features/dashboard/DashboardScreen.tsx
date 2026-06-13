import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Droplet,
  Dumbbell,
  Pill,
  Plus,
  Scale,
  UtensilsCrossed,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSettings } from '@/app/providers/settings';
import { useToday } from '@/app/hooks/useToday';
import { formatKeyHuman, formatKeyRelative } from '@/lib/datetime';
import { formatVolume, formatWeight, weightToDisplay } from '@/lib/units';
import { macroProgress } from '@/lib/domain';
import { cn } from '@/lib/cn';
import { useDashboard } from './useDashboard';
import { MacrosOverview } from './MacrosOverview';
import { WaterQuickAddModal } from '@/features/water/WaterQuickAddModal';
import { WeightQuickAddModal } from '@/features/bodyweight/WeightQuickAddModal';
import { setSupplementCompleted } from '@/features/supplements/logActions';
import type { SupplementStatus } from './useDashboard';
import { AscendMark } from '@/components/brand/AscendMark';

function QuickAction({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-white/70 bg-white/75 px-2 py-3 text-xs font-bold text-stone-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white active:scale-95 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      <span className={cn('grid h-10 w-10 place-items-center rounded-2xl transition group-hover:scale-105', tone)}>
        <Icon className="h-5 w-5" />
      </span>
      {label}
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
      <div className="mb-3 flex items-center justify-between">
        {to ? (
          <button onClick={() => navigate(to)} className="flex items-center gap-1 font-black text-stone-900 dark:text-zinc-50">
            {title}
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </button>
        ) : (
          <h2 className="font-black text-stone-900 dark:text-zinc-50">{title}</h2>
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
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
    >
      <span
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition',
          completed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-zinc-300 text-transparent dark:border-zinc-600',
        )}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
      <span className="flex-1">
        <span className={cn('font-semibold', completed && 'text-zinc-400 line-through')}>
          {supplement.name}
        </span>
        {supplement.dose && <span className="ml-2 text-xs text-zinc-400">{supplement.dose}</span>}
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
    return <div className="py-20 text-center text-sm font-medium text-zinc-400">Preparando tu día...</div>;
  }

  const waterTarget = data.goal?.waterMl ?? 0;
  const waterPct = macroProgress(data.waterMl, waterTarget).percent;
  const suppDone = data.supplementsToday.filter((s) => s.completed).length;

  return (
    <div className="space-y-4 pb-2">
      <header className="pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AscendMark className="h-12 w-12 shrink-0" />
            <div>
              <p className="text-sm font-bold text-teal-700 dark:text-teal-300">
                {formatKeyRelative(dateKey, settings.timeZone)}
              </p>
              <h1 className="text-2xl font-black capitalize">{formatKeyHuman(dateKey)}</h1>
            </div>
          </div>
          <div className="hidden rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-right shadow-sm backdrop-blur sm:block dark:border-white/10 dark:bg-zinc-900/70">
            <p className="text-[11px] font-bold uppercase text-zinc-400">Ritmo</p>
            <p className="text-sm font-black text-stone-900 dark:text-white">{Math.min(100, Math.round(waterPct))}% agua</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <QuickAction icon={UtensilsCrossed} label="Comida" tone="bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300" onClick={() => navigate('/alimentacion')} />
        <QuickAction icon={Droplet} label="Agua" tone="bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300" onClick={() => setWaterOpen(true)} />
        <QuickAction icon={Scale} label="Peso" tone="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" onClick={() => setWeightOpen(true)} />
        <QuickAction icon={Dumbbell} label="Gym" tone="bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" onClick={() => navigate('/entrenamiento')} />
      </div>

      {data.goal ? (
        <MacrosOverview goal={data.goal} consumed={data.macros} />
      ) : (
        <Card title="Macros">
          <p className="text-sm text-zinc-500">
            Define tus metas en Ajustes y aquí aparece el cierre del día.
          </p>
        </Card>
      )}

      <Card
        title="Hidratación"
        to="/agua"
        action={
          <button className="btn-ghost !min-h-0 !px-2 !py-1 text-xs text-brand-600" onClick={() => setWaterOpen(true)}>
            <Plus className="h-4 w-4" /> Añadir
          </button>
        }
      >
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300">
            <Droplet className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-lg font-bold">
              {formatVolume(data.waterMl, settings.volumeUnit)}
              <span className="ml-1 text-sm font-medium text-zinc-500">
                / {formatVolume(waterTarget, settings.volumeUnit)}
              </span>
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all"
                style={{ width: `${Math.min(100, waterPct)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Suplementos" to="/suplementos" action={
        data.supplementsToday.length > 0 ? (
          <span className="text-xs text-zinc-500">
            {suppDone}/{data.supplementsToday.length}
          </span>
        ) : undefined
      }>
        {data.supplementsToday.length === 0 ? (
          <button onClick={() => navigate('/suplementos')} className="flex items-center gap-2 text-sm text-zinc-500">
            <Pill className="h-4 w-4" /> Sin suplementos programados.
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
            <div>
              <p className="font-medium">{data.activeSession.name}</p>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">En curso</p>
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
            <div>
              <p className="text-xs text-zinc-500">Plan de hoy</p>
              <p className="font-medium">{data.routinesToday.map((r) => r.name).join(', ')}</p>
            </div>
            <button className="btn-secondary" onClick={() => navigate('/entrenamiento')}>
              Ver
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Dumbbell className="h-4 w-4" /> Día libre.
          </p>
        )}
      </Card>

      <Card
        title="Peso corporal"
        to="/peso"
        action={
          <button className="btn-ghost !min-h-0 !px-2 !py-1 text-xs text-brand-600" onClick={() => setWeightOpen(true)}>
            <Plus className="h-4 w-4" /> Registrar
          </button>
        }
      >
        {data.latestWeight ? (
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">
              {formatWeight(data.latestWeight.weightKg, settings.weightUnit)}
            </p>
            <p className="text-xs text-zinc-500">{formatKeyRelative(data.latestWeight.localDate, settings.timeZone)}</p>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Scale className="h-4 w-4" /> Sin peso registrado.
          </p>
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
