<div align="center">

<h1>ASCEND</h1>

<p><strong>Seguimiento personal de nutrición, entrenamiento y progreso físico.</strong></p>

<p>
  Una PWA privada, instalable y preparada para funcionar sin conexión.
</p>

<br><br>

<code>React 19</code> · <code>TypeScript</code> · <code>IndexedDB</code> · <code>Zod</code> · <code>Vite PWA</code>

</div>

---

Ascend nació como un proyecto personal para reunir nutrición, entrenamiento y evolución física sin repartir el historial entre varias herramientas. Sigue en desarrollo y recibe ajustes puntuales a medida que el uso diario revela necesidades concretas.

<table>
  <tr>
    <td width="33%"><strong>Privacidad por diseño</strong><br><sub>Sin cuentas, analytics ni rastreadores. Los datos permanecen en el dispositivo.</sub></td>
    <td width="33%"><strong>Historial confiable</strong><br><sub>Snapshots inmutables evitan que una edición presente reescriba el pasado.</sub></td>
    <td width="33%"><strong>Funciona sin conexión</strong><br><sub>Después de la primera carga, los flujos principales siguen disponibles sin internet.</sub></td>
  </tr>
</table>

## Producto

Ascend reúne en una sola aplicación el seguimiento diario de alimentación, agua, suplementos, peso y entrenamiento. Los registros conservan los datos de cada fecha, aunque después cambien los objetivos o el catálogo.

| Área | Resultado |
| :-- | :-- |
| **Día** | Balance de macros, agua, suplementos, entrenamiento planeado y peso reciente. |
| **Nutrición** | Biblioteca, recetas, registro por porción o gramos y reutilización de comidas. |
| **Entrenamiento** | Rutinas desde PDF, imagen o texto; objetivos por serie, dictado de peso/reps/RIR y autoguardado. |
| **Progreso** | Peso, reps y RIR de cada serie entre semanas, por rutina y ejercicio; hábitos y tendencia de peso corporal. |
| **Datos** | Exportación e importación JSON validadas y versionadas. |
| **Captura asistida** | Cámara o fototeca para etiquetas, reintento de la misma imagen y revisión antes de guardar. |

## Arquitectura

```text
Interfaz React
      │
      ▼
Casos de uso por dominio ──► lógica pura y testeable
      │
      ▼
Contratos de repositorio
      │
      ▼
Dexie / IndexedDB ──► respaldo JSON versionado

Imagen nutricional ──► función serverless ──► proveedor de visión
```

La interfaz no accede directamente a las tablas ni a la instancia de Dexie. Los repositorios concentran esas operaciones; Zod valida respaldos, respuestas externas y formularios críticos; las entidades históricas guardan el valor observado en el momento del registro.

| Decisión | Qué resuelve |
| :-- | :-- |
| Persistencia local detrás de interfaces | El almacenamiento puede evolucionar sin reescribir el producto. |
| Objetivos con fecha de vigencia | Cambiar una meta no altera jornadas anteriores. |
| Snapshots en registros históricos | Alimentos, suplementos y ejercicios conservan su contexto original. |
| IA fuera del cliente | Las claves permanecen en el entorno serverless. |
| Carga por ruta | Las pantallas de mayor peso no penalizan el arranque. |

## Estructura

```text
api/                  análisis serverless de etiquetas
src/app/              composición, navegación y providers
src/components/       sistema de componentes compartidos
src/features/         experiencia organizada por dominio
src/lib/domain/       cálculos puros
src/lib/schema/       contratos Zod y tipos derivados
src/lib/repositories/ acceso a datos
src/lib/backup/       portabilidad y versionado de datos
docs/                 decisiones, modelo, operación y alcance
```

## Ejecución

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. El recorrido completo de configuración y despliegue está en [Instalación y operación](./docs/SETUP.md).

## Calidad

```bash
npm run check
```

`npm run check` verifica tipos, lint, pruebas y build de producción. La suite cubre importación de rutinas, dictado, progreso por serie y RIR, balance de macros, fotos y respaldo de datos.

## Documentación

| Documento | Qué explica |
| :-- | :-- |
| [Requisitos](./docs/REQUIREMENTS.md) | Qué debe resolver el producto. |
| [Decisiones](./docs/DECISIONS.md) | Por qué el sistema está construido así. |
| [Modelo de datos](./docs/DATA_MODEL.md) | Cómo se estructura y conserva el historial. |
| [Instalación](./docs/SETUP.md) | Cómo ejecutar, configurar y desplegar. |
| [Limitaciones](./docs/LIMITATIONS.md) | Qué riesgos y límites existen hoy. |
| [Evolución](./docs/ROADMAP.md) | Qué sigue y qué queda fuera del producto. |
