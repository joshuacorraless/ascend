# Instalación y operación

Esta guía cubre el recorrido desde una copia local hasta una PWA desplegada. Ninguna integración externa es necesaria para utilizar el registro manual.

## Base local

| Requisito | Versión |
| :-- | :-- |
| Node.js | 20 o superior; validado con 22 |
| npm | Incluido con Node.js |

```bash
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173` y el middleware local expone `/api/analyze-label`.

## Comandos

| Comando | Resultado |
| :-- | :-- |
| `npm run dev` | Servidor local con recarga. |
| `npm run typecheck` | Verificación TypeScript de aplicación y tooling. |
| `npm run lint` | Análisis estático con ESLint. |
| `npm run test` | Suite Vitest en una pasada. |
| `npm run build` | Tipado y build PWA de producción. |
| `npm run preview` | Vista local del artefacto productivo. |
| `npm run icons` | Regeneración de iconos en `public/icons`. |
| `npm run check` | Verificación completa: tipos, lint, pruebas y build. |

## Configuración opcional

Copia `.env.example` a `.env.local`. Las claves solo son leídas por la función serverless; nunca deben utilizar el prefijo `VITE_`.

| Variable | Uso | Exposición |
| :-- | :-- | :-- |
| `AI_PROVIDER` | Selecciona `google` o `anthropic`. | Servidor |
| `GEMINI_API_KEY` | Credencial de Google Gemini. | Servidor |
| `GEMINI_MODEL` | Modelo; predeterminado `gemini-2.5-flash`. | Servidor |
| `ANTHROPIC_API_KEY` | Credencial alternativa de Anthropic. | Servidor |
| `ANTHROPIC_MODEL` | Modelo; predeterminado `claude-opus-4-8`. | Servidor |

Sin `AI_PROVIDER`, el endpoint prioriza Google cuando existe su clave y después Anthropic. Sin claves responde como no configurado y la aplicación conserva todas las funciones manuales.

### Verificación del análisis

1. Configura una clave en `.env.local`.
2. Reinicia `npm run dev`.
3. Consulta `GET http://localhost:5173/api/analyze-label`; debe responder `{"available":true}`.
4. Abre **Alimentación → Biblioteca → Escanear** y revisa el resultado antes de guardarlo.

## Despliegue en Vercel

1. Importa el repositorio desde GitHub y conserva el preset de Vite.
2. Usa `npm run build` y el directorio de salida `dist`.
3. Añade las variables serverless únicamente si habilitarás análisis de etiquetas.
4. Despliega. `vercel.json` mantiene el rewrite de la SPA y Vercel detecta `api/*.ts`.

## Instalación en iPhone

1. Abre el despliegue en Safari.
2. Selecciona **Compartir → Agregar a pantalla de inicio**.
3. Confirma **Ascend** y abre la aplicación instalada.
4. Completa una primera carga con conexión; los recursos básicos y los flujos principales quedarán disponibles sin conexión.

Los datos permanecen en ese navegador. Exporta respaldos desde **Ajustes → Datos**.

## Evolución hacia nube

`src/lib/repositories/` desacopla la interfaz de datos de Dexie. Una integración futura debe implementar los mismos contratos, mantener IndexedDB como operación local y definir autenticación, RLS, cola de cambios y resolución de conflictos. Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están reservadas como referencia, no activan sincronización.

[Volver al README](../README.md) · [Consultar limitaciones](./LIMITATIONS.md)
