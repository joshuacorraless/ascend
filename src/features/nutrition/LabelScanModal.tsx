import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { FoodFormModal } from './FoodFormModal';
import { getAnalyzer } from '@/lib/ai/httpAnalyzer';
import { compressImage, validateImageFile, type CompressedImage } from '@/lib/ai/image';
import { round } from '@/lib/units';
import type { LabelAnalysis } from '@/lib/ai/labelSchema';

type Stage = 'capture' | 'review' | 'manual';

export function LabelScanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [stage, setStage] = useState<Stage>('capture');
  const [productName, setProductName] = useState('');
  const [selectedImage, setSelectedImage] = useState<CompressedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<LabelAnalysis | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setAvailable(null);
    getAnalyzer()
      .isAvailable()
      .then((value) => {
        if (active) setAvailable(value);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
      requestVersion.current += 1;
    };
  }, [open]);

  const reset = () => {
    setStage('capture');
    setProductName('');
    setSelectedImage(null);
    setLoading(false);
    setError(null);
    setAnalysis(null);
  };

  const closeAll = () => {
    requestVersion.current += 1;
    reset();
    onClose();
  };

  const analyzeImage = async (img: CompressedImage, version: number) => {
    const result = await getAnalyzer().analyze({
      base64: img.base64,
      mimeType: img.mimeType,
      ...(productName.trim() ? { productName: productName.trim() } : {}),
    });
    if (version !== requestVersion.current) return;
    if (result.ok) {
      setAnalysis(result.analysis);
      setStage('review');
    } else {
      setError(result.error);
    }
  };

  const onPick = async (file: File) => {
    setError(null);
    const valid = validateImageFile(file);
    if (!valid.ok) {
      setError(valid.error);
      return;
    }
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const img = await compressImage(file);
      if (version !== requestVersion.current) return;
      setSelectedImage(img);
      await analyzeImage(img, version);
    } catch {
      if (version === requestVersion.current) setError('No se pudo procesar la imagen.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const retry = async () => {
    if (!selectedImage || loading) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      await analyzeImage(selectedImage, version);
    } catch {
      if (version === requestVersion.current)
        setError('No se pudo conectar. Tu foto sigue disponible para reintentar.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const photoReference = selectedImage && (
    <details className="rounded-xl border border-line bg-canvas p-3.5" open>
      <summary className="cursor-pointer text-sm font-medium text-ink">Consultar etiqueta</summary>
      <img
        src={selectedImage.dataUrl}
        alt="Etiqueta seleccionada"
        className="mx-auto mt-3 max-h-64 rounded-lg object-contain"
      />
    </details>
  );

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
      <div className="space-y-3">
        {photoReference}
        <div className="rounded-xl border border-line bg-canvas p-3.5 text-sm">
          <p className="eyebrow">
            IA · confianza <span className="nums">{confidence}%</span>
          </p>
          <p className="mt-1.5 font-medium text-ink">
            Revisa y corrige cada valor antes de guardar.
          </p>
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
      </div>
    );
    return (
      <FoodFormModal open={open} onClose={closeAll} prefill={prefill} banner={banner} source="ai" />
    );
  }

  if (stage === 'manual') {
    return (
      <FoodFormModal
        open={open}
        onClose={closeAll}
        prefill={{ name: productName.trim() }}
        banner={photoReference}
      />
    );
  }

  return (
    <Modal open={open} onClose={closeAll} title="Nuevo alimento">
      <div className="space-y-4">
        {available === false && (
          <div className="rounded-xl border border-line bg-canvas p-3.5 text-sm text-ink-soft">
            La lectura automática no está disponible ahora. Puedes cargar la etiqueta como
            referencia y completar los valores manualmente.
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

        {selectedImage && (
          <img
            src={selectedImage.dataUrl}
            alt="Etiqueta seleccionada"
            className="mx-auto max-h-48 rounded-xl border border-line"
          />
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-6 text-ink-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
            <p className="text-sm">Analizando la etiqueta…</p>
          </div>
        ) : selectedImage ? (
          <button className="btn-primary w-full" onClick={retry}>
            Reintentar con esta imagen
          </button>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <button
            className="btn-secondary"
            disabled={loading}
            onClick={() => cameraRef.current?.click()}
          >
            Tomar foto
          </button>
          <button
            className="btn-secondary"
            disabled={loading}
            onClick={() => libraryRef.current?.click()}
          >
            Desde fototeca
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          Usa una foto o un pantallazo de la etiqueta nutricional. JPG, PNG o WebP, hasta 8 MB.
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700"
          >
            {error}
            {selectedImage && (
              <p className="mt-2">
                Conservamos esta imagen mientras el formulario esté abierto. Puedes reintentar o
                ingresar los datos a mano.
              </p>
            )}
          </div>
        )}

        <button
          className="btn-secondary w-full"
          disabled={loading}
          onClick={() => setStage('manual')}
        >
          Crear manualmente
        </button>

        <input
          ref={cameraRef}
          aria-label="Tomar foto de etiqueta"
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

        <input
          ref={libraryRef}
          aria-label="Elegir imagen de fototeca"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void onPick(file);
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
