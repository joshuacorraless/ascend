// Endpoint de diagnóstico: cero imports en tiempo de ejecución.
// Si /api/ping responde pero /api/analyze-label no, el problema está en los
// imports de esa función. Si /api/ping también falla, es la config del runtime.
export default function handler(
  _req: import('@vercel/node').VercelRequest,
  res: import('@vercel/node').VercelResponse,
) {
  res.status(200).json({ ok: true, ts: Date.now() });
}
