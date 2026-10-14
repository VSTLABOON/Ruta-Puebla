# Inventario de Fuentes de Datos: Ruta Abierta Puebla

Este documento registra las fuentes de datos utilizadas por la plataforma Ruta Abierta Puebla, detallando procedencia, fecha de corte, regimen de licenciamiento, transformaciones aplicadas y limitaciones conocidas.

---

## 1. Directorio Nacional de Unidades Economicas (DENUE) - INEGI

* **Entidad emisora**: Instituto Nacional de Estadistica y Geografia (INEGI), Mexico.
* **Fecha de corte de los datos**: Descarga API / extraccion censal correspondiente a la edicion vigente del estado de Puebla (municipio de Puebla, cve_mun: 21114).
* **Licencia y terminos de uso**: Informacion de uso publico de caracter oficial conforme a la Ley del Sistema Nacional de Informacion Estadistica y Geografica (LSNIEG). Libre consulta y reutilizacion no comercial y comercial con atribucion a INEGI.
* **Proposito en el sistema**:
  * Identificacion de establecimientos comerciales y de servicios en el poligono piloto.
  * Clasificacion de tamano de unidad economica por estrato de personal ocupado (estratos de 0 a 5 y 6 a 10 personas) para asignar el bono por pequeno negocio local.
  * Estimacion de oferta agregada por celda espacial para el calculo del bono de dispersion zonal.
* **Transformaciones aplicadas**:
  * Filtrado espacial al cuadrante del Centro Historico de Puebla y barrios adyacentes (Analco, El Alto, La Luz, Xanenetla).
  * Filtrado por actividad economica relevante a la experiencia peatonal y turistica (alimentos y bebidas, artesanias, librerias, museos y galerias, cafeterias).
  * Normalizacion de nombres y ubicaciones geograficas a coordenadas WGS84 (EPSG:4326).
* **Limitaciones conocidas**:
  * Desactualizacion temporal natural entre aperturas/cierres reales y el censo DENUE.
  * Posible imprecision en geocodificacion cuando el registro solo cuenta con domicilio textual sin coordenadas validadas en sitio.

---

## 2. Red Vial y Peatonal de OpenStreetMap (OSM)

* **Entidad emisora**: Comunidad y colaboradores de OpenStreetMap.
* **Mecanismo de extraccion**: Overpass API / OSMnx para el poligono delimitado de la zona piloto.
* **Licencia y terminos de uso**: Open Database License (ODbL) 1.0. Atribucion obligatoria: "(c) Colaboradores de OpenStreetMap".
* **Proposito en el sistema**:
  * Base geometrica y topologica para construir la red de calles y el grafo peatonal de aceras.
  * Atributos de cruces peatonales (`highway=crossing`, `crossing=*`), semaforos y banquetas asociadas.
* **Transformaciones aplicadas**:
  * Desdoblamiento de los ejes centrales de calle (`highway=*`) en un grafo de doble acera con aristas direccionales a izquierda y derecha del arroyo vehicular, separadas por el ancho estimado de la via.
  * Generacion de aristas de cruce transversal formal e informal en los nodos de esquina.
  * Asociacion de atributos iniciales de accesibilidad cuando estan disponibles (`wheelchair=*`, `surface=*`, `kerb=*`, `tactile_paving=*`).
* **Limitaciones conocidas**:
  * Cobertura micromapeada heterogenea en banquetas: la mayoria de las vias coloniales solo cuentan con el trazo del eje central de la calle sin detalle de anchura o tipo de rampa en esquina.
  * Requiere suplementacion directa mediante la auditoria de campo para alcanzar niveles de confianza altos.

---

## 3. Catalogo Curado de Atractivos Culturales y Puntos de Interes (POIs)

* **Entidad emisora**: Curaduria tecnica a partir de catalogos oficiales del Instituto Municipal de Arte y Cultura de Puebla (IMACP), Secretaria de Economia y Turismo del Municipio de Puebla, e inventarios patrimoniales publicos.
* **Fecha de corte**: Octubre 2026.
* **Licencia**: Datos factuales de dominio publico e integracion curada bajo terminos de uso no comercial con atribucion.
* **Proposito en el sistema**:
  * Definicion del conjunto de nodos candidatos de visita $V$ para el problema OPTW.
  * Registro de atributos operativos: nombre oficial, categorias tematicas, coordenadas de acceso peatonal, horarios de apertura y cierre por dia, costo de entrada, tiempo estimado de visita y facilidades fisicas preliminares (escalones de acceso, banos accesibles).
* **Transformaciones aplicadas**:
  * Asignacion a zonas especificas: Centro Nucleo (Zocalo, Catedral, Palafoxiana) vs. Barrios Perifericos (Barrio del Artista, El Parian, Analco, La Luz, El Alto, Xanenetla).
  * Limpieza y verificacion de coordenadas de acceso exacto a nivel de banqueta.
* **Limitaciones conocidas**:
  * Horarios sujetos a variaciones por festividades o mantenimiento patrimonial.

---

## 4. Auditoria de Accesibilidad Peatonal de Campo

* **Entidad emisora**: Levantamiento directo en campo por brigadas de auditoria en el poligono piloto.
* **Fecha de corte**: Octubre 2026 (datos de referencia de campo).
* **Licencia**: Conjunto de datos propio publicado bajo licencia abierta Creative Commons Attribution 4.0 International (CC BY 4.0).
* **Proposito en el sistema**:
  * Asignacion de valores reales medidos a los tramos de banqueta y cruces:
    * Ancho libre efectivo de paso (metros continuos sin obstruccion).
    * Pendiente longitudinal real (porcentaje o grados medidos).
    * Tipo y estado de superficie (laja colonial regular, empedrado desprendido, concreto nivelado).
    * Existencia y estado de rampa en extremos del tramo (con o sin rebaje, pendiente de rampa).
    * Obstaculos fisicos (postes, puestos fijos, escalones aislados, alcorques sin rejilla).
  * Calculo del indice de confianza del tramo ($C_e$) a partir de concordancia entre observadores y fecha de observacion.
* **Transformaciones aplicadas**:
  * Calculo de concordancia Kappa de Cohen entre auditores asignados al mismo tramo.
  * Agregacion de atributos al identificador unico del tramo de acera.
* **Limitaciones conocidas**:
  * Cobertura parcial: no todos los tramos de la zona piloto cuentan con auditoria completada a la fecha de corte; los no auditados reciben una confianza estimada baja.

---

## 5. Entrevistas Estructuradas de Visitantes y Preferencias Declaradas

* **Entidad emisora**: Levantamiento directo anonimo en campo a visitantes del Centro Historico.
* **Fecha de corte**: Octubre 2026.
* **Licencia**: Datos anonimizados para investigacion cientifica y reproduccion tecnica bajo licencia CC BY 4.0.
* **Proposito en el sistema**:
  * Calibracion econometrica del modelo de eleccion discreta (regresion logistica binaria sobre comparaciones de pares de rutas A/B).
  * Determinacion de las ponderaciones relativas de tiempo caminado, costo, interes tematico, dispersion y confianza de accesibilidad.
* **Transformaciones aplicadas**:
  * Anonimizacion total: no se capturan datos personales, identificadores unicos ni direcciones IP.
  * Codificacion de variables de eleccion a matriz de diferencias relativas de atributos.
* **Limitaciones conocidas**:
  * Muestra limitada al tamano del estudio piloto; los coeficientes deben tratarse como preliminares y ajustables tras fases de validacion extendidas.
