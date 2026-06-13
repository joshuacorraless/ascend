import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Upload, Trash2, ShieldCheck, Database, FlaskConical } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Modal } from '@/components/ui/Modal';
import { GoalForm, type GoalValues } from './GoalForm';
import { useSettings } from '@/app/providers/settings';
import { useToast } from '@/app/providers/toast';
import { useConfirm } from '@/app/providers/confirm';
import { getRepositories } from '@/lib/repositories';
import { createGoal, SUGGESTED_GOAL } from '@/lib/defaults';
import { touch } from '@/lib/factories';
import { todayKey } from '@/lib/datetime';
import { applyBackup, downloadBackup, parseBackup } from '@/lib/backup/exportImport';
import { hasDemoData, loadDemoData, removeDemoData } from '@/lib/demo/demoData';
import { CURRENT_SCHEMA_VERSION } from '@/lib/schema';
import type { ThemePreference, VolumeUnit, WeightUnit } from '@/lib/schema';

const TIME_ZONES = [
  'America/Costa_Rica',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/New_York',
  'Europe/Madrid',
];

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="card space-y-4">
      <h2 className="flex items-center gap-2 font-black">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SettingsScreen() {
  const { settings, update } = useSettings();
  const { success, error } = useToast();
  const confirm = useConfirm();
  const repos = getRepositories();
  const fileRef = useRef<HTMLInputElement>(null);

  const latestGoal = useLiveQuery(() => repos.goals.latest(), []);
  const counts = useLiveQuery(() => repos.storage.counts(), []);
  const demoLoaded = useLiveQuery(() => hasDemoData(), []);
  const [goalOpen, setGoalOpen] = useState(false);

  const onLoadDemo = async () => {
    const ok = await confirm({
      title: 'Cargar datos de demostración',
      message:
        'Se añadirán alimentos, una rutina, sesiones y registros de ejemplo (marcados como demo). No se borran tus datos reales. ¿Continuar?',
      confirmLabel: 'Cargar ejemplos',
    });
    if (!ok) return;
    await loadDemoData();
    success('Datos de demostración cargados.');
  };

  const onRemoveDemo = async () => {
    await removeDemoData();
    success('Datos de demostración eliminados.');
  };

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOptions = Array.from(new Set([...TIME_ZONES, deviceTz]));

  const saveGoal = async (values: GoalValues) => {
    const today = todayKey(settings.timeZone);
    const current = await repos.goals.resolveForDate(today);
    if (current && current.effectiveDate === today) {
      await repos.goals.put(touch({ ...current, ...values }));
    } else {
      await repos.goals.put(createGoal(values, today));
    }
    success('Objetivos actualizados. Los días anteriores no se modifican.');
    setGoalOpen(false);
  };

  const onExport = async () => {
    try {
      await downloadBackup();
      success('Respaldo descargado.');
    } catch (e) {
      error('No se pudo exportar.');
      console.error(e);
    }
  };

  const onPickImport = () => fileRef.current?.click();

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const result = parseBackup(text);
    if (!result.ok) {
      error(result.error);
      return;
    }
    const ok = await confirm({
      title: 'Restaurar respaldo',
      message:
        'Esto REEMPLAZA todos los datos actuales por los del archivo. Esta acción no se puede deshacer. ¿Continuar?',
      confirmLabel: 'Restaurar',
      danger: true,
    });
    if (!ok) return;
    try {
      await applyBackup(result.envelope);
      success(
        result.migratedFrom
          ? `Datos restaurados (migrados de v${result.migratedFrom}).`
          : 'Datos restaurados.',
      );
    } catch (err) {
      error('No se pudo importar el respaldo.');
      console.error(err);
    }
  };

  const onClearAll = async () => {
    const ok = await confirm({
      title: 'Borrar todos los datos',
      message:
        'Se eliminarán permanentemente todos tus registros de este dispositivo. Te recomendamos exportar un respaldo antes. ¿Seguro?',
      confirmLabel: 'Borrar todo',
      danger: true,
    });
    if (!ok) return;
    await repos.storage.clearAll();
    await update({ onboarded: false });
    success('Todos los datos fueron eliminados.');
  };

  const totalRecords = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Ajustes" subtitle="Metas, unidades y datos." />

      <Section title="Objetivos diarios">
        {latestGoal ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Calorías" value={`${latestGoal.calories} kcal`} />
            <Stat label="Proteína" value={`${latestGoal.protein} g`} />
            <Stat label="Carbohidratos" value={`${latestGoal.carbs} g`} />
            <Stat label="Grasas" value={`${latestGoal.fat} g`} />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Aún no has definido objetivos.</p>
        )}
        <button className="btn-secondary w-full" onClick={() => setGoalOpen(true)}>
          Editar objetivos
        </button>
        <p className="text-xs text-zinc-400">
          Los cambios empiezan hoy. El historial conserva sus metas.
        </p>
      </Section>

      <Section title="Unidades y formato">
        <Row label="Peso">
          <SegmentedControl<WeightUnit>
            size="sm"
            value={settings.weightUnit}
            onChange={(v) => update({ weightUnit: v })}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
        </Row>
        <Row label="Agua">
          <SegmentedControl<VolumeUnit>
            size="sm"
            value={settings.volumeUnit}
            onChange={(v) => update({ volumeUnit: v })}
            options={[
              { value: 'ml', label: 'ml' },
              { value: 'l', label: 'L' },
            ]}
          />
        </Row>
        <Row label="Zona horaria">
          <select
            className="input max-w-[14rem]"
            value={settings.timeZone}
            onChange={(e) => update({ timeZone: e.target.value })}
          >
            {tzOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="Apariencia">
        <Row label="Tema">
          <SegmentedControl<ThemePreference>
            size="sm"
            value={settings.theme}
            onChange={(v) => update({ theme: v })}
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
              { value: 'system', label: 'Auto' },
            ]}
          />
        </Row>
      </Section>

      <Section title="Datos y respaldo" icon={<Database className="h-4 w-4 text-brand-600" />}>
        <p className="text-sm text-zinc-500">
          {totalRecords} registros en este dispositivo. Tus datos nunca salen de aquí salvo que tú
          los exportes.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary" onClick={onExport}>
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button className="btn-secondary" onClick={onPickImport}>
            <Upload className="h-4 w-4" /> Importar
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImportFile}
        />
        <button className="btn-danger w-full" onClick={onClearAll}>
          <Trash2 className="h-4 w-4" /> Borrar todos los datos
        </button>
      </Section>

      <Section title="Datos de demostración" icon={<FlaskConical className="h-4 w-4 text-brand-600" />}>
        <p className="text-sm text-zinc-500">
          Agrega datos de prueba para ver gráficos y rutinas sin tocar tus registros.
        </p>
        {demoLoaded ? (
          <button className="btn-secondary w-full" onClick={onRemoveDemo}>
            <Trash2 className="h-4 w-4" /> Eliminar datos de demostración
          </button>
        ) : (
          <button className="btn-secondary w-full" onClick={onLoadDemo}>
            <FlaskConical className="h-4 w-4" /> Cargar datos de demostración
          </button>
        )}
      </Section>

      <Section title="Privacidad" icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}>
        <p className="text-sm text-zinc-500">
          Ascend no usa cuentas, analíticas ni rastreadores. El escaneo de etiquetas es opcional y
          solo envía la imagen que eliges analizar.
        </p>
      </Section>

      <p className="pt-2 text-center text-xs text-zinc-400">
        Ascend · esquema de datos v{CURRENT_SCHEMA_VERSION}
      </p>

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title="Editar objetivos">
        <GoalForm
          volumeUnit={settings.volumeUnit}
          initial={latestGoal ?? SUGGESTED_GOAL}
          submitLabel="Guardar objetivos"
          onSubmit={saveGoal}
        />
      </Modal>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-100/75 px-3 py-2 dark:bg-zinc-800/50">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}
