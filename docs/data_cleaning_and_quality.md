# Protocolo de Limpieza, Purga y Calidad de Datos: DENUE INEGI 2026

Documento metodológico que justifica ante el jurado evaluador de Tech-Capital 2026 el embudo cuantitativo de filtrado (*Data Funnel*) de unidades económicas del Centro Histórico y barrios tradicionales de Puebla.

## 1. Embudo Cuantitativo de Selección (*Data Funnel*)

| Etapa | Nombre del Filtro | Descripción del Criterio | Unidades Resultantes | % del Universo |
| :---: | :--- | :--- | :---: | :---: |
| 1 | Universo Total Estatal | Total de unidades economicas en el archivo censal del Estado de Puebla | 410,693 | 100.0% |
| 2 | Municipio de Puebla | Filtrado por clave municipal cve_mun == '114' (Puebla Capital) | 107,087 | 26.07% |
| 3 | Delimitacion Espacial Piloto | Bounding Box del Centro Historico y barrios Analco, La Luz, El Alto y Xanenetla | 4,456 | 1.08% |
| 4 | Pertinencia Turistico-Cultural | Codigos SCIAN de artesanias, loza de barro, talavera, gastronomia tradicional, dulces tipicos, libros y museos | 742 | 0.18% |
| 5 | Escala Micro y Negocio Local | Unidades de 0 a 5 y 6 a 10 empleados (excluyendo franquicias y corporativos masivos) | 676 | 0.16% |
| 6 | Depuracion de Cadenas Comerciales | Exclusion por palabras clave corporativas (OXXO, Farmacias del Ahorro, etc.) | 676 | 0.16% |

## 2. Desglose de Giros Artesanales y Gastronómicos Retenidos

| Actividad Económica (SCIAN) | Unidades Retenidas |
| :--- | :---: |
| Comercio al por menor en tiendas de artesanías | 183 |
| Restaurantes con servicio de preparación de alimentos a la carta o de comida corrida | 98 |
| Comercio al por menor de dulces y materias primas para repostería | 75 |
| Restaurantes con servicio de preparación de tacos y tortas | 74 |
| Cafeterías, fuentes de sodas, neverías, refresquerías y similares | 73 |
| Restaurantes con servicio de preparación de antojitos | 60 |
| Comercio al por menor de artículos usados | 38 |
| Artistas, escritores y técnicos independientes | 25 |
| Comercio al por menor de libros | 15 |
| Panificación tradicional | 14 |
| Museos del sector público | 13 |
| Comercio al por menor de cristalería, loza y utensilios de cocina | 8 |

## 3. Distribución Geográfica en el Polígono Piloto

| Zona Territorial | Unidades Filtradas |
| :--- | :---: |
| zocalo_centro_nucleo | 236 |
| barrio_el_alto | 14 |
| barrio_analco | 389 |
| barrio_la_luz | 34 |
| barrio_xanenetla | 3 |

## 4. Respuestas Clave para la Defensa ante el Jurado

1. **¿Por qué se descartó el 98.7% de los datos del DENUE estatal?**
   Porque el censo del Estado de Puebla contiene 410,693 registros de todos los municipios y giros (desde maquiladoras industriales en Tehuacán hasta agroindustria en Tepeaca). El proyecto delimitó el polígono estrictamente al Centro Histórico y barrios de tradición artesanal (4,456 unidades en BBOX).

2. **¿Cómo se evitó favorecer a franquicias multinacionales?**
   Se aplicó un doble candado: primero, filtrando exclusivamente unidades de 0 a 5 y 6 a 10 empleados; segundo, mediante un diccionario de exclusión de cadenas corporativas (OXXO, cadenas de comida rápida, farmacias corporativas), garantizando que la derrama económica se dirija a talleres familiares auténticos.

3. **¿Cómo se resolvió el desajuste de acceso vehicular vs peatonal?**
   Las coordenadas originales del DENUE suelen situarse en el centroide del predio o en el arroyo vehicular. El pipeline realiza un *snapping* ortogonal al segmento de acera peatonal transitable más próximo, asegurando que el cálculo de distancia y accesibilidad en silla de ruedas mida el acceso real a nivel de banqueta.
