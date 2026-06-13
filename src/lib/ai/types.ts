import type { LabelAnalysis } from './labelSchema';

export interface AnalyzeInput {
  /** Imagen en base64 (sin el prefijo data URL). */
  base64: string;
  mimeType: string;
  productName?: string;
}

export type AnalyzeResult =
  | { ok: true; analysis: LabelAnalysis }
  | { ok: false; status: number; error: string };

/**
 * Interfaz desacoplada del proveedor de IA. La app depende de esta interfaz,
 * no de un proveedor concreto, para poder cambiarlo en el backend.
 */
export interface NutritionLabelAnalyzer {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>;
  /** Indica si el análisis por IA está disponible (clave configurada). */
  isAvailable(): Promise<boolean>;
}
