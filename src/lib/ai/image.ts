export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB de archivo original

export type ImageValidation = { ok: true } | { ok: false; error: string };

export function validateImageFile(file: File): ImageValidation {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: 'Usa una imagen JPG, PNG o WebP.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'La imagen supera los 8 MB. Elige una más ligera.' };
  }
  return { ok: true };
}

export interface CompressedImage {
  /** Data URL completa (para previsualización). */
  dataUrl: string;
  /** Base64 sin el prefijo `data:...;base64,`. */
  base64: string;
  mimeType: string;
}

/**
 * Redimensiona y comprime la imagen en el cliente antes de enviarla:
 * reduce el lado mayor a `maxEdge` px y la recodifica como JPEG. Así se envía
 * menos información al proveedor de IA y se respetan los límites del endpoint.
 */
export async function compressImage(file: File, maxEdge = 1280, quality = 0.8): Promise<CompressedImage> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap) (bitmap as ImageBitmap).close();

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1] ?? '';
  return { dataUrl, base64, mimeType: 'image/jpeg' };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fallback abajo */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = URL.createObjectURL(file);
  });
}
