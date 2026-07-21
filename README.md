<div align="center">

<h1>ASCEND</h1>

<p><strong>El sistema personal que convierte hábitos diarios en progreso verificable.</strong></p>

<p>
  Nutrición, entrenamiento, hidratación y evolución física en una PWA privada,<br>
  instalable y diseñada para funcionar incluso sin conexión.
</p>

<br>

<a href="#producto"><img alt="Producto" src="https://img.shields.io/badge/PRODUCTO-Local--first-183D32?style=for-the-badge"></a>
<a href="#arquitectura"><img alt="Arquitectura" src="https://img.shields.io/badge/ARQUITECTURA-Offline--ready-276749?style=for-the-badge"></a>
<a href="#calidad"><img alt="Calidad" src="https://img.shields.io/badge/CALIDAD-Strict%20TypeScript-2F855A?style=for-the-badge"></a>

<br><br>

<code>React 19</code> · <code>TypeScript</code> · <code>IndexedDB</code> · <code>Zod</code> · <code>Vite PWA</code>

</div>

---

<table>
  <tr>
    <td width="33%"><strong>Privacidad por diseño</strong><br><sub>Sin cuentas, analytics ni rastreadores. Los datos permanecen en el dispositivo.</sub></td>
    <td width="33%"><strong>Historial confiable</strong><br><sub>Snapshots inmutables evitan que una edición presente reescriba el pasado.</sub></td>
    <td width="33%"><strong>Operación resiliente</strong><br><sub>La experiencia principal funciona offline y los respaldos son portables.</sub></td>
  </tr>
</table>

## Producto

Ascend reúne las decisiones que determinan el progreso físico en una sola superficie móvil. El dashboard diario conecta objetivos, consumo, agua, suplementos, peso y entrenamiento; cada dominio conserva contexto histórico y evita métricas aisladas.

| Superficie | Resultado |
| :-- | :-- |
| **Día** | Balance de macros, agua, suplementos, entrenamiento planeado y peso reciente. |
| **Nutrición** | Biblioteca, recetas, registro por porción o gramos y reutilización de comidas. |
| **Entrenamiento** | Rutinas, sesiones con autoguardado, RPE, series previas y recuperación de interrupciones. |
| **Progreso** | 1RM estimado, volumen, récords, frecuencia, hábitos y tendencia de peso. |
| **Datos** | Exportación e importación JSON validadas y versionadas. |
| **Captura asistida** | Lectura opcional de etiquetas con IA y confirmación humana antes de persistir. |

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

La interfaz desconoce el motor de persistencia. Los repositorios aíslan Dexie; los esquemas Zod validan formularios, respaldos y respuestas externas; las entidades históricas guardan el valor observado en el momento del registro.

| Decisión | Garantía |
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
src/lib/repositories/ frontera de persistencia
src/lib/backup/       portabilidad y migración de datos
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

El gate ejecuta tipado estricto, lint, pruebas y build de producción. Las pruebas cubren la lógica crítica de dominio, incluida la estimación de 1RM, los agregados y la integridad de respaldos.

## Documentación

| Documento | Decisión que responde |
| :-- | :-- |
| [Requisitos](./docs/REQUIREMENTS.md) | Qué debe resolver el producto. |
| [Decisiones](./docs/DECISIONS.md) | Por qué el sistema está construido así. |
| [Modelo de datos](./docs/DATA_MODEL.md) | Cómo se conserva la verdad histórica. |
| [Instalación](./docs/SETUP.md) | Cómo ejecutar, configurar y desplegar. |
| [Limitaciones](./docs/LIMITATIONS.md) | Qué riesgos y fronteras existen hoy. |
| [Evolución](./docs/ROADMAP.md) | Qué sigue y qué queda fuera del producto. |

---

<div align="center">

<sub>Diseñado para registrar menos, entender más y conservar el control de los datos.</sub>

</div>
