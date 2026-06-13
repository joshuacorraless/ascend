import { newId, nowIso } from './ids';

type BaseFields = { id: string; createdAt: string; updatedAt: string };

/** Crea una entidad nueva añadiendo id y marcas de tiempo. */
export function newEntity<T extends BaseFields>(input: Omit<T, keyof BaseFields>): T {
  const ts = nowIso();
  return { ...(input as object), id: newId(), createdAt: ts, updatedAt: ts } as T;
}

/** Devuelve una copia de la entidad con `updatedAt` actualizado. */
export function touch<T extends { updatedAt: string }>(entity: T): T {
  return { ...entity, updatedAt: nowIso() };
}
