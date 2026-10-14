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

1. **Paso 1: Abrir la Aplicacion Web en Navegador**:
   * Desconectar la conexion a internet (modo avion) para demostrar que la aplicacion, el grafo, las matrices y la heuristica operan con total autonomia.
2. **Paso 2: Generar Ruta en Perfil 'Sin Restriccion'**:
   * Seleccionar 180 minutos, presupuesto de $200 MXN, intereses en artesania y gastronomia poblana.
   * Mover el control hacia "Mas local (Barrios)".
   * Observar como la ruta avanza desde Catedral hacia el Puente de Ovando, el Parque de Analco, el Horno de Alfareria de La Luz y el Mercado El Alto.
3. **Paso 3: Visualizar el Nivel de Confianza en el Mapa**:
   * Mostrar como los tramos de banqueta tienen codificacion dual:
     * Linea solida verde: tramos con auditoria presencial verificada (alta confianza).
     * Linea discontinua: tramos inferidos cartograficamente (baja confianza).
4. **Paso 4: Cambiar a Perfil 'Silla de Ruedas'**:
   * Hacer clic en "Silla de ruedas".
   * El mapa y el itinerario se recalculan al instante: se eliminan los tramos con escalones hacia el Horno de La Luz y se ofrece una alternativa plenamente nivelada y con rampas dentro del perimetro seguro del Centro.
5. **Paso 5: Mostrar el Comparador Lado a Lado**:
   * Contrastar la ruta clasica frente a la optimizada sostenible:
     * Mostrar como el gasto local sube al 59% y las paradas fuera del nucleo alcanzan casi el 90%.
6. **Paso 6: Abrir el Detalle de Parada y Explicacion de $S_i$**:
   * Mostrar las barras de utilidad transparente: interes, presupuesto, dispersion zonal y bono local.
7. **Paso 7: Activar el 'Modo Stand'**:
   * Presionar el boton "Modo Stand" en la barra superior: la aplicacion entrara en bucle automatico rotando entre perfiles y rutas cada 12 segundos para exposicion continua ante visitantes del stand.

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
