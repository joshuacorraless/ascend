import { labelAnalysisSchema } from './labelSchema';
import type { AnalyzeInput, AnalyzeResult, NutritionLabelAnalyzer } from './types';

/**
 * Implementación que habla con el endpoint serverless `/api/analyze-label`.
 * La clave de IA vive solo en el backend; aquí nunca se expone.
 */
export function createHttpAnalyzer(): NutritionLabelAnalyzer {
  return {
    async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
      let res: Response;
      try {
        res = await fetch('/api/analyze-label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
      } catch {
        return { ok: false, status: 0, error: 'Sin conexión con el servidor de IA.' };
      }

      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* respuesta no-JSON */
      }

      if (!res.ok) {
        const error =
          (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : null) ?? `Error del servidor (${res.status}).`;
        return { ok: false, status: res.status, error };
      }

      const analysis = (body as { analysis?: unknown })?.analysis;
      const parsed = labelAnalysisSchema.safeParse(analysis);
      if (!parsed.success) {
        return { ok: false, status: 502, error: 'La respuesta de la IA no es válida.' };
      }
      return { ok: true, analysis: parsed.data };
    },

    async isAvailable(): Promise<boolean> {
      try {
        const res = await fetch('/api/analyze-label', { method: 'GET' });
        if (!res.ok) return false;
        const body = (await res.json()) as { available?: boolean };
        return body.available === true;
      } catch {
        return false;
      }
    },
  };
}

let _analyzer: NutritionLabelAnalyzer | null = null;
export function getAnalyzer(): NutritionLabelAnalyzer {
  if (!_analyzer) _analyzer = createHttpAnalyzer();
  return _analyzer;
}
