/** Genera un identificador único (UUID v4 con fallback). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback muy improbable (entornos sin Web Crypto).
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Marca de tiempo ISO del instante actual. */
export function nowIso(): string {
  return new Date().toISOString();
}
