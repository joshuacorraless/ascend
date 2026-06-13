import { getRepositories } from './repositories';
import { createDefaultSettings } from './defaults';
import type { UserSettings } from './schema';

/**
 * Garantiza que exista el registro de ajustes. Se llama una vez al arrancar la
 * app. No siembra datos del usuario (eso es opcional vía "datos de demostración").
 */
export async function ensureInitialized(): Promise<UserSettings> {
  const repos = getRepositories();
  const existing = await repos.settings.get();
  if (existing) return existing;
  const settings = createDefaultSettings();
  await repos.settings.put(settings);
  return settings;
}
