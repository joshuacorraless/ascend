import { getDb } from '@/lib/db/database';
import { createDexieRepositories } from './dexieRepositories';
import type { Repositories } from './types';

export * from './types';

/**
 * Punto único de acceso a la persistencia. Hoy usa Dexie (IndexedDB).
 * Para migrar a Supabase: implementa otra fábrica `createSupabaseRepositories`
 * que cumpla `Repositories` y cámbiala aquí. La UI no necesita cambios.
 */
let _repos: Repositories | null = null;

export function getRepositories(): Repositories {
  if (!_repos) _repos = createDexieRepositories(getDb());
  return _repos;
}

/** Solo para pruebas: inyecta repositorios contra una BD aislada. */
export function __setRepositoriesForTests(repos: Repositories | null): void {
  _repos = repos;
}
