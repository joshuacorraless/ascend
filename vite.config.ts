import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/**
 * En `npm run dev` Vite no ejecuta las funciones de `/api`. Este middleware
 * monta el mismo handler para poder probar el análisis de etiquetas en local
 * (requiere ANTHROPIC_API_KEY en .env.local). En producción lo sirve Vercel.
 */
function devApiPlugin(): Plugin {
  return {
    name: 'ascend-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/analyze-label', async (req, res) => {
        const json = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        };
        try {
          const core = await server.ssrLoadModule('/api/_core.ts');
          if (req.method === 'GET') {
            json(200, { available: core.isAiConfigured() });
            return;
          }
          if (req.method !== 'POST') {
            json(405, { error: 'Método no permitido.' });
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const raw = Buffer.concat(chunks).toString('utf8');
          const body = raw ? JSON.parse(raw) : {};
          const result = await core.analyzeLabelCore({
            base64: body.base64,
            mimeType: body.mimeType,
            productName: body.productName,
          });
          json(result.ok ? 200 : result.status, result.ok ? { analysis: result.analysis } : { error: result.error });
        } catch {
          json(500, { error: 'Error del middleware de IA en desarrollo.' });
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    devApiPlugin(),
    VitePWA({
      // Actualización controlada: avisamos al usuario en vez de recargar solos.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png', 'offline.html'],
      manifest: {
        name: 'Ascend — Nutrición y Entrenamiento',
        short_name: 'Ascend',
        description:
          'Registro personal rápido de alimentación, hidratación, suplementos, peso y entrenamiento. Funciona sin conexión.',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#4f46e5',
        background_color: '#0b0b14',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell local-first: precacheamos lo construido y servimos el
        // index para navegaciones offline (la app vive en IndexedDB).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        // Permite probar el SW en `npm run dev` si hace falta.
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          dexie: ['dexie', 'dexie-react-hooks'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
});
