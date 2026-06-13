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

function QuickAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-medium text-zinc-700 shadow-sm transition active:scale-95 hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
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
          <button onClick={() => navigate(to)} className="flex items-center gap-1 font-semibold">
            {title}
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </button>
        ) : (
          <h2 className="font-semibold">{title}</h2>
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
        <span className={cn('font-medium', completed && 'text-zinc-400 line-through')}>
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
    return <div className="py-20 text-center text-sm text-zinc-400">Cargando tu día…</div>;
  }

  const waterTarget = data.goal?.waterMl ?? 0;
  const waterPct = macroProgress(data.waterMl, waterTarget).percent;
  const suppDone = data.supplementsToday.filter((s) => s.completed).length;

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
          {formatKeyRelative(dateKey, settings.timeZone)}
        </p>
        <h1 className="text-2xl font-bold capitalize tracking-tight">{formatKeyHuman(dateKey)}</h1>
      </header>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-4 gap-2">
        <QuickAction icon={UtensilsCrossed} label="Comida" onClick={() => navigate('/alimentacion')} />
        <QuickAction icon={Droplet} label="Agua" onClick={() => setWaterOpen(true)} />
        <QuickAction icon={Scale} label="Peso" onClick={() => setWeightOpen(true)} />
        <QuickAction icon={Dumbbell} label="Entreno" onClick={() => navigate('/entrenamiento')} />
      </div>

      {/* Macros del día */}
      {data.goal ? (
        <MacrosOverview goal={data.goal} consumed={data.macros} />
      ) : (
        <Card title="Macros">
          <p className="text-sm text-zinc-500">
            Define tus objetivos en Ajustes para ver tu progreso diario.
          </p>
        </Card>
      )}

      {/* Agua */}
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
          <Droplet className="h-8 w-8 text-sky-500" />
          <div className="flex-1">
            <p className="text-lg font-bold">
              {formatVolume(data.waterMl, settings.volumeUnit)}
              <span className="ml-1 text-sm font-medium text-zinc-500">
                / {formatVolume(waterTarget, settings.volumeUnit)}
              </span>
            </p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${Math.min(100, waterPct)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Suplementos */}
      <Card title="Suplementos" to="/suplementos" action={
        data.supplementsToday.length > 0 ? (
          <span className="text-xs text-zinc-500">
            {suppDone}/{data.supplementsToday.length}
          </span>
        ) : undefined
      }>
        {data.supplementsToday.length === 0 ? (
          <button onClick={() => navigate('/suplementos')} className="flex items-center gap-2 text-sm text-zinc-500">
            <Pill className="h-4 w-4" /> Sin suplementos para hoy. Toca para configurarlos.
          </button>
        ) : (
          <div className="-mx-2">
            {data.supplementsToday.map((s) => (
              <SupplementItem key={s.supplement.id} status={s} dateKey={dateKey} />
            ))}
          </div>
        )}
      </Card>

      {/* Entrenamiento de hoy */}
      <Card title="Entrenamiento">
        {data.activeSession ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{data.activeSession.name}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Sesión en curso</p>
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
              <p className="text-xs text-zinc-500">Hoy toca</p>
              <p className="font-medium">{data.routinesToday.map((r) => r.name).join(', ')}</p>
            </div>
            <button className="btn-secondary" onClick={() => navigate('/entrenamiento')}>
              Ver
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Dumbbell className="h-4 w-4" /> Sin entrenamiento planificado para hoy.
          </p>
        )}
      </Card>

      {/* Peso corporal */}
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
            <Scale className="h-4 w-4" /> Aún no has registrado tu peso.
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
