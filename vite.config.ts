import { defineConfig, type Plugin } from 'vitest/config';
import { loadEnv } from 'vite';
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
        try {
          // Reutiliza exactamente el mismo handler que corre en Vercel.
          const mod = await server.ssrLoadModule('/api/analyze-label.ts');
          const handler = mod.default as (req: unknown, res: unknown) => Promise<void>;

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const raw = Buffer.concat(chunks).toString('utf8');

          const vReq = {
            method: req.method,
            headers: req.headers,
            socket: req.socket,
            body: raw ? JSON.parse(raw) : {},
          };
          let statusCode = 200;
          const vRes = {
            setHeader: (k: string, v: string) => res.setHeader(k, v),
            status(code: number) {
              statusCode = code;
              return this;
            },
            json(payload: unknown) {
              res.statusCode = statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            },
          };
          await handler(vReq, vRes);
        } catch {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Error del middleware de IA en desarrollo.' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Expone las variables del endpoint de IA (de `.env.local`) en process.env
  // para que el middleware de desarrollo (`npm run dev`) pueda leer la clave.
  // Estas variables NUNCA se envían al cliente (no llevan prefijo VITE_).
  const env = loadEnv(mode, process.cwd(), '');
  const aiKeys = [
    'AI_PROVIDER',
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'GEMINI_MODEL',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_MODEL',
  ];
  for (const key of aiKeys) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
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
        theme_color: '#3C3C3C',
        background_color: '#3C3C3C',
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
  };
});
