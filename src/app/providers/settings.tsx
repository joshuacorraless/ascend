import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getRepositories } from '@/lib/repositories';
import { ensureInitialized } from '@/lib/bootstrap';
import type { UserSettings } from '@/lib/schema';

interface SettingsContextValue {
  settings: UserSettings;
  update: (patch: Partial<Omit<UserSettings, 'id' | 'createdAt'>>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// El campo `theme` sigue existiendo en el esquema por compatibilidad de datos,
// pero no se aplica: la app usa una única colorimetría.

export function SettingsProvider({ children }: { children: ReactNode }) {
  const repos = getRepositories();
  const [ready, setReady] = useState(false);
  const settings = useLiveQuery(() => repos.settings.get(), []);

  useEffect(() => {
    let active = true;
    ensureInitialized()
      .catch((e) => console.error('No se pudo inicializar la app', e))
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<SettingsContextValue | null>(() => {
    if (!settings) return null;
    return {
      settings,
      update: async (patch) => {
        await repos.settings.update(patch);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  if (!ready || !value) {
    return (
      <div className="app-canvas grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4 text-ink-muted">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-ink" />
          <p className="text-sm tracking-wide">Cargando Ascend…</p>
        </div>
      </div>
    );
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return ctx;
}
