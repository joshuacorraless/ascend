import { getDb } from '@/lib/db/database';
import { createDexieRepositories } from './dexieRepositories';
import type { Repositories } from './types';

export * from './types';

// Punto único de acceso a la persistencia; la UI nunca importa Dexie directamente.
let _repos: Repositories | null = null;

export function getRepositories(): Repositories {
  if (!_repos) _repos = createDexieRepositories(getDb());
  return _repos;
}

/** Solo para pruebas: inyecta repositorios contra una BD aislada. */
export function __setRepositoriesForTests(repos: Repositories | null): void {
  _repos = repos;
}
