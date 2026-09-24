# Ascend

Registro personal de nutrición, entrenamiento y progreso que reúne alimentación, agua, suplementos, peso corporal y series de ejercicio. Cada registro conserva su contexto: cambiar un alimento o una meta no reescribe el historial.

**React 19 · TypeScript · Dexie / IndexedDB · Zod · Vite PWA**

[English](./README.md) · [Instalación](./docs/SETUP.md) · [Limitaciones](./docs/LIMITATIONS.md)

![Datos locales de Ascend y frontera de los servicios opcionales de IA.](./docs/assets/overview.svg)

## Producto

- Biblioteca de alimentos, recetas y registro por porciones o gramos.
- Rutinas y sesiones con autoguardado, peso, repeticiones y RIR por serie.
- Comparación del progreso por rutina y ejercicio, tendencias de peso y hábitos.
- Exportación e importación JSON validadas y versionadas.
- Captura opcional de etiquetas e importación de rutinas desde PDF, imagen o texto, con revisión antes de guardar; dictado de series mediante el navegador.

La interfaz está en español. Es un proyecto personal de Joshua Corrales, en evolución a partir del uso cotidiano.

## Datos locales y servicios opcionales

El registro manual funciona sin cuenta, clave de IA ni base de datos en la nube. Los datos viven en IndexedDB del navegador actual; no se sincronizan entre dispositivos. Conserva respaldos JSON: borrar los datos del sitio o la expulsión del almacenamiento puede eliminar el historial.

La PWA instalada permite los flujos manuales principales sin conexión después de una primera carga en línea. Los servicios opcionales tienen límites distintos:

- **IA:** las imágenes de etiquetas y los documentos o textos de rutinas seleccionados se envían a `/api/analyze-label` o `/api/analyze-routine` y luego al proveedor Google o Anthropic configurado. Requiere conexión y credenciales del servidor. Revisa los datos extraídos antes de guardarlos.
- **Voz:** el reconocimiento del navegador puede enviar audio a su propio servicio y requerir conexión; no consume la cuota de Gemini de la aplicación.

Las claves se guardan solo en el entorno del servidor, sin prefijo `VITE_`. El almacenamiento local no significa que estas solicitudes opcionales permanezcan en el dispositivo.

## Ejecución

Requiere Node.js 20 o posterior y npm; la guía de instalación registra validación con Node.js 22.

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. El uso manual no necesita variables de entorno. Para habilitar IA, copia `.env.example` a `.env.local`, configura proveedor y clave, y reinicia el servidor. Ambos endpoints se montan mediante middleware local. Ajusta los modelos según tu cuenta; los valores de ejemplo no garantizan disponibilidad.

```bash
npm run build
npm run preview
```

El preview sirve solo la PWA compilada; para probar IA usa desarrollo o Vercel. El service worker está desactivado durante desarrollo: verifica instalación y funcionamiento sin conexión con el build. [Guía completa](./docs/SETUP.md).

## Arquitectura y calidad

Las pantallas usan contratos de repositorio respaldados por Dexie. La lógica de dominio concentra los cálculos; Zod valida entradas críticas, respaldos y respuestas externas. Los registros históricos guardan snapshots y las metas tienen fecha de vigencia.

`api/` contiene los dos handlers opcionales de análisis; `src/features/` organiza la experiencia por dominio; `src/lib/repositories/`, `src/lib/domain/`, `src/lib/schema/` y `src/lib/backup/` separan persistencia, cálculos, contratos y portabilidad. Las variables Supabase reservadas no activan sincronización.

```bash
npm run check
```

Ejecuta tipos, ESLint, Vitest y build. Hay pruebas de cálculos de macros, respaldos, importación de rutinas, dictado, captura de etiquetas y progreso por serie.

## Documentación

- [Requisitos](./docs/REQUIREMENTS.md) y [decisiones](./docs/DECISIONS.md).
- [Modelo de datos](./docs/DATA_MODEL.md) y [guía de nutrición](./docs/nutrition-guidance.md).
- [Instalación](./docs/SETUP.md), [limitaciones](./docs/LIMITATIONS.md) y [roadmap](./docs/ROADMAP.md).

Ascend registra observaciones personales y no sustituye una herramienta clínica. No produce recomendaciones médicas ni deduce composición corporal a partir del peso.

El repositorio no especifica una licencia.
