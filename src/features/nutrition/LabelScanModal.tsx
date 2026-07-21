import { useEffect, useRef, useState } from 'react';
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

  // Lo extraído por la IA siempre pasa por revisión manual antes de guardarse.
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
      <div className="rounded-xl border border-line bg-canvas p-3.5 text-sm">
        <p className="eyebrow">
          IA · confianza <span className="nums">{confidence}%</span>
        </p>
        <p className="mt-1.5 font-medium text-ink">Revisa y corrige cada valor antes de guardar.</p>
        {analysis.servingsPerContainer != null && (
          <p className="nums mt-1.5 text-xs text-ink-muted">
            Porciones por envase detectadas: {round(analysis.servingsPerContainer)}.
          </p>
        )}
        {analysis.warnings.length > 0 && (
          <ul className="mt-2 list-inside list-disc text-xs text-ink-muted">
            {analysis.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    );
    return <FoodFormModal open onClose={closeAll} prefill={prefill} banner={banner} source="ai" />;
  }

  if (stage === 'manual') {
    return <FoodFormModal open onClose={closeAll} />;
  }

  return (
    <Modal open={open} onClose={closeAll} title="Escanear etiqueta">
      <div className="space-y-4">
        {available === false && (
          <div className="rounded-xl border border-line bg-canvas p-3.5 text-sm text-ink-soft">
            La IA no está configurada en el servidor. Puedes crear el alimento manualmente.
          </div>
        )}

        <Field
          label="Nombre del producto (opcional)"
          htmlFor="scan-name"
          hint="Ayuda a la IA a identificarlo."
        >
          <input
            id="scan-name"
            className="input"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="p. ej. Yogur griego natural"
          />
        </Field>

        {preview && (
          <img
            src={preview}
            alt="Etiqueta"
            className="mx-auto max-h-48 rounded-xl border border-line"
          />
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-6 text-ink-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
            <p className="text-sm">Analizando la etiqueta…</p>
          </div>
        ) : (
          <button
            className="btn-primary w-full"
            onClick={() => fileRef.current?.click()}
            disabled={available === false}
          >
            {preview ? 'Probar con otra foto' : 'Tomar o subir foto'}
          </button>
        )}

        {error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700">
            {error}
          </div>
        )}

        <button className="btn-secondary w-full" onClick={() => setStage('manual')}>
          Crear manualmente
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

        <p className="text-center text-xs text-ink-muted">
          La foto se envía al proveedor de IA solo para extraer los datos; no se guarda de forma
          permanente.
        </p>
      </div>
    </Modal>
  );
}
