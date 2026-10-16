# Auditoría Técnica, Diagnóstico de Integridad y Plan de Mejoras: Ruta Abierta Puebla

Este documento consolida la auditoría técnica exhaustiva realizada sobre el repositorio **Ruta Abierta Puebla**, documentando el estado actual de los componentes, la trazabilidad de datos, los errores y discrepancias identificados, y la hoja de ruta de mejoras prioritarias para producción y evaluación ante jurado en Tech-Capital 2026.

---

## 1. Resumen Ejecutivo del Diagnóstico

El proyecto presenta una base algorítmica y conceptual sólida:
* Formulación matemática rigurosa del problema de ruteo como un *Orienteering Problem with Time Windows* (OPTW).
* Calibración econométrica real de pesos de decisión mediante regresión logística con remuestreo *Bootstrap* ($B=300$).
* Microcartografía de aceras con cálculo de índice de confianza ($C_e$) a partir de auditorías de campo empíricas.
* Interfaz moderna en React 19 con diseño táctico, visualizador MapLibre GL 3D y arquitectura desacoplada por roles.

No obstante, la auditoría reveló **discrepancias críticas de sincronización de datos entre capas**, **scripts y endpoints desalineados** y **oportunidades de mejora en la conexión entre frontend y backend**, las cuales se detallan a continuación.

---

## 2. Matriz de Errores Identificados y Correcciones Requeridas

| ID | Componente / Archivo | Severidad | Descripción del Error | Causa Raíz | Solución Requerida |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **ERR-01** | `pipelines/src/simulation.py` | 🔴 Crítica | `KeyError: 'poi_mercado_parian'` al correr `simulation.py`. | `simulation.py` itera sobre los 24 POIs de `pois.json`, pero indexa sobre `time_matrices.json` que sólo contiene 14 POIs. | Mapear los 10 POIs restantes en `graph_builder.py` y regenerar `time_matrices.json` ($24 \times 24$). |
| **ERR-02** | `services/route/main.py` | 🔴 Crítica | `KeyError: 'poi_mercado_parian'` en endpoint `/v1/routes/generate`. | El bucle voraz itera sobre `pois_data` (24 elementos) indexando en `poi_idx_map` (14 elementos) sin validación previa. | Agregar verificación `if p["id"] not in poi_idx_map: continue` y regenerar matrices completas. |
| **ERR-03** | `package.json` (raíz) | 🟡 Media | `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` al ejecutar `pnpm lint`. | El script raíz ejecuta `run lint` en packages y apps, pero ninguno de los paquetes declara dicho script. | Declarar script `"lint": "tsc --noEmit"` en los paquetes o actualizar el comando raíz. |
| **ERR-04** | `pipelines/src/graph_builder.py` | 🔴 Crítica | Sobreescritura destructiva de `data/processed/pois.json`. | Lee `data/raw/pois_curated.json` (congelado en 14 POIs) y sobreescribe `pois.json`, eliminando 10 POIs (477 líneas). | Actualizar `data/raw/pois_curated.json` con los 24 POIs para que el pipeline no reduzca el catálogo. |
| **ERR-05** | `pipelines/src/copy_static_assets.py` | 🟡 Media | Omisión de `barrier_ranking.json` en el copiado a `public/data/`. | La lista `processed_files` no incluye `barrier_ranking.json` ni `simulation_metrics.json`. | Incorporar ambos archivos a la lista de sincronización hacia `apps/web/public/data/`. |
| **ERR-06** | `apps/web/src/main.tsx` | 🔴 Alta | Service Worker nunca registrado en producción. | Se consulta `getRegistrations()`, pero nunca se ejecuta `navigator.serviceWorker.register('/sw.js')`. | Agregar llamada de registro formal al cargar la ventana en producción. |
| **ERR-07** | `apps/web/public/manifest.webmanifest` | 🟡 Media | Icono PWA `icon-192.png` ausente (HTTP 404). | El manifiesto referencia `/data/icon-192.png`, archivo inexistente en el repositorio. | Proveer los activos de iconos de 192x192 y 512x512 en la carpeta pública. |
| **ERR-08** | `services/gateway/src/index.ts` | 🟡 Media | Ruta RAG `/v1/cultural/query` no expuesta en el Gateway (HTTP 404). | El microservicio `recommend` implementa el endpoint RAG, pero el Gateway Fastify no lo tiene ruteado. | Agregar proxy en Fastify hacia `http://recommend-service:8003/v1/cultural/query`. |

---

## 3. Discrepancias Arquitectónicas y Mejoras Funcionales

### 3.1 Catálogo de POIs: 24 vs. 14 Ubicaciones
* **Situación**:
  En el commit `0bb8730` se amplió el catálogo de lugares a 24 puntos de interés patrimoniales y tradicionales (cubriendo El Parián, Calle de los Dulces, Casa de Alfeñique, Puente de Bubas, Casa de los Muñecos, Vidrio Soplado de Analco, Panadería La Guadalupana, Templo de San Francisco, Cazuelas de La Luz y Mirador de Xanenetla).
  No obstante, las matrices topológicas generadas por Dijkstra en `data/processed/time_matrices.json` se mantuvieron con 14 lugares.
* **Impacto en el Frontend**:
  Para permitir la navegación hacia los 10 nuevos lugares, el cliente web utiliza `enrichTimeMatrices` en `App.tsx`, estimando distancias aéreas (Haversine $\times$ 1.32 factor de curvatura colonial) con listas de segmentos vacías `[]`. Esto impide visualizar el trazo detallado de las aceras sobre el mapa para dichos puntos.
* **Recomendación**:
  Completar los pares de nodos y tramos de banqueta en `pipelines/src/graph_builder.py` para calcular el ruteo peatonal exacto sobre las 24 ubicaciones.

### 3.2 Componentes Huérfanos con Alto Valor de Demostración
1. **`RouteComparison.tsx`**:
   Componente completamente maquetado que contrasta métricas clave (tiempo, distancia, gasto en comercios locales, porcentaje de tramos verificados) entre la Ruta Optimizada, la Ruta Clásica y la Ruta Más Accesible. Se recomienda reincorporarlo en la vista de visitante (`VisitorView.tsx`) para la evaluación ante el jurado.
2. **Descomposición $S_i$ (IA Explicable)**:
   En `StopDetails.tsx` se contaba con la visualización gráfica de las 4 barras de utilidad ($S_i$: interés temático, presupuesto, dispersión zonal y apoyo al comercio local). Se recomienda incorporar este bloque en el panel táctico lateral (`TacticalDesktopPanel.tsx`) y en el panel inferior móvil (`TacticalBottomSheet.tsx`).

### 3.3 Datos Hardcodeados vs. Datos Procesados
* En `SustainabilityDashboard.tsx`: el listado de barreras críticas (3 tramos) se encuentra codificado en un array local en TypeScript, a pesar de que el pipeline genera `data/processed/barrier_ranking.json` con el ranking cuantitativo exacto de POIs desbloqueados por perfil de movilidad. Se recomienda consumir dinámicamente este JSON.
* En `DataInfoModal.tsx`: las etapas del embudo DENUE 2026 se encuentran estáticas en el componente. Se recomienda cargarlas desde `data_cleaning_funnel.json`.

---

## 4. Estado de Verificación de Suites de Pruebas y Builds

| Prueba / Verificación | Entorno | Resultado | Observaciones |
| :--- | :---: | :---: | :--- |
| **Compilación Sintáctica Python** | Python 3.14 | ✅ Pasa | Los 15 archivos `.py` en pipelines y services compilan sin errores sintácticos (`py_compile`). |
| **Pruebas Algoritmo OPTW** | Vitest 2.1 | ✅ Pasa | 5/5 pruebas unitarias en `packages/shared-types/src/optw.test.ts` pasan satisfactoriamente. |
| **Compilación TypeScript Web** | Vite 6 / tsc | ✅ Pasa | `apps/web` compila limpiamente para producción en `dist/`. |
| **Compilación API Gateway** | tsc | ✅ Pasa | `services/gateway` compila limpiamente para producción en `dist/`. |
| **Motor RAG Cultural (BM25)** | Python | ✅ Pasa | Consulta léxica sobre 14 pasajes patrimoniales devuelve citas oficiales verificadas sin alucinaciones. |
| **Pipeline de Calibración** | Python | ✅ Pasa | Regresión logística con Bootstrap ($B=300$) converge y calcula intervalos de confianza del 95%. |
| **Linter Monorepo (`pnpm lint`)** | pnpm | ❌ Falla | Error por falta de script `lint` en los paquetes del workspace. |
| **Simulación Masiva (`simulation.py`)** | Python | ❌ Falla | Caída por `KeyError: 'poi_mercado_parian'` (requiere sincronización $24 \times 24$). |

---

## 5. Hoja de Ruta de Implementación Priorizada

```
[Fase 1: Corrección Inmediata]
  ├── Sincronizar catálogo a 24 POIs en pois_curated.json
  ├── Extender poi_access_node y tramos de banqueta en graph_builder.py
  ├── Regenerar time_matrices.json completo (24x24)
  └── Registrar Service Worker en apps/web/src/main.tsx

[Fase 2: Reactivación UI y Explicabilidad]
  ├── Reincorporar RouteComparison en VisitorView
  ├── Añadir barras Si en TacticalDesktopPanel y TacticalBottomSheet
  ├── Consumir barrier_ranking.json en SustainabilityDashboard
  └── Exponer /v1/cultural/query en el Gateway Fastify

[Fase 3: Infraestructura y DevOps]
  ├── Script seed_postgis.py para poblar PostgreSQL 16 + PostGIS
  ├── Workflow GitHub Actions (.github/workflows/ci.yml)
  └── Generar iconos PWA e integrar geocerca física para el Pasaporte
```
