# Modelo de datos

El modelo separa definiciones editables de hechos históricos. Los esquemas Zod en `src/lib/schema/` son la fuente de verdad, los tipos TypeScript se derivan de ellos y la forma persistida utiliza `SCHEMA_VERSION = 1`.

| Principio | Aplicación |
| :-- | :-- |
| Identidad | UUID en entidades de colección; identificador fijo en los ajustes. |
| Tiempo local | `localDate` conserva el día observado por el usuario. |
| Historia | Los registros copian los valores necesarios para no depender del catálogo actual. |
| Portabilidad | Un sobre versionado contiene y valida todas las tablas. |

Convención común a toda entidad: `id` (UUID), `createdAt`, `updatedAt` (ISO 8601). Las
entidades de un día concreto añaden `localDate` (`YYYY-MM-DD`).

## Entidades

### UserSettings (registro único, `id = "singleton"`)
`timeZone`, `weightUnit` (kg|lb), `volumeUnit` (ml|l), `theme` (light|dark|system),
`locale` (es), `oneRmFormula` (epley), `onboarded`.

### NutritionGoal — objetivo con vigencia
`effectiveDate` (YYYY-MM-DD), `calories`, `protein`, `carbs`, `fat`, `waterMl`.
**Regla histórica:** el objetivo de un día es el de mayor `effectiveDate ≤ ese día`. Cambiar
objetivos crea/actualiza el registro del día actual; los días pasados conservan el suyo.

### Food — alimento de la biblioteca (macros por porción)
`name`, `brand?`, `portionSize`, `portionUnit` (g|ml|unidad|porcion), `calories`, `protein`,
`carbs`, `fat`, `fiber?`, `sugar?`, `sodium?`, `imageDataUrl?`, `source` (manual|ai|import|demo),
`favorite`, `notes?`, `archived`.

### Recipe + RecipeIngredient — comida compuesta
`Recipe`: `name`, `servings`, `ingredients[]`, `favorite`, `archived`.
`RecipeIngredient`: `foodId`, `quantity` (porciones). Los macros se calculan desde los `Food`
actuales; al registrar la receta como comida se hace snapshot.

### MealEntry — comida registrada (snapshot inmutable)
`localDate`, `loggedAt`, `mealType` (desayuno|almuerzo|cena|merienda|preentreno|postentreno|otra),
`foodId?`, `recipeId?`, `name`, `brand?`, `quantity`, `portionLabel?`, y **snapshot** de
`calories/protein/carbs/fat/fiber?/sugar?/sodium?` (totales ya multiplicados por la cantidad).

### WaterEntry — hidratación
`localDate`, `loggedAt`, `amountMl`. (Interno siempre en ml.)

### Supplement (definición) + SupplementLog (registro diario)
`Supplement`: `name`, `dose?`, `time`, `daysOfWeek[]` (vacío = todos), `notes?`, `archived`.
`SupplementLog`: `supplementId`, `localDate`, `completed`, `completedAt?`, + snapshot `name`,
`dose?`. **Regla:** marcar un suplemento crea/actualiza un log diario; nunca modifica la
definición.

### Exercise — biblioteca de ejercicios
`name`, `primaryMuscle`, `secondaryMuscles[]`, `type` (compuesto|aislamiento|cardio|otro),
`equipment`, `trackingType` (weight_reps|bodyweight_reps|time|distance), `unilateral`,
`notes?`, `archived`.

### WorkoutRoutine + RoutineExercise — plantilla
`WorkoutRoutine`: `name`, `description?`, `daysOfWeek[]`, `exercises[]`, `active`, `archived`.
`RoutineExercise`: `exerciseId`, `order`, `targetSets`, `repRangeMin`, `repRangeMax`,
`restSeconds?`, `notes?`. **La plantilla es independiente de las sesiones realizadas.**

### WorkoutSession + ExerciseLog + SetLog — ejecución (normalizada)
`WorkoutSession`: `routineId?`, `name` (snapshot), `localDate`, `startedAt`, `endedAt?`,
`durationSeconds?`, `status` (active|completed|cancelled), `notes?`.
`ExerciseLog`: `sessionId`, `exerciseId`, `exerciseName` (snapshot), `trackingType`, `order`,
`notes?`.
`SetLog`: `sessionId`, `exerciseLogId`, `exerciseId`, `setNumber`, `weightKg`, `reps`, `rpe?`,
`setType` (calentamiento|efectiva|dropset|fallo), `completed`, `notes?`.
Borrar una sesión elimina en cascada sus `ExerciseLog` y `SetLog`.

### BodyWeightEntry — peso corporal
`localDate`, `loggedAt`, `weightKg` (interno), `time?` (HH:mm), `notes?`.

## Relaciones (resumen)

```
UserSettings (1)
NutritionGoal (N, por effectiveDate)
Food (N) ──< RecipeIngredient >── Recipe (N)
Food/Recipe ──(snapshot)──> MealEntry (N, por día y mealType)
Supplement (N) ──(día)──> SupplementLog (N)
Exercise (N) ──< RoutineExercise >── WorkoutRoutine (N)
WorkoutRoutine ──(instancia)──> WorkoutSession (N)
WorkoutSession ──< ExerciseLog ──< SetLog
BodyWeightEntry (N)
```

## Separaciones explícitas

- **Plantillas de rutina** ≠ **sesiones realizadas**.
- **Definición de ejercicio** ≠ **registros históricos** (`SetLog`).
- **Objetivos actuales** ≠ **objetivos históricos** (mismo modelo, distinta `effectiveDate`).

## Respaldo (exportación/importación)

`BackupEnvelope`: `{ app: "ascend", schemaVersion, exportedAt, data: { …una clave por tabla } }`.
Se valida con Zod antes de importar. Una versión anterior requerirá una migración, aunque hoy
no existen versiones previas ni migraciones activas; una versión más nueva se rechaza. Importar
**reemplaza** todos los datos.

## Cálculos definidos

- **Macros de una cantidad:** `macro_porción × cantidad` (cantidad en número de porciones; los
  gramos/ml se convierten con `cantidad = gramos / portionSize`).
- **Volumen de entrenamiento:** Σ `peso × reps` de series de trabajo completadas.
- **1RM estimado (Epley):** `peso × (1 + reps/30)`; con 1 rep = el propio peso.
- **Media móvil de peso:** promedio de los registros dentro de los últimos 7 días naturales.

[Volver al README](../README.md) · [Consultar decisiones](./DECISIONS.md)
