# Guia de Presentacion Ejecutiva y Demostracion Final (Tech-Capital 2026)

Estructura de exposicion ante el jurado calificador y guia de operacion para el stand de demostracion de Ruta Abierta Puebla.

---

## 1. Estructura del Pitch Ejecutivo (5 Minutos)

### Minuto 1: Planteamiento del Problema Urbano y Turistico
* **Mensaje clave**: En Puebla, el 85% de la actividad turistica peatonal se concentra en un radio de 400 metros alrededor del Zocalo. Mientras el nucleo sufre saturacion, los barrios historicos de Analco, La Luz, El Alto y Xanenetla quedan al margen de la derrama economica.
* **El dilema de la accesibilidad**: Las banquetas coloniales son estrechas e irregulares. Las aplicaciones de navegacion convencionales trazan rutas sobre ejes vehiculares sin saber si hay una banqueta de 50 cm, un escalon de 20 cm o un empedrado desprendido, poniendo en riesgo real a personas con movilidad reducida o silla de ruedas.

### Minuto 2: La Solucion - Ruta Abierta Puebla
* **Definicion**: Plataforma de ruteo peatonal accesible y turismo sostenible que resuelve una instancia del Problema de Orientacion con Ventanas de Horario (OPTW).
* **Innovacion en datos**:
  * Grafo de aceras de doble via y cruces esquineros (no ejes vehiculares).
  * Indice de confianza por tramo ($C_e$) basado en auditorias de campo con control de concordancia entre auditores.
  * Bono de dispersion hacia pequenos comercios locales independientes identificados a traves del DENUE (INEGI).

### Minuto 3: Arquitectura, Rigor Tecnico y Resiliencia
* **Arquitectura de dos niveles**: Desacopla el cumplimiento normativo formal (NOM-001 y NOM-004 de SEDATU) de los criterios de transitabilidad funcional real sobre el terreno.
* **Operacion 100% desconectada**: La heuristica en TypeScript y las matrices precargadas corren directamente en el navegador sin requerir conexion a internet ni servidores remotos.
* **Inteligencia artificial explicable**: La IA se utiliza para la calibracion econometrica de preferencias reales y emparejamiento semantico multilingue. Ningun modelo generativo inventa o decide el trazado de la ruta.

### Minuto 4: Resultados Cuantitativos y Honestidad Epistemica
* **Resultados de simulacion (150 agentes sinteticos)**:
  * Incremento de visitas fuera del nucleo saturado: del 0% al 89.4% [87.3, 91.7].
  * Proporcion del gasto destinado a comercios tradicionales locales: del 0% al 59.4% [52.6, 66.3].
* **Transparencia en hallazgos desfavorables**:
  * Para usuarios en silla de ruedas, cruzar hacia Analco o La Luz tiene actualmente 0% de factibilidad debido a barreras fisicas severas (escalones en accesos y banquetas menores a 0.80 m). El sistema no oculta esta realidad: protege al usuario confinendolo a zonas verificadas y genera un ranking de barreras para que el gobierno municipal sepa con precision que tramo reparar primero.

### Minuto 5: Demostracion en Vivo y Escalabilidad
* Demostracion interactiva de cambio de perfil (`sin_restriccion` vs `silla_de_ruedas`).
* Contraste en el comparador lado a lado y explicacion transparente de la utilidad $S_i$ por parada.
* Cierre: Solucion reproducible, con licencias abiertas respetadas y preparada para integracion a nivel estatal.

---

## 2. Guion de Demostracion Interactiva en el Stand

1. **Paso 1: Demostración Autónoma sin Conexión (Modo Offline PWA)**:
   * Desconectar la conexión a internet (modo avión) para comprobar que la aplicación, el grafo, las matrices y el optimizador OPTW operan con total autonomía en el cliente web.
2. **Paso 2: Generar Ruta en Perfil 'Sin Restricción'**:
   * Abrir la aplicación en `/` (Modo Visitante).
   * Seleccionar 180 minutos, presupuesto de $200 MXN, intereses en artesanía y gastronomía poblana.
   * Deslizar el control hacia "Más Barrios y Talleres".
   * Observar cómo la ruta avanza desde Catedral hacia el Puente de Ovando, el Parque de Analco, el Horno de Alfarería de La Luz y el Mercado El Alto.
3. **Paso 3: Visualización 3D y Nivel de Confianza en el Mapa**:
   * Mostrar el mapa interactivo MapLibre GL con extrusión 3D de manzanas urbanas y selector de capas (Oscuro, Callejero, Claro).
   * Mostrar la codificación dual de banquetas: línea sólida para tramos con auditoría presencial de alta confianza y línea punteada para tramos inferidos.
4. **Paso 4: Cambio a Perfil 'Silla de Ruedas'**:
   * Conmutar a "Silla de ruedas o carriola".
   * El mapa y el itinerario se recalculan al instante: se descartan tramos con escalones hacia el Horno de La Luz y se ofrece una alternativa nivelada con rampas dentro del polígono seguro del Centro.
5. **Paso 5: Pasaporte de Exploración y Gamificación Cultural**:
   * Abrir la pestaña de "Secreto de Exploración" en el panel táctico.
   * Mostrar cómo se desbloquea el secreto patrimonial y se otorga la insignia holográfica correspondiente (*Custodio Angelopolitano*, *Fuego de La Luz*).
   * Explorar la pestaña "Quiénes estuvieron aquí" con crónicas virreinales y testimonios de la comunidad.
6. **Paso 6: Conmutar a Modo 'Taller y Comercio Local' (`/taller`)**:
   * Hacer clic en la píldora "Local" en el encabezado.
   * Mostrar el portal para maestros alfareros y artesanos de Analco, La Luz y El Alto censados en DENUE, con horarios de demostración en vivo y ficha del oficio tradicional.
7. **Paso 7: Conmutar a Modo 'Admin y Sostenibilidad' (`/admin`)**:
   * Hacer clic en la píldora "Admin" en el encabezado.
   * Mostrar el panel SECIHTI con el impacto cuantitativo de 150 agentes sintéticos, regulador de cupos de carga turística y ranking de intervención municipal en aceras.
8. **Paso 8: Simulador Móvil y Modal de Auditoría de Datos**:
   * Presionar el botón de teléfono en la cabecera para conmutar la vista a marco de smartphone (390x844 px).
   * Abrir el modal de embudo DENUE (ícono de filtro) para mostrar las 6 etapas metodológicas que depuran 410,693 registros hasta 676 microempresas locales.

---

## 3. Respuestas Anticipadas a Preguntas del Jurado

* **Pregunta: ¿Por que no utilizar simplemente la API de Google Maps o Mapbox para el ruteo?**  
  *Respuesta*: Google Maps y Mapbox trazan sobre lineas centrales de calle para automoviles. No tienen un grafo de doble acera con separacion de banquetas, no registran si una acera mide 0.60 m o 1.80 m, no detectan escalones verticales de entrada a edificios coloniales ni calculan metricas de dispersion hacia pequenos comercios del DENUE.
* **Pregunta: ¿Por que formularlo como OPTW y no como el clasico Problema del Viajante (TSP)?**  
  *Respuesta*: En el TSP se deben visitar todos los puntos obligatoriamente. En el turismo real, un visitante no puede visitar los 50 atractivos de una ciudad en 2 horas; tiene una restriccion presupuestaria de tiempo. El OPTW selecciona inteligentemente el subconjunto optimo que maximiza la utilidad del visitante respetando su tiempo maximo y sus ventanas de horario.
* **Pregunta: ¿Como aseguran la privacidad si se levantaron entrevistas?**  
  *Respuesta*: Las entrevistas son completamente anonimas: no se capturan nombres, edades exactas, telefonos, correos electronicos ni direcciones IP. Unicamente se registran roles de visitante y elecciones entre pares de itinerarios ficticios para calibrar el modelo econometrico.
* **Pregunta: ¿Cual es el papel de la Inteligencia Artificial y por que no pusieron un chatbot?**  
  *Respuesta*: La convocatoria senala que el simple consumo de una API o la incorporacion de un chatbot generico no es suficiente. En Ruta Abierta Puebla la IA cumple roles tecnicamente fundamentados:
  1. Calibracion econometrica mediante regresion logistica de diferencias relativas de atributos con remuestreo (bootstrapping).
  2. Emparejamiento semantico multilingue mediante representaciones vectoriales (`paraphrase-multilingual-MiniLM-L12-v2`).
  3. Los modelos generativos nunca deciden el trazado de la ruta, eliminando cualquier riesgo de alucinacion en accesibilidad fisica.
