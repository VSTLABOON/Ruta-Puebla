# Ficha del Modelo: Ruta Abierta Puebla

Esta ficha documenta las especificaciones tecnicas, formulaciones matematicas, supuestos, limitaciones y consideraciones operativas de los modelos algoritmicos implementados en Ruta Abierta Puebla.

---

## 1. Modelo de Optimizacion de Ruta: Orienteering Problem with Time Windows (OPTW)

### 1.1 Descripcion General
El generador de itinerarios resuelve una instancia del Problema de Orientacion con Ventanas de Horario (OPTW) para un solo visitante. A partir de un punto de origen y fin (retorno o destino final), una cuota de tiempo maximo $T_{\max}$ y un conjunto de atractivos candidatos $V$, el modelo selecciona un subconjunto de paradas y un orden de visita que maximiza el beneficio acumulado respetando la viabilidad fisica y temporal.

### 1.2 Formulacion Matematica
* **Conjunto de vertices**: $V = \{0, 1, \dots, n\}$, donde $0$ y $n$ representan el inicio y fin de la ruta.
* **Variables de decision**:
  * $x_{ij} \in \{0, 1\}$: toma valor 1 si el visitante se traslada directamente del nodo $i$ al nodo $j$, y 0 en caso contrario.
  * $y_i \in \{0, 1\}$: toma valor 1 si el nodo $i$ es visitado, y 0 en caso contrario.
  * $t_i \ge 0$: tiempo de llegada al vertice $i$.
* **Parametros**:
  * $S_i$: puntaje de utilidad asignado al nodo $i$ ($S_0 = S_n = 0$).
  * $t_{ij}$: tiempo de traslado entre $i$ y $j$, calculado sobre el grafo de aceras filtrado por transitabilidad del perfil.
  * $d_i$: tiempo de estancia o visita en el nodo $i$.
  * $[e_i, l_i]$: ventana de tiempo de apertura y cierre del nodo $i$.
  * $T_{\max}$: tiempo maximo total autorizado para el itinerario.

$$\max \sum_{i \in V \setminus \{0, n\}} S_i \cdot y_i$$

Sujeto a:
$$\sum_{j \in V, j \neq 0} x_{0j} = 1, \quad \sum_{i \in V, i \neq n} x_{in} = 1$$
$$\sum_{i \in V, i \neq k} x_{ik} = y_k = \sum_{j \in V, j \neq k} x_{kj}, \quad \forall k \in V \setminus \{0, n\}$$
$$t_i + d_i + t_{ij} - M(1 - x_{ij}) \le t_j, \quad \forall i, j \in V, j \neq 0$$
$$e_i \le t_i \le l_i, \quad \forall i \in V$$
$$t_n \le T_{\max}$$
$$\sum_{i \in Z_k} y_i \le C_k, \quad \forall \text{zona } k$$

Donde $C_k$ representa el cupo maximo de paradas permitido en la zona urbana $k$.

---

## 2. Descomposicion del Puntaje de Parada $S_i$

El puntaje individual $S_i$ de un candidato $i \in V$ se define de forma transparente mediante la suma ponderada:

$$S_i = w_{\text{interes}} \cdot \text{SimInteres}(i, U) + w_{\text{presupuesto}} \cdot \text{AjustePresupuesto}(i, B) + w_{\text{dispersion}} \cdot \text{BonoDispersion}(Z_i) + w_{\text{local}} \cdot \text{BonoLocal}(i)$$

### Componentes:
1. **Similitud de Intereses ($\text{SimInteres}(i, U) \in [0, 1]$)**:
   * *Modo con conexion*: Similitud coseno entre el embedding del texto libre generado por el servicio de recomendacion (`paraphrase-multilingual-MiniLM-L12-v2`) y el embedding del lugar $i$.
   * *Modo sin conexion*: Concordancia binaria o fraccional basada en la seleccion de chips de interes y coincidencia de palabras clave normalizadas en categorias y descripcion.
2. **Ajuste de Presupuesto ($\text{AjustePresupuesto}(i, B) \in [0, 1]$)**:
   * 1.0 si el costo de entrada es gratuito o menor/igual al presupuesto por parada asignable.
   * Penalizacion progresiva decreciente si excede el rango seleccionado.
3. **Bono de Dispersion Zonal ($\text{BonoDispersion}(Z_i) \in [0, 1]$)**:
   * Cuantifica la subexposicion turistica de la zona $Z_i$ (ejemplo: Analco, El Alto, La Luz, Xanenetla frente al Zocalo). Favorece paradas fuera del nucleo saturado cuando el usuario elige balance hacia lo local.
4. **Bono por Negocio Pequeno y Local ($\text{BonoLocal}(i) \in \{0, 1\}$)**:
   * 1.0 si la unidad economica esta registrada en DENUE con estrato de 0 a 10 empleados y categoria tradicional local; 0.0 para cadenas o equipamientos masivos.

> [!NOTE]
> Todos los coeficientes $w$ provienen de la configuracion central (`config/choice_model_weights.json`) o del modelo de eleccion calibrado, y estan explícitamente sujetos a calibracion tras las pruebas de campo.

---

## 3. Modelo de Eleccion Discreta

### 3.1 Estructura
Para calibrar la disposicion a elegir una ruta $A$ frente a una ruta alternativa $B$, se implementa una regresion logistica binaria sobre la diferencia de vectores de atributos:

$$P(\text{Elige } A \mid A, B) = \frac{1}{1 + e^{-(\beta \cdot (X_A - X_B))}}$$

Donde el vector de atributos de una ruta incluye:
* $\Delta \text{TiempoCaminado}$: diferencia en minutos de traslado.
* $\Delta \text{CostoTotal}$: diferencia en costo monetario acumulado.
* $\Delta \text{PctVerificado}$: diferencia en porcentaje de tramos con auditoria de alta confianza.
* $\Delta \text{PctLocal}$: diferencia en proporcion de paradas en negocios locales.
* $\Delta \text{PctPeriferia}$: diferencia en proporcion de paradas fuera del nucleo zocalo.

### 3.2 Metodo de Estimacion
* Ajuste por maxima verosimilitud a partir de las tareas de eleccion binaria de las entrevistas en campo.
* Calculo de intervalos de confianza del 95% para cada $\beta_k$ mediante remuestreo con reemplazo (bootstrap, $B = 1000$ iteraciones).

---

## 4. Limitaciones Tecnicas, Supuestos y Uso Responsable

1. **Naturaleza orientativa**: El sistema genera recomendaciones analiticas con fines informativos. No sustituye la inspeccion fisica directa ni garantiza la ausencia de obstaculos circunstanciales (como obras no programadas o vehiculos estacionados indebidamente sobre acera).
2. **Separacion estricta**: Los modelos de lenguaje nunca participan en la resolucion del grafo, en el filtrado de tramos accesibles ni en la asignacion de paradas. Su rol se limita opcionalmente al pulido estilistico de explicaciones generadas por plantillas deterministas.
3. **Ajustabilidad declarada**: Ningun parametro se asume invariable. Los umbrales de transitabilidad funcional y los coeficientes de utilidad estan marcados como calibrables tras la recoleccion de datos empíricos de campo.
