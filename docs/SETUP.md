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

La aplicación queda en `http://localhost:5173` y el middleware local expone `/api/analyze-label` y `/api/analyze-routine`.

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
3. Añade las variables serverless si habilitarás análisis de etiquetas o importación de documentos de rutinas.
4. Despliega. `vercel.json` mantiene el rewrite de la SPA y Vercel detecta `api/*.ts`.

## Instalación en iPhone

1. Abre el despliegue en Safari.
2. Selecciona **Compartir → Agregar a pantalla de inicio**.
3. Confirma **Ascend** y abre la aplicación instalada.
4. Completa una primera carga con conexión; los recursos básicos y los flujos principales quedarán disponibles sin conexión.

Los datos permanecen en ese navegador. Exporta respaldos desde **Ajustes → Datos**.

## Rutinas, dictado y fotos

- **Gym → Importar una rutina** acepta PDF, JPG, PNG, WebP y texto (hasta 3 MB). Requiere el proveedor de IA configurado. La revisión editable conserva días, orden, series, repeticiones e indicaciones individuales. Los datos ausentes se señalan antes de guardar; no se completan con una rutina inventada. La importación agrega datos y se guarda como una sola operación.
- Los archivos JSON con el formato de revisión (`routines`, `warnings`, objetivos nullable) se pueden abrir sin IA. El formato JSON anterior sigue disponible desde Ajustes. Los pesos realizados quedan vacíos hasta entrenar.
- **Sesión → Dictar series** abre el micrófono para un ejercicio. Dicta peso, unidad, reps y opcionalmente RIR o RPE; revisa las filas y pulsa guardar. Ejemplo: «170 libras, 8 reps, RIR cero. En la segunda, 7 reps con el mismo peso y RIR cero». Las series completadas o editadas no se sobrescriben. También puedes ingresar RIR manualmente junto a las reps; dejarlo vacío significa que no se registró.
- El dictado usa el reconocimiento del navegador: necesita HTTPS (localhost funciona), permiso de micrófono y un navegador compatible. Puede enviar audio al servicio de reconocimiento del navegador y requerir conexión. Si no está disponible, el texto y el micrófono del teclado son alternativas; no utiliza cuota de Gemini. Referencia: [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).
- **Comida → Biblioteca → Nuevo** permite cámara, fototeca o entrada manual. Una imagen seleccionada permanece disponible al reintentar un error y como referencia para introducir los datos manualmente. El análisis nutricional sí requiere IA.
- **Progreso → Rutina → Ejercicio** muestra el peso, las reps y el RIR de cada serie a través de las semanas, limitado a esa rutina. La comparación conserva cada serie por separado; no suma repeticiones ni usa volumen como indicador. El enlace «Ver en todas las rutinas» amplía el historial explícitamente. Si falta RIR no se inventa cero; los cambios contrapuestos (más peso, menos reps o menos reserva) muestran su contexto.

Los planes guiados de macros y sus referencias se explican en [Guía de nutrición](./nutrition-guidance.md). `npm run preview` sirve solo el sitio compilado; para probar las funciones de IA usa el servidor de desarrollo o Vercel.

## Evolución hacia nube

`src/lib/repositories/` desacopla la interfaz de datos de Dexie. Una integración futura debe implementar los mismos contratos, mantener IndexedDB como operación local y definir autenticación, RLS, cola de cambios y resolución de conflictos. Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están reservadas como referencia, no activan sincronización.

[Volver al README](../README.md) · [Consultar limitaciones](./LIMITATIONS.md)
