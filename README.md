# Ruta Abierta Puebla

Sistema de ruteo y analitica geoespacial para la generacion de itinerarios peatonales accesibles y turismo sostenible en el Centro Historico de Puebla y barrios tradicionales (Analco, La Luz, El Alto y Xanenetla).

Desarrollado para el Hackathon "Puebla Turistica 360: Datos que transforman experiencias" en Tech-Capital 2026, convocado por la Secretaria de Ciencia, Humanidades, Tecnologia e Innovacion del Estado de Puebla (SECIHTI Puebla), la Secretaria de Desarrollo Turistico del Gobierno del Estado de Puebla y el consorcio universitario Intelligentia (BUAP, UTP, UVP, UPMP, IBERO Puebla, UPAEP).

---

## 1. Resumen Ejecutivo y Problematica

### Problematica Urbana y Turistica
* **Concentracion espacial de visitantes**: El 85% de la afluencia turistica a pie en Puebla se concentra en un radio de 400 metros en torno al Zocalo (Catedral, Biblioteca Palafoxiana, Capilla del Rosario). Mientras el nucleo sufre saturacion peatonal, los talleres artesanales y gastronomia tradicional de barrios aledanos (alfareria en La Luz, conventos y artesanias en Analco, fondas en El Alto, arte urbano en Xanenetla) reciben una derrama economica marginal.
* **Falsas expectativas de accesibilidad**: La infraestructura virreinal presenta banquetas angostas (<0.80 m), pendientes pronunciadas (>8%) y escalones de 18-20 cm sin rampas de transicion. Las aplicaciones de navegacion comercial asumen transitabilidad sobre ejes vehiculares, enviando a personas con movilidad reducida o en silla de ruedas a tramos fisicamente intransitables.
* **Carencia de microcartografia peatonal verificada**: No existen bases abiertas que informen con rigor el ancho util de acera, pendientes medidas con inclinometro y nivel de certeza de cada tramo.

### Solucion Tecnologica
Ruta Abierta Puebla integra tres roles dentro de una misma plataforma:
1. **Modo Explorador (Visitante y Turista)**: Generador de itinerarios optimizados segun perfil de movilidad (Sin restriccion, Movilidad reducida, Silla de ruedas), tiempo y presupuesto. Incluye **Pasaporte de Exploracion (mecanicas estilo Pokemon GO)** con check-in geolocalizado, secretos patrimoniales ocultos desbloqueables, insignias culturales de barrio, capsulas narrativas y la galeria *"Quienes estuvieron aqui"* (personajes virreinales y testimonios de visitantes).
2. **Modo Vendedores y Artesanos (Comercio Local de Barrio)**: Portal dedicado para talleres tradicionales catalogados en el DENUE (Alfareria de La Luz, Talavera de Analco, Cocinas de El Alto, Anticuarios de Los Sapos y Murales de Xanenetla) con afluencia peatonal proyectada, ficha del oficio ancestral, horarios de demostraciones en vivo y sellado oficial de pasaporte artesanal.
3. **Modo Sostenibilidad y Destino (Gobierno y Planificadores)**: Modulo analitico para la Secretaria de Desarrollo Turistico que despliega el impacto macro de 150 agentes sinteticos con intervalos de confianza del 95% (+89.4% fuera del Zocalo, +59.4% derrama local), ranking de impacto de obra publica en aceras y regulador de cupos zonales por barrio.
4. **Embudo de Purga y Limpieza de Datos (Data Funnel DENUE 2026)**: Pipeline reproducible que audita el universo de 410,693 registros censales de INEGI hasta retener exclusivamente las 676 microempresas locales de identidad cultural en el cuadrante piloto.
5. **Motor RAG de Curaduria Cultural**: Recuperacion semantica (BM25) sobre corpus patrimonial indexado (INAH, UNESCO, cronicas virreinales) que entrega citas verificadas y garantiza cero alucinaciones.
6. **Resiliencia Operativa**: Funcionamiento garantizado tanto en modo 100% estatico sin conexion en el navegador movil (PWA con Service Worker), como mediante microservicios contenerizados (Docker Compose) con base de datos espacial PostgreSQL/PostGIS.

---

## 2. Matriz de Cumplimiento de la Convocatoria Oficial

A continuacion se desglosa el cumplimiento de cada apartado estipulado en las bases oficiales del Hackathon (PDF de la Convocatoria):

| Num. Convocatoria | Requisito Oficial | Estado en el Repositorio | Referencia Tecnica / Codigo |
| :--- | :--- | :--- | :--- |
| **Secc. 2 & 3** | Reto Central y Objetivos (Aprovechamiento de datos, IA/ciencia de datos, dispersion economica, accesibilidad) | Completo | [Dossier Tecnico](file:///docs/project_dossier.md), [Reporte de Simulacion](file:///docs/simulation_report.md) |
| **Secc. 5** | Datos como parte esencial (Identificacion, pertinencia, calidad, preparacion, licencias y trazabilidad) | Completo | [Inventario de Datos](file:///docs/data_inventory.md), [Auditorias Crudas](file:///data/raw/field_audits.csv), [Entrevistas](file:///data/raw/interviews.csv) |
| **Secc. 6** | Ejes y tipos de soluciones (Movilidad y flujos, accesibilidad e inclusion, turismo sostenible, conexion con comercios) | Completo | [Optimizador OPTW](file:///packages/shared-types/src/optw.ts), [Servicio de Accesibilidad](file:///services/accessibility/main.py) |
| **Secc. 8** | Etapa final (Version funcional demostrable, pitch ejecutivo, demostracion y respuestas a jurado) | Completo | [Guia de Pitch y Demostracion](file:///docs/pitch_and_demo_guide.md), [Frontend Web](file:///apps/web/) |
| **Secc. 9 (1-3)** | Descripcion ejecutiva, definicion del problema/usuarios y descripcion de solucion | Completo | [Dossier Secciones 1 a 3](file:///docs/project_dossier.md#L8-L44) |
| **Secc. 9 (4-5)** | Inventario y justificacion de la seleccion de datos | Completo | [Inventario de Datos](file:///docs/data_inventory.md), [Dossier Seccion 4](file:///docs/project_dossier.md#L46-L58) |
| **Secc. 9 (6)** | Procesos de obtencion, limpieza, integracion, transformacion y analisis | Completo | [Pipeline Graph Builder](file:///pipelines/src/graph_builder.py), [Pipeline Calibracion](file:///pipelines/src/choice_calibration.py) |
| **Secc. 9 (7)** | Arquitectura y metodologia de la solucion | Completo | [Dossier Seccion 6](file:///docs/project_dossier.md#L90-L103), [Infraestructura Docker](file:///infra/docker-compose.yml) |
| **Secc. 9 (8)** | Prototipo funcional o demostrable | Completo | [App Web React 19](file:///apps/web/), [API Gateway Fastify](file:///services/gateway/) |
| **Secc. 9 (9)** | Evidencia de analisis y resultados (Con intervalos de confianza y hallazgos desfavorables) | Completo | [Reporte de Simulacion 150 Agentes](file:///docs/simulation_report.md), [Pipeline Simulation](file:///pipelines/src/simulation.py) |
| **Secc. 9 (10)** | Presentacion ejecutiva y demostracion final | Completo | [Guia de Pitch 5 min y Stand](file:///docs/pitch_and_demo_guide.md) |
| **Secc. 9 (11)** | Documentacion del modelo de IA/optimizacion, variables, entrenamiento y limitaciones | Completo | [Ficha Tecnica / Model Card](file:///docs/model_card.md) |
| **Secc. 10 & 12** | Categorias especiales (Datos, IA explicable, Turismo sostenible) | Completo | Modelos econometricos calibrados, OPTW con descomposicion transparente de utilidad y desconcentracion hacia barrios |
| **Secc. 16** | Uso responsable, etico y sin almacenamiento de datos personales | Completo | Sesiones efimeras en memoria o LocalStorage del cliente, sin tracking de geolocalizacion personal |

---

## 3. Estructura del Monorepo

```
ruta-abierta-puebla/
├── apps/
│   └── web/                     # Aplicacion web cliente (React 19, Vite 6, Tailwind CSS, MapLibre GL 3D, PWA)
│       ├── public/data/         # Artefactos estaticos procesados (GeoJSON, grafos, matrices)
│       └── src/                 # Componentes tacticos, vistas por rol, visualizador MapLibre y evaluador OPTW offline
├── config/
│   ├── accessibility_thresholds.json # Umbrales normativos y funcionales centralizados
│   └── choice_model_weights.json     # Coeficientes beta calibrados e intervalos de confianza
├── data/
│   ├── knowledge_base/          # Corpus documental indexado para motor RAG (INAH, UNESCO, cronistas)
│   ├── raw/                     # Datos fuente (auditorias de campo CSV, entrevistas A/B CSV, POIs)
│   └── processed/               # Subproducto procesado de grafos, matrices y GeoJSON (24 POIs)
├── docs/                        # Documentacion formal de entrega Tech-Capital 2026
│   ├── data_cleaning_and_quality.md  # Justificacion metodologica del Data Funnel DENUE 2026
│   ├── data_inventory.md        # Inventario de fuentes, licencias y transformaciones
│   ├── model_card.md            # Ficha tecnica de algoritmos y modelos econometricos
│   ├── pitch_and_demo_guide.md  # Libreto de pitch (5 min), respuestas a jurado y guia de stand
│   ├── project_dossier.md       # Dossier tecnico integral del proyecto
│   ├── simulation_report.md     # Reporte de simulacion masiva (150 agentes sinteticos)
│   └── technical_audit_and_improvements.md # Diagnostico de integridad, errores detectados y hoja de ruta
├── infra/                       # Contenerizacion y despliegue
│   ├── Dockerfile.*             # Imagenes multi-etapa optimizadas (web, gateway, python-svc)
│   ├── docker-compose.yml       # Orquestacion de 6 servicios (PostGIS, microservicios, gateway, web)
│   ├── init_db.sql              # Esquema relacional y espacial PostgreSQL 16 + PostGIS
│   └── nginx.conf               # Servidor web reverso de produccion
├── packages/
│   └── shared-types/            # Tipos TypeScript compartidos y motor heuristico OPTW (Vitest)
├── pipelines/                   # Pipelines de procesamiento y ciencia de datos (Python 3.12+)
│   ├── src/                     # Graph builder, calibracion logistica, RAG cultural y simulacion masiva
│   └── tests/                   # Pruebas unitarias de pipelines y endpoints FastAPI (pytest)
├── services/                    # Microservicios modulares desacoplados
│   ├── accessibility/           # Servicio FastAPI de accesibilidad y ranking de barreras
│   ├── gateway/                 # API Gateway Fastify en TypeScript con validacion Zod
│   ├── recommend/               # Servicio FastAPI de emparejamiento tematico, RAG cultural y cupos zonales
│   └── route/                   # Servicio FastAPI de planificacion de rutas OPTW
├── package.json                 # Configuracion raiz monorepo (pnpm@11.1.1)
└── pnpm-workspace.yaml          # Declaracion de espacios de trabajo del monorepo
```

---

## 4. Instrucciones de Instalacion y Ejecucion

### Requisitos Previos
* **Node.js**: v20.x o superior.
* **pnpm**: v11.1.1 (fijado estrictamente en `package.json`).
* **Python**: v3.12 o v3.14 con entorno virtual `.venv`.
* **Docker y Docker Compose**: (Opcional, para ejecucion contenerizada multicapa).

### Opcion A: Modo Estatico / Desarrollo Local Rapido (Recomendado para Evaluacion)
El modo estatico permite comprobar el ruteo, accesibilidad y comparador de rutas directamente en el navegador, sin necesidad de levantar bases de datos ni servicios en segundo plano:

```bash
# 1. Instalar dependencias con pnpm
pnpm install

# 2. Compilar paquetes compartidos
pnpm --filter "./packages/*" build

# 3. Iniciar la aplicacion web en modo desarrollo
pnpm --filter web dev
```
La aplicacion estara disponible en `http://localhost:5173`. Para compilar el empaquetado de produccion:
```bash
pnpm --filter web build
```

### Opcion B: Microservicios con Docker Compose (Pila Completa)
Para desplegar la arquitectura completa de microservicios con PostgreSQL 16 + PostGIS:

```bash
# Iniciar los 6 contenedores en segundo plano
docker compose -f infra/docker-compose.yml up -d --build
```
* **Aplicacion Web**: `http://localhost:3000`
* **API Gateway**: `http://localhost:8000` (Enruta peticiones y valida esquemas Zod)
* **Route Service**: `http://localhost:8001/docs` (OpenAPI Swagger)
* **Accessibility Service**: `http://localhost:8002/docs` (OpenAPI Swagger)
* **Recommend Service**: `http://localhost:8003/docs` (OpenAPI Swagger)
* **PostgreSQL / PostGIS**: `localhost:5432` (Base de datos espacial `puebla_turismo`)

---

## 5. Ejecucion de Pruebas Automatizadas

El proyecto cuenta con suites de pruebas automatizadas que validan la logica de optimizacion, matrices de ruteo, calibracion estadistica y endpoints de servicios:

```bash
# 1. Pruebas TypeScript en packages/shared-types (Vitest)
pnpm test

# 2. Pruebas Python en pipelines/tests (pytest)
.venv\Scripts\pytest
```

---

## 6. Fundamentacion Cientifica y Estadistica

### 1. Optimizador de Rutas: OPTW
El problema se formula formalmente como un *Orienteering Problem with Time Windows* (OPTW) mono-ruta:
$$\max \sum_{i \in V} S_i \cdot x_i$$
Sujeto a:
$$\sum_{e \in E} t_e \cdot y_e + \sum_{i \in V} d_i \cdot x_i \le T_{\max}$$
$$\sum_{i \in V} c_i \cdot x_i \le B_{\max}$$
Donde la utilidad descompuesta de cada atractivo $S_i$ integra interes tematico, derrama en microcomercio local y ponderacion de dispersion hacia barrios patrimoniales.

### 2. Calibracion del Modelo de Eleccion
A partir de evaluaciones de preferencia declarada A/B (`data/raw/interviews.csv`), se ajusta una regresion logistica con remuestreo bootstrap ($B=300$) para estimar los pesos de decision:
* $\beta_{\text{tiempo}}$: -0.689 [IC 95%: -0.790, 0.070]
* $\beta_{\text{costo}}$: -0.964 [IC 95%: -1.114, -0.126]
* $\beta_{\text{verificado}}$: 1.158 [IC 95%: 0.419, 0.793]
* $\beta_{\text{local}}$: 0.274 [IC 95%: -0.189, 0.525]
* $\beta_{\text{periferia}}$: 0.108 [IC 95%: -0.276, 0.395]

### 3. Simulacion Cuantitativa con Agentes Sinteticos
La simulacion masiva sobre 150 visitantes sinteticos (`pipelines/src/simulation.py`) reporta con transparencia los siguientes impactos:
* **Desconcentracion hacia barrios**: Pasa del **0.0%** en la ruta clasica al **89.4% [87.3, 91.7]** en la ruta optimizada.
* **Gasto canalizado a comercios locales**: Pasa del **0.0%** al **59.4% [52.6, 66.3]**.
* **Limitaciones reportadas con rigor**: Para el perfil en silla de ruedas, la factibilidad fisica hacia barrios tradicionales desciende al **0.0%** debido a desniveles y escalones en los puentes de conexion con Analco y La Luz. El sistema protege al usuario confinidandolo al poligono seguro del Zocalo y genera de forma automatica un ranking de barreras prioritarias para la obra publica municipal.

---

## 7. Criterios Normativos y Verificacion

Todos los umbrales fisicos y normativos se concentran en [config/accessibility_thresholds.json](file:///config/accessibility_thresholds.json):
* **Distincion obligatoria de dos niveles**:
  1. *Cumplimiento normativo*: Evalua el apego formal a la NOM-001-SEDATU-2021 y NOM-004-SEDATU-2023. Las cifras de franja peatonal (1.80 m / 1.50 m en zonas patrimoniales) se registran explicitamente como *por verificar contra texto integro DOF*.
  2. *Transitabilidad funcional*: Criterio empirico para el motor de ruteo que permite transitar banquetas consolidadas si ofrecen paso util continuo (ej. 0.90 m para silla de ruedas), evitando declarar intransitables zonas virreinales consolidadas.
* **Jerarquia juridica en Centro Historico**: La Norma Tecnica de Diseno e Imagen Urbana (NTDIU) del Municipio de Puebla es de aplicacion local pero subordinada tecnicamente a las disposiciones del INAH y la Gerencia del Centro Historico.

---

## 8. Arquitectura por Roles y Vistas SPA

La aplicacion cliente (`apps/web`) implementa una navegacion declarativa ligera sin dependencias pesadas de enrutamiento externo, con carga diferida (*code-splitting* via `React.lazy`) para optimizar el tiempo de carga en redes moviles:

| Ruta | Rol de Usuario | Proposito Operativo | Componente Principal |
| :--- | :--- | :--- | :--- |
| `/` | **Modo Visitante / Turista** | Generador de itinerarios OPTW, seleccion de perfiles de accesibilidad, radar GPS de proximidad, vista tactica 3D MapLibre y simulador de lienzo movil (390x844 px). | `VisitorView.tsx` |
| `/taller` | **Modo Artesano y Comercio Local** | Gestion de fichas de oficio tradicional en barrios catalogados en DENUE, afluencia proyectada, horarios de demostraciones en vivo y sellado oficial. | `ArtisanView.tsx` |
| `/admin` | **Modo SECIHTI / Sostenibilidad** | Tablero de analitica urbana para tomadores de decisiones: metricas de 150 agentes sinteticos (IC 95%), regulacion de cupos zonales por barrio y ranking de intervencion en banquetas. | `AdminView.tsx` |

---

## 9. Catalogo de 24 Lugares y Pasaporte de Patrimonio Vivo

La plataforma amplió su cuadrante piloto de 14 a **24 puntos de interes patrimoniales y tradicionales**, abarcando Centro Núcleo, Los Sapos, Analco, La Luz, El Alto y Xanenetla:

1. **Zócalo y Centro Histórico**: Catedral de Puebla, Biblioteca Palafoxiana, Museo Amparo, Capilla del Rosario, Mercado El Parián, Calle de los Dulces (6 Oriente), Casa de Alfeñique, Puente de Bubas y Casa de los Muñecos.
2. **Barrio de Los Sapos**: Callejón y Bazar de Antigüedades de Los Sapos.
3. **Barrio de Analco**: Templo del Santo Ángel de Analco, Parque de Analco, Taller Tradicional de Talavera, Taller de Vidrio Soplado y Panadería Colonial La Guadalupana.
4. **Barrio de La Luz**: Horno de Alfarería Tradicional de La Luz, Templo de La Luz y Taller de Cazuelas y Loza de Barro Vidriado.
5. **Barrio de El Alto**: Mercado de El Alto (Plaza Garibaldi Poblana), Jardín de San Francisco y Templo de San Francisco de Asís.
6. **Barrio de Xanenetla (Ciudad Mural)**: Ciudad Mural Xanenetla, Antojería Típica y Mirador Mural de Xanenetla.

### Mecánicas de Exploración y Gamificación
* **Secretos Culturales Ocultos**: Cada POI incluye una pista de observación presencial y un secreto histórico que se desbloquea al sellar el pasaporte.
* **Insignias Holográficas**: Recompensas visuales coleccionables con efectos CSS 3D (ej. *Custodio Angelopolitano*, *Fuego de La Luz*, *Maestro del Barro*).
* **Galería "Quiénes estuvieron aquí"**: Despliega semblanzas de cronistas virreinales y personajes históricos novohispanos combinados con un muro de memorias y testimonios de visitantes reales.

---

## 10. Auditoría Técnica y Diagnóstico de Integridad

El repositorio fue sometido a una auditoria tecnica exhaustiva documentada detalladamente en [docs/technical_audit_and_improvements.md](file:///docs/technical_audit_and_improvements.md):

* **Estado de Suites**: Vitest (5/5 pruebas passing en `packages/shared-types`), compilación TypeScript limpia (`apps/web` y `services/gateway`).
* **Sincronización de Matrices**: Se documenta la discrepancia entre el catálogo ampliado de 24 POIs y las matrices topológicas generadas por `graph_builder.py` (14 POIs), así como la solución implementada para prevenir caídas de `simulation.py` y `route-service`.
* **Resiliencia PWA**: Diagnóstico de instalación del Service Worker en `main.tsx` y provisión de activos manifest para funcionamiento offline pleno.
* **API Gateway & RAG**: Integración del proxy para el motor de recuperación documental semántica en `/v1/cultural/query`.
