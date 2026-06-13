export function parseDecimalInput(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  const normalized = value.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}

export function parseOptionalDecimalInput(value: unknown): number | undefined {
  if (value === '' || value == null) return undefined;
  const parsed = parseDecimalInput(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
