// Endpoint de diagnóstico. `build` cambia en cada cambio para confirmar que
// Vercel está promoviendo el despliegue nuevo.
export default function handler(
  _req: import('@vercel/node').VercelRequest,
  res: import('@vercel/node').VercelResponse,
) {
  res.status(200).json({ ok: true, build: 'no-zod-2', ts: Date.now() });
}
