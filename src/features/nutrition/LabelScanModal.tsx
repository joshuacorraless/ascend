import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Loader2, PencilLine, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { FoodFormModal } from './FoodFormModal';
import { getAnalyzer } from '@/lib/ai/httpAnalyzer';
import { compressImage, validateImageFile } from '@/lib/ai/image';
import { round } from '@/lib/units';
import type { LabelAnalysis } from '@/lib/ai/labelSchema';

type Stage = 'capture' | 'review' | 'manual';

export function LabelScanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [stage, setStage] = useState<Stage>('capture');
  const [productName, setProductName] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<LabelAnalysis | null>(null);

  useEffect(() => {
    if (!open) return;
    setAvailable(null);
    getAnalyzer()
      .isAvailable()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, [open]);

  const reset = () => {
    setStage('capture');
    setProductName('');
    setPreview(null);
    setLoading(false);
    setError(null);
    setAnalysis(null);
  };

  const closeAll = () => {
    reset();
    onClose();
  };

  const onPick = async (file: File) => {
    setError(null);
    const valid = validateImageFile(file);
    if (!valid.ok) {
      setError(valid.error);
      return;
    }
    setLoading(true);
    try {
      const img = await compressImage(file);
      setPreview(img.dataUrl);
      const result = await getAnalyzer().analyze({
        base64: img.base64,
        mimeType: img.mimeType,
        ...(productName.trim() ? { productName: productName.trim() } : {}),
      });
      if (result.ok) {
        setAnalysis(result.analysis);
        setStage('review');
      } else {
        setError(result.error);
      }
    } catch {
      setError('No se pudo procesar la imagen.');
    } finally {
      setLoading(false);
    }
  };

  // ── Revisión obligatoria del alimento extraído por IA ──────────────────────
  if (stage === 'review' && analysis) {
    const prefill = {
      name: analysis.productName ?? productName.trim() ?? '',
      brand: analysis.brand ?? '',
      portionSize: analysis.servingSize ?? 100,
      portionUnit: analysis.servingUnit ?? ('g' as const),
      ...(analysis.calories != null ? { calories: analysis.calories } : {}),
      ...(analysis.protein != null ? { protein: analysis.protein } : {}),
      ...(analysis.carbs != null ? { carbs: analysis.carbs } : {}),
      ...(analysis.fat != null ? { fat: analysis.fat } : {}),
      ...(analysis.fiber != null ? { fiber: analysis.fiber } : {}),
      ...(analysis.sugar != null ? { sugar: analysis.sugar } : {}),
      ...(analysis.sodium != null ? { sodium: analysis.sodium } : {}),
    };
    const confidence = round(analysis.confidence * 100);
    const banner = (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
        <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
          <Sparkles className="h-4 w-4" /> Datos extraídos por IA · confianza {confidence}%
        </p>
        <p className="mt-1 text-amber-700/90 dark:text-amber-200/80">
          Revisa y corrige cada valor antes de guardar.
        </p>
        {analysis.servingsPerContainer != null && (
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-200/70">
            Porciones por envase detectadas: {round(analysis.servingsPerContainer)}.
          </p>
        )}
        {analysis.warnings.length > 0 && (
          <ul className="mt-2 list-inside list-disc text-xs text-amber-700/90 dark:text-amber-200/80">
            {analysis.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    );
    return (
      <FoodFormModal open onClose={closeAll} prefill={prefill} banner={banner} source="ai" />
    );
  }

  if (stage === 'manual') {
    return <FoodFormModal open onClose={closeAll} />;
  }

  // ── Captura ────────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={closeAll} title="Escanear etiqueta">
      <div className="space-y-4">
        {available === false && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
            La IA no está configurada en el servidor. Puedes crear el alimento manualmente.
          </div>
        )}

        <Field label="Nombre del producto (opcional)" htmlFor="scan-name" hint="Ayuda a la IA a identificarlo.">
          <input
            id="scan-name"
            className="input"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="p. ej. Yogur griego natural"
          />
        </Field>

        {preview && (
          <img src={preview} alt="Etiqueta" className="mx-auto max-h-48 rounded-xl border border-zinc-200 dark:border-zinc-700" />
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-6 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <p className="text-sm">Analizando la etiqueta…</p>
          </div>
        ) : (
          <button
            className="btn-primary w-full"
            onClick={() => fileRef.current?.click()}
            disabled={available === false}
          >
            <Camera className="h-4 w-4" /> {preview ? 'Probar con otra foto' : 'Tomar o subir foto'}
          </button>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button className="btn-secondary w-full" onClick={() => setStage('manual')}>
          <PencilLine className="h-4 w-4" /> Crear manualmente
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onPick(f);
          }}
        />

        <p className="text-center text-xs text-zinc-400">
          La foto se envía al proveedor de IA solo para extraer los datos; no se guarda de forma permanente.
        </p>
      </div>
    </Modal>
  );
}
