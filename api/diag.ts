// Diagnóstico: sin imports de nivel superior. Intenta cargar cada módulo
// sospechoso dentro de try/catch y devuelve el mensaje de error real.
export default async function handler(
  _req: import('@vercel/node').VercelRequest,
  res: import('@vercel/node').VercelResponse,
) {
  const out: Record<string, string> = {};
  const tryImport = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      out[name] = 'ok';
    } catch (e) {
      out[name] = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
  };

  await tryImport('labelSchema', () => import('./_labelSchema'));
  await tryImport('core', () => import('./_core'));
  await tryImport('google', () => import('@google/genai'));
  await tryImport('anthropic', () => import('@anthropic-ai/sdk'));

  res.status(200).json({ node: process.version, out });
}
