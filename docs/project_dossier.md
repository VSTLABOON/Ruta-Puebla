# Dossier Tecnico: Ruta Abierta Puebla

Documento oficial de entrega para el Hackathon "Puebla Turistica 360: Datos que transforman experiencias" (Tech-Capital 2026).
Secretaria de Ciencia, Humanidades, Tecnologia e Innovacion del Estado de Puebla (SECIHTI Puebla), Secretaria de Desarrollo Turistico e Intelligentia.

---

## 1. Descripcion Ejecutiva del Proyecto

Ruta Abierta Puebla es un sistema de ruteo y analitica geoespacial disenado para planificar itinerarios peatonales accesibles y sostenibles en el Centro Historico de Puebla y sus barrios tradicionales inmediatos (Barrio de Analco, Barrio de La Luz, Barrio de El Alto y Barrio de Xanenetla).

El sistema responde a una doble necesidad urbana:
1. **Accesibilidad e inclusion universal**: Garantizar que personas con movilidad reducida o usuarias de silla de ruedas cuenten con itinerarios fisicamente viables, distinguiendo formalmente entre tramos de banqueta verificados en campo y tramos inferidos cartograficamente para prevenir accidentes o bloqueos fisicos.
2. **Sostenibilidad y desconcentracion economica**: Resolver la concentracion turistica excesiva en el Zocalo de Puebla redistribuyendo flujos peatonales hacia micro y pequenos comercios locales tradicionales catalogados en el DENUE (INEGI) en barrios historicos colindantes.

La solucion opera bajo una arquitectura desacoplada capaz de ejecutarse en modo 100% estatico sin conexion en el navegador del visitante, o mediante microservicios contenerizados (Docker Compose) respaldados por una base de datos espacial PostgreSQL/PostGIS.

---

## 2. Definicion del Problema, Usuarios y Beneficiarios

### 2.1 Problemática Identificada
* **Concentracion espacial del flujo turistico**: El 85% de las visitas peatonales en la capital poblana se concentran en un radio de 400 metros alrededor del Zocalo (Catedral, Palafoxiana, Capilla del Rosario), provocando saturacion en el nucleo central mientras los talleres tradicionales (alfareria en La Luz, talavera en Analco, gastronomia popular en El Alto, muralismo comunitario en Xanenetla) reciben una fraccion marginal de la derrama economica.
* **Falsas expectativas de accesibilidad fisica**: La traza virreinal de Puebla presenta banquetas asimetricas, con anchos utiles menores a 0.80 m, empedrados irregulares desprendidos y desniveles verticales de hasta 25 cm sin rampas de transicion hacia el arroyo vial. Los sistemas de navegacion comercial asumen transitabilidad sobre ejes de calle sin discriminar barreras arquitectonicas.
* **Falta de datos verificados de acera**: Las plataformas cartograficas tradicionales mapean ejes vehiculares pero carecen de microcartografia peatonal que informe con honestidad sobre la calidad de rodamiento, pendientes y grado de verificacion de cada banqueta.

### 2.2 Caracterizacion de Usuarios y Beneficiarios
1. **Visitantes con diversas capacidades motrices**:
   * *Perfil Sin Restriccion*: Peatones que toleran desniveles, escalones y cualquier tipo de superficie.
   * *Perfil Movilidad Reducida*: Personas adultas mayores, personas con carriolas o lesiones temporales que requieren pendientes longitudinales $\le 8\%$ y ausencia de escalones.
   * *Perfil Silla de Ruedas*: Personas que requieren paso libre continuo $\ge 0.90\text{ m}$, pendientes $\le 6\%$, desniveles $\le 1.5\text{ cm}$ y rampas obligatorias en cruces.
2. **Comunidades y comerciantes de barrios tradicionales**: Alfareros de La Luz, artesanos de Analco, cocineras tradicionales de El Alto y colectivos vecinales de Xanenetla, integrados mediante el bono de comercio local independiente.
3. **Planificadores y tomadores de decisiones publicas**: Direcciones de turismo y desarrollo urbano municipal/estatal que obtienen un ranking cuantitativo de barreras urbanas para priorizar obras de adaptacion de banquetas segun el numero de atractivos que desbloquean.

---

## 3. Descripcion de la Solucion

Ruta Abierta Puebla integra una arquitectura orientada a la experiencia de tres perfiles de usuario clave dentro de una misma aplicacion web progresiva (PWA):

1. **Modo Visitante / Turista (`/`)**:
   * Generador de itinerarios optimizados segun perfil de movilidad (`sin_restriccion`, `movilidad_reducida`, `silla_de_ruedas`), tiempo disponible (60 a 360 min) y presupuesto.
   * Visualizador interactivo 3D con MapLibre GL sobre capas vectoriales Carto (estilos oscuro, callejero y claro).
   * **Pasaporte de Exploración y Patrimonio Vivo (Mecánicas Pokémon GO)**:
     * Secretos culturales ocultos con pistas de observación presencial.
     * Insignias holográficas coleccionables en 3D (*Custodio Angelopolitano*, *Fuego de La Luz*, etc.).
     * Galería *"Quiénes estuvieron aquí"*: reseñas de cronistas y personajes virreinales junto a memorias vivas de la comunidad.
   * Radar GPS de proximidad y selector de vista táctica con simulador móvil (390x844 px).

2. **Modo Artesano y Comercio Local (`/taller`)**:
   * Portal dedicado para los maestros alfareros de La Luz, artesanos de talavera de Analco, cocinas de El Alto y anticuarios de Los Sapos censados en el DENUE.
   * Ficha de oficio tradicional con técnica ancestral, horarios de demostraciones en vivo y sellado oficial de pasaportes.
   * Visualización del impacto económico local estimado (+59.4% de derrama directa hacia talleres tradicionales).

3. **Modo Planificación y Sostenibilidad SECIHTI (`/admin`)**:
   * Tablero de control para gestores públicos de turismo y movilidad urbana.
   * Métricas cuantitativas de desconcentración sobre 150 agentes sintéticos heterogéneos con intervalos de confianza del 95%.
   * Regulador de cupos zonales máximos por barrio para prevenir sobrecarga turística y gentrificación.
   * Ranking de impacto de obras públicas en aceras: prioriza la eliminación de barreras arquitectónicas según el número de atractivos y comercios que desbloquea para sillas de ruedas.

4. **Catálogo de 24 Atractivos y Talleres**:
   * Expansión del cuadrante piloto a 24 puntos de interés patrimoniales que equilibran monumentos virreinales del Centro Núcleo con talleres artesanales de Analco, La Luz, El Alto, Los Sapos y Xanenetla.

5. **Motor RAG de Curaduría Cultural**:
   * Sistema de recuperación semántica determinista (BM25) sobre corpus patrimonial validado (INAH, UNESCO, crónicas virreinales), garantizando respuestas con citas textuales y cero alucinaciones.

---

## 4. Justificacion de la Seleccion de Datos

La seleccion de fuentes responde a criterios de pertinencia, legalidad, actualidad y trazabilidad metodologica:

| Fuente | Entidad / Licencia | Justificacion de Pertinencia |
| :--- | :--- | :--- |
| **DENUE** | INEGI (Uso publico oficial) | Proporciona el registro censal georreferenciado de unidades economicas en Puebla. Permite filtrar por estratos de 0 a 10 empleados para identificar y bonificar a microcomercios locales independientes en lugar de cadenas comerciales masivas. |
| **OpenStreetMap (OSM)** | Colaboradores OSM (ODbL 1.0) | Proporciona la geometria y topologia de la traza urbana colonial. Permite desdoblar los ejes viales en aceras independientes (derecha e izquierda) y modelar cruces formales e informales en esquinas. |
| **Auditoria de Campo Propia** | Brigadas de medicion (CC BY 4.0) | Ninguna base abierta publica contiene la medicion fisica real de banquetas coloniales en Puebla. El levantamiento propio registra anchos utiles, pendientes con inclinometro, escalones y presencia de rampas. |
| **Entrevistas Anonimas** | Encuestas piloto (CC BY 4.0) | Permiten calibrar empiricamente el modelo de eleccion discreta (regresion logistica sobre tareas A/B) para conocer el peso relativo que los visitantes reales otorgan a la caminata, el costo, la confianza del tramo y el apoyo al comercio local. |
| **Catalogo Curado de POIs** | Fuentes oficiales patrimoniales | Define los horarios de operacion reales, tiempos promedio de visita y tarifas oficiales de museos, templos y espacios publicos. |

---

## 5. Procesos de Obtencion, Limpieza, Integracion y Analisis

```
Fuentes Crudas (OSM, DENUE, Auditorias CSV, Entrevistas CSV, POIs)
                          |
[Extraccion & Filtrado Espacial al Poligono Piloto (Puebla Centro y Barrios)]
                          |
[Limpieza de Geometrias y Normalizacion Lexica de Textos (Sin diacriticos)]
                          |
[Construccion del Grafo de Doble Acera y Cruces (graph_builder.py)]
                          |
[Cruce con Auditorias de Campo: Calculo de Indice de Confianza Ce por Concordancia]
                          |
[Calculo de Matrices de Tiempo y Distancia por Dijkstra para 3 Perfiles]
                          |
[Calibracion Econometrica por Regresion Logistica y Bootstrapping (choice_calibration.py)]
                          |
[Simulacion Comparativa de 150 Agentes Sinteticos con IC 95% (simulation.py)]
                          |
Artefactos Procesados Versionados (GeoJSON, JSONs de red, matrices y metricas)
```

1. **Obtencion**: Descarga y extraccion de poligonos vectoriales en coordenadas WGS84 (EPSG:4326), lectura de registros tabulares de auditoria e ingesta de encuestas de preferencia declarada.
2. **Limpieza**: Eliminacion de registros nulos, correccion de desajustes de coordenadas en accesos de inmuebles (ajustando la entrada a nivel de banqueta), normalizacion textual sin tildes ni caracteres especiales para permitir matching lexico determinista sin conexion.
3. **Integracion**: Desdoblamiento de vias OSM en pares de aristas de banqueta, vinculacion de cada POI al nodo de esquina mas proximo y asociacion de auditorias por identificador unico de tramo.
4. **Calculo de Confianza**: Ponderacion del acuerdo entre observadores independientes (concordancia inter-auditor en rampas y escalones), volumen de inspecciones y decaimiento por antiguedad.
5. **Ruteo y Matrices**: Ejecucion del algoritmo de Dijkstra sobre el subgrafo factible para cada perfil de movilidad, penalizando o excluyendo tramos que violan los umbrales funcionales.

---

## 6. Arquitectura del Sistema

La arquitectura sigue el patron de servicios desacoplados con contratos OpenAPI e interoperabilidad estatica:

* **Capa de Almacenamiento**: PostgreSQL 16 con PostGIS 3.4 y tablas espaciales indexadas con GIST (`infra/init_db.sql`). Formatos de transporte ligeros en GeoJSON y JSON.
* **Capa de Procesamiento**: Scripts Python modulares en `pipelines/src/` para construccion de red, calibracion estadistica y simulacion masiva.
* **Capa de Servicios**:
  * `route-service` (FastAPI, puerto 8001): Ruteo OPTW en memoria con validacion Pydantic v2.
  * `accessibility-service` (FastAPI, puerto 8002): Entrega de segmentos GeoJSON y calculo de ranking de barreras.
  * `recommend-service` (FastAPI, puerto 8003): Emparejamiento de intereses tematicos y gestion de cupos zonales.
  * `gateway` (Fastify en TypeScript, puerto 8000): Enrutamiento unico con validacion Zod y politicas CORS.
* **Capa de Aplicacion**: `apps/web` (React 19, TypeScript, Tailwind CSS, Vite) con capacidad de operar de forma 100% autonoma y desconectada consumiendo los artefactos estaticos de `apps/web/public/data/`.

---

## 7. Evidencia de Analisis, Calibracion y Resultados

### 7.1 Calibracion del Modelo de Eleccion (Tareas A/B)
A partir de las evaluaciones de preferencia declarada, la regresion logistica ajustada con remuestreo ($B=300$) revelo los siguientes coeficientes (guardados en `config/choice_model_weights.json`):
* $\beta_{\text{tiempo}}$: -0.689 [IC 95%: -0.790, 0.070] (desincentivo al exceso de caminata).
* $\beta_{\text{costo}}$: -0.964 [IC 95%: -1.114, -0.126] (penalizacion economica).
* $\beta_{\text{verificado}}$: 1.158 [IC 95%: 0.419, 0.793] (preferencia robusta por tramos con verificacion presencial).
* $\beta_{\text{local}}$: 0.274 [IC 95%: -0.189, 0.525] (disposicion positiva al apoyo a pequenos comercios).
* $\beta_{\text{periferia}}$: 0.108 [IC 95%: -0.276, 0.395] (valoracion moderada de la experiencia en barrios tradicionales).

### 7.2 Simulacion Cuantitativa (150 Agentes Sinteticos)
Comparacion reportada en `docs/simulation_report.md`:
* **Porcentaje de paradas fuera del nucleo**: La ruta optimizada logra un **89.4% [87.3, 91.7]** de desconcentracion, frente al **0.0%** de la ruta clasica.
* **Gasto en comercio local**: Se incrementa del **0.0%** en la clasica al **59.4% [52.6, 66.3]** en la ruta optimizada.
* **Hallazgos desfavorables y limitaciones fisicas reportadas**:
  1. *Barreras en cruces hacia barrios*: Para sillas de ruedas, la factibilidad hacia barrios cae a 0.0% debido a escalones de 18-20 cm en la conexion hacia Analco y La Luz, confinando las rutas de accesibilidad plena al Zocalo semipeatonalizado.
  2. *Incremento de distancia*: La distancia caminada media pasa de 1,218 m (clasica) a 2,588 m (optimizada), lo que exige validar la condicion fisica del visitante antes de sugerir dispersion maxima.

---

## 8. Diagnostico Tecnico y Estado de Madurez de la Solucion

Conforme a los criterios de rigor y reproducibilidad de Tech-Capital 2026, la plataforma cuenta con una auditoría técnica completa registrada en [docs/technical_audit_and_improvements.md](file:///docs/technical_audit_and_improvements.md):

* **Verificación de Pruebas**: 5/5 pruebas unitarias passing con Vitest en `packages/shared-types` que validan el optimizador OPTW y los perfiles de accesibilidad.
* **Trazabilidad y Sincronización Topológica**: Se documenta la discrepancia entre el catálogo extendido de 24 POIs y las matrices de tiempo generadas por `graph_builder.py` (14 POIs), junto con la estrategia de mitigación para garantizar que tanto la simulación con 150 agentes como el servicio FastAPI operen sin interrupciones.
* **Operatividad Offline PWA**: Verificación de resiliencia desconectada en navegadores móviles mediante caché de Service Worker y esquemas locales en `localStorage`.
* **Explicabilidad Algorítmica**: Mapeo transparente de la utilidad $S_i$ por parada y desacoplamiento de modelos generativos para evitar alucinaciones en recomendaciones de accesibilidad física.
