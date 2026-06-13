import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeLabelCore, isAiConfigured } from './_core';

// Rate-limiting básico en memoria (best-effort; se reinicia con cada instancia
// serverless). Suficiente como primera barrera contra abuso accidental.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // GET → ¿está disponible la IA? (sin exponer la clave)
  if (req.method === 'GET') {
    res.status(200).json({ available: isAiConfigured() });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Método no permitido.' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento.' });
    return;
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) ?? {};
  const result = await analyzeLabelCore({
    base64: body.base64,
    mimeType: body.mimeType,
    productName: typeof body.productName === 'string' ? body.productName : undefined,
  });

  if (result.ok) {
    res.status(200).json({ analysis: result.analysis });
  } else {
    res.status(result.status).json({ error: result.error });
  }
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
