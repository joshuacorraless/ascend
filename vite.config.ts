import { defineConfig, type Plugin } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/**
 * Vite no ejecuta las funciones de /api en desarrollo; este middleware monta
 * el mismo handler que sirve Vercel en producción.
 */
function devApiPlugin(): Plugin {
  return {
    name: 'ascend-dev-api',
    apply: 'serve',
    configureServer(server) {
      for (const endpoint of ['analyze-label', 'analyze-routine']) {
        server.middlewares.use(`/api/${endpoint}`, async (req, res) => {
          try {
            const mod = await server.ssrLoadModule(`/api/${endpoint}.ts`);
            const handler = mod.default as (req: unknown, res: unknown) => Promise<void>;

            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of req) {
              size += Buffer.byteLength(chunk);
              if (size > 4 * 1024 * 1024) {
                res.statusCode = 413;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'El archivo es demasiado grande.' }));
                return;
              }
              chunks.push(chunk as Buffer);
            }
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
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expone las claves de .env.local al middleware de desarrollo. Sin prefijo
  // VITE_, no llegan al cliente.
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
        // 'prompt': el usuario decide cuándo aplicar una actualización del SW.
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
          theme_color: '#121A16',
          background_color: '#121A16',
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
          // Precachea el app shell y sirve index.html en navegaciones offline.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
        },
        devOptions: {
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
