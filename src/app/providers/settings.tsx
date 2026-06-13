import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getRepositories } from '@/lib/repositories';
import { ensureInitialized } from '@/lib/bootstrap';
import type { ThemePreference, UserSettings } from '@/lib/schema';

interface SettingsContextValue {
  settings: UserSettings;
  update: (patch: Partial<Omit<UserSettings, 'id' | 'createdAt'>>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Aplica el tema a <html> y sincroniza con la preferencia del sistema. */
function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'system' ? prefersDark : theme === 'dark';
  root.classList.toggle('dark', dark);
  try {
    if (theme === 'system') localStorage.removeItem('ascend.theme');
    else localStorage.setItem('ascend.theme', theme);
  } catch {
    /* almacenamiento no disponible: el tema se aplica igual en memoria */
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const repos = getRepositories();
  const [ready, setReady] = useState(false);
  const settings = useLiveQuery(() => repos.settings.get(), []);

  // Inicializa los ajustes por defecto si la BD está vacía.
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

  // Aplica el tema cuando cambia el ajuste o la preferencia del sistema.
  const theme = settings?.theme ?? 'system';
  const mqlRef = useRef<MediaQueryList | null>(null);
  useEffect(() => {
    applyTheme(theme);
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mqlRef.current = mql;
    const onChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme]);

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
      <div className="grid min-h-dvh place-items-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm">Cargando Ascend…</p>
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
