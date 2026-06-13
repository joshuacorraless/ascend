import { getRepositories } from '@/lib/repositories';
import {
  CURRENT_SCHEMA_VERSION,
  backupEnvelopeSchema,
  type BackupEnvelope,
} from '@/lib/schema';
import { todayKey } from '@/lib/datetime';

export type ImportResult =
  | { ok: true; envelope: BackupEnvelope; migratedFrom?: number }
  | { ok: false; error: string };

/**
 * Migra un sobre de respaldo de una versión anterior a la actual.
 * Hoy solo existe la v1; cuando cambie el esquema, encadena transformaciones
 * incrementales aquí (v1→v2, v2→v3, …).
 */
function migrateEnvelope(envelope: BackupEnvelope): BackupEnvelope {
  const current = envelope;
  // Ejemplo (no activo):
  // if (current.schemaVersion === 1) { current = { ...current, schemaVersion: 2, data: ... }; }
  return current;
}

/** Valida (y migra) el texto de un archivo de respaldo. No escribe en la BD. */
export function parseBackup(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }

  if (typeof json !== 'object' || json === null) {
    return { ok: false, error: 'El archivo no tiene el formato esperado.' };
  }

  const version = (json as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `El respaldo es de una versión más nueva (v${version}) que esta app (v${CURRENT_SCHEMA_VERSION}). Actualiza la aplicación.`,
    };
  }

  const parsed = backupEnvelopeSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join('.') ?? '';
    return {
      ok: false,
      error: `Datos inválidos en el respaldo${path ? ` (${path})` : ''}: ${first?.message ?? 'estructura incorrecta'}.`,
    };
  }

  const migratedFrom =
    parsed.data.schemaVersion < CURRENT_SCHEMA_VERSION ? parsed.data.schemaVersion : undefined;
  const envelope = migrateEnvelope(parsed.data);
  return migratedFrom ? { ok: true, envelope, migratedFrom } : { ok: true, envelope };
}

/** Genera el JSON del respaldo completo (texto listo para guardar). */
export async function buildBackupJson(): Promise<string> {
  const repos = getRepositories();
  const envelope = await repos.storage.exportAll();
  return JSON.stringify(envelope, null, 2);
}

/** Descarga el respaldo como archivo en el navegador. */
export async function downloadBackup(): Promise<void> {
  const json = await buildBackupJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ascend-backup-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Aplica un respaldo ya validado, reemplazando TODOS los datos actuales. */
export async function applyBackup(envelope: BackupEnvelope): Promise<void> {
  const repos = getRepositories();
  await repos.storage.importReplace(envelope);
}
