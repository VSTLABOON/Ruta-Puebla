"""
Script de enriquecimiento cultural de POIs para Ruta Abierta Puebla.
Inserta secretos culturales estilo Pokemon GO, figuras historicas,
testimonios de visitantes y perfiles de artesanos tradicionales en data/raw/pois_curated.json.
"""

import json
import os

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    raw_path = os.path.join(root_dir, "data", "raw", "pois_curated.json")

    with open(raw_path, "r", encoding="utf-8") as f:
        pois = json.load(f)

    enrichments = {
        "poi_catedral": {
            "secret_to_unlock": {
                "titulo": "La Campana Maria y los Angeles",
                "descripcion": "Una campana de 8 toneladas que, segun la cronica popular del siglo XVII, fue izada al campanario norte por una cuadrilla de angeles durante la madrugada.",
                "pista": "Observa la torre norte de la Catedral, la mas alta de Mexico con mas de 69 metros.",
                "insignia_nombre": "Custodio Angelopolitano"
            },
            "historical_figures": [
                {
                    "nombre": "Juan de Palafox y Mendoza",
                    "rol": "Obispo de Puebla y Virrey de la Nueva Espana",
                    "epoca": "1649",
                    "relato": "Consagro solemnemente la Catedral el 18 de abril de 1649 tras casi un siglo de obras inconclusas, aportando su patrimonio personal para concluirla."
                },
                {
                    "nombre": "Manuel Tolsa",
                    "rol": "Arquitecto y escultor neoclasico",
                    "epoca": "1797",
                    "relato": "Diseno el cipres del Altar de los Reyes utilizando marmol de Tecali y bronces dorados al fuego."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_cat_01",
                    "autor": "Elena R.",
                    "procedencia": "Puebla Capital",
                    "fecha": "2026-09-12",
                    "testimonio": "El acceso por la rampa sur sobre 16 de Septiembre es completamente plano y el atrio tiene lajas niveladas.",
                    "perfil": "silla_de_ruedas"
                },
                {
                    "id": "mem_cat_02",
                    "autor": "Carlos M.",
                    "procedencia": "Guadalajara",
                    "fecha": "2026-10-02",
                    "testimonio": "Escuchar el repique de las campanas a mediodia frente al zocalo es un momento inolvidable.",
                    "perfil": "sin_restriccion"
                }
            ]
        },
        "poi_palafoxiana": {
            "secret_to_unlock": {
                "titulo": "El Atril Giratorio del Siglo XVIII",
                "descripcion": "Una rueda de lectura novohispana de cedro y ayacahuite que permitia al lector consultar hasta 8 infolios simultaneamente sin cerrar ninguno.",
                "pista": "Busca el atril giratorio en el corredor central de la biblioteca.",
                "insignia_nombre": "Bibliófilo Virreinal"
            },
            "historical_figures": [
                {
                    "nombre": "Juan de Palafox y Mendoza",
                    "rol": "Fundador y donante episcopal",
                    "epoca": "1646",
                    "relato": "Dono sus 5,000 libros personales con la instruccion expresa de que fuera abierta para todo aquel que supiese leer."
                },
                {
                    "nombre": "Francisco Fabian y Fuero",
                    "rol": "Obispo ilustrado",
                    "epoca": "1773",
                    "relato": "Mando erigir los tres niveles de estanteria dorada y el retablo de la Virgen de Trapani."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_pal_01",
                    "autor": "Dra. Teresa V.",
                    "procedencia": "Investigadora BUAP",
                    "fecha": "2026-09-28",
                    "testimonio": "El aroma a papel antiguo y madera de cedro se conserva intacto. Cuenta con rampa de acceso desde el patio central de Casa de la Cultura.",
                    "perfil": "movilidad_reducida"
                }
            ]
        },
        "poi_amparo": {
            "secret_to_unlock": {
                "titulo": "La Terraza Panoramica de las Cupulas",
                "descripcion": "Un mirador elevado con vista de 360 grados que alinea las cupulas coloniales de azulejos con la silueta de los volcanes.",
                "pista": "Toma el elevador accesible hasta el mirador en la azotea del museo.",
                "insignia_nombre": "Vigía de San Pedro"
            },
            "historical_figures": [
                {
                    "nombre": "Manuel Espinosa Yglesias",
                    "rol": "Fundador del museo",
                    "epoca": "1991",
                    "relato": "Creo el museo en honor a su esposa Amparo Rugarcia, reintegrando antiguas casonas virreinales del Hospital de San Juan de Letran."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_amp_01",
                    "autor": "Andres S.",
                    "procedencia": "Turista CDMX",
                    "fecha": "2026-10-01",
                    "testimonio": "Excelente accesibilidad para carriolas y sillas de ruedas; elevadores amplios en todas las salas.",
                    "perfil": "movilidad_reducida"
                }
            ]
        },
        "poi_capilla_rosario": {
            "secret_to_unlock": {
                "titulo": "Sirenas y Flores Novohispanas en Oro",
                "descripcion": "Entre las yeserias estucadas en lamina de oro de 24 quilates, alfareros y yeseros indigenas plasmaron sirenas y flores de cempasuchil integradas en las alegorias cristianas.",
                "pista": "Observa con atencion el friso dorado sobre el zocalo de talavera.",
                "insignia_nombre": "Buscador de la Octava Maravilla"
            },
            "historical_figures": [
                {
                    "nombre": "Fray Diego de Gorozpe",
                    "rol": "Cronista de la orden de Santo Domingo",
                    "epoca": "1690",
                    "relato": "La bautizo como la Octava Maravilla del Mundo durante su dedicacion festiva de ocho dias."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_ros_01",
                    "autor": "Guillermo P.",
                    "procedencia": "Visitante internacional",
                    "fecha": "2026-09-18",
                    "testimonio": "El resplandor dorado es inigualable en todo el continente americano.",
                    "perfil": "sin_restriccion"
                }
            ]
        },
        "poi_sapo_antiguedades": {
            "secret_to_unlock": {
                "titulo": "El Desbordamiento y la Plazuela de Ranas",
                "descripcion": "El callejon se anegaba con las crecidas del rio San Francisco y proliferaban miles de anfibios. Los anticuarios abrieron sus locales aqui a mediados del siglo XX rescatando herrajes del barroco.",
                "pista": "Localiza la fuente de cantera con el sapo tallado en el centro de la plazuela.",
                "insignia_nombre": "Anticuario de Los Sapos"
            },
            "artisan_profile": {
                "nombre_taller": "Antiguedades y Restauracion Virreinal Los Sapos",
                "maestro_artesano": "Don Agustin Morales",
                "oficio": "Restaurador de muebles y anticuario tradicional",
                "fundacion_anio": 1968,
                "demostracion_en_vivo": "Pulido con cera de abeja natural y recuperacion de herrajes coloniales en forja",
                "horario_demostracion": "Sabados y Domingos 12:00 a 14:00",
                "tecnica_ancestral": "Restauracion tradicional en madera de cedro y nogal novohispano",
                "sello_artesanal": "Sello Los Sapos 1968"
            },
            "historical_figures": [
                {
                    "nombre": "Arrieros del Camino Real",
                    "rol": "Comerciantes virreinales",
                    "epoca": "Siglo XVIII",
                    "relato": "Hospedaban sus mulas en las posadas del barrio antes de continuar hacia Veracruz."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_sap_01",
                    "autor": "Leticia H.",
                    "procedencia": "Turista",
                    "fecha": "2026-10-04",
                    "testimonio": "Un rincon colorido lleno de historia; las cafeterias tienen mesas al aire libre muy acogedoras.",
                    "perfil": "sin_restriccion"
                }
            ]
        },
        "poi_parque_analco": {
            "secret_to_unlock": {
                "titulo": "El Peaje del Puente de Ovando",
                "descripcion": "Para cruzar del barrio indigena de Analco a la ciudad virreinal, la familia Ovando erigio un puente con arco de cantera cobrando peaje a los transeuntes.",
                "pista": "Camina hacia el arco del Puente de Ovando en la esquina poniente del jardin.",
                "insignia_nombre": "Caminante de Analco"
            },
            "historical_figures": [
                {
                    "nombre": "Tlaxcaltecas Fundadores de Analco",
                    "rol": "Comunidad indigena constructora",
                    "epoca": "1531",
                    "relato": "Cruzo diariamente el rio para labrar la cantera y edificar la traza de la Puebla colonial."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_ana_01",
                    "autor": "Dona Lupe",
                    "procedencia": "Artesana local",
                    "fecha": "2026-10-05",
                    "testimonio": "Llevo 42 anos vendiendo camotes y borrachitos en Analco; aqui el dulce poblano se elabora en cazo de cobre.",
                    "perfil": "sin_restriccion"
                }
            ]
        },
        "poi_templo_analco": {
            "secret_to_unlock": {
                "titulo": "El Angel Custodio y la Epidemia de 1640",
                "descripcion": "La parroquia resguarda la escultura del Angel Custodio, nombrado protector del barrio tras las inundaciones y epidemias virreinales.",
                "pista": "Observa el nicho central del altar de piedra.",
                "insignia_nombre": "Protector del Barrio"
            },
            "historical_figures": [
                {
                    "nombre": "Gremio de Panaderos de Analco",
                    "rol": "Hermandad barrial",
                    "epoca": "Siglo XVII",
                    "relato": "Mantuvo la custodia de la capilla y sus campanas con limosnas de las panaderias de trigo."
                }
            ]
        },
        "poi_taller_talavera_analco": {
            "secret_to_unlock": {
                "titulo": "La Firma Secreta del Maestro Locero",
                "descripcion": "Desde las ordenanzas virreinales de 1653, cada pieza autentica debe llevar la firma del maestro alfarero pintada a mano con oxido de cobalto en la base cruda.",
                "pista": "Pide al maestro artesano que te muestre la base sin vidriar de una pieza en reposo.",
                "insignia_nombre": "Maestro de la Talavera"
            },
            "artisan_profile": {
                "nombre_taller": "Taller Familiar de Talavera Analco Tradicional",
                "maestro_artesano": "Maestro Gilberto Salazar",
                "oficio": "Maestro Locero de Talavera Certificada",
                "fundacion_anio": 1924,
                "demostracion_en_vivo": "Modelado en torno de pie y estarcido con carbon vegetal sobre esmalte crudo",
                "horario_demostracion": "Lunes a Viernes 11:30 y 16:00",
                "tecnica_ancestral": "Doble horneado a 1,050 °C y uso exclusivo de oxidos minerales naturales",
                "sello_artesanal": "Talavera Analco D.O. 1924"
            },
            "historical_figures": [
                {
                    "nombre": "Diego Gaytan",
                    "rol": "Alcalde del gremio de loceros",
                    "epoca": "1653",
                    "relato": "Promulgo las primeras normas de calidad para distinguir la talavera fina de la loza corriente."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_tal_01",
                    "autor": "Mariana G.",
                    "procedencia": "Puebla",
                    "fecha": "2026-09-30",
                    "testimonio": "Ver al maestro pintar a pulso las lineas finas de cobalto sin equivocarse demuestra decadas de maestria.",
                    "perfil": "sin_restriccion"
                }
            ]
        },
        "poi_horno_la_luz": {
            "secret_to_unlock": {
                "titulo": "El Fuego Ininterrumpido de 250 Anos",
                "descripcion": "Los hornos arabes de tiro subterraneo de La Luz se calientan con lena de encino y tardan 36 horas continuas en alcanzar el punto de fusion del barro colorado vidriado.",
                "pista": "Observa el arco de ladrillo refractario y la boveda subterranea en el callejon.",
                "insignia_nombre": "Guardián del Barro Rojo"
            },
            "artisan_profile": {
                "nombre_taller": "Alfareria Tradicional de Hornos Arabes de La Luz",
                "maestro_artesano": "Maestro Mateo Cortes",
                "oficio": "Alfarero tradicional de cazuelas de barro vidriado",
                "fundacion_anio": 1785,
                "demostracion_en_vivo": "Torneado a mano de cazuelas moleras y preparacion del barro en pila de decantacion",
                "horario_demostracion": "Diario 10:30 a 13:00",
                "tecnica_ancestral": "Horno de lena de tipologia arabe con camara subterranea y vidriado libre de plomo",
                "sello_artesanal": "Alfareria La Luz - Siglo XVIII"
            },
            "historical_figures": [
                {
                    "nombre": "Familias Alfareras de La Luz",
                    "rol": "Artesanos del barro novohispano",
                    "epoca": "Siglo XVIII",
                    "relato": "Establecieron sus hornos en la orilla del rio San Francisco para aprovechar los depositos arcillosos."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_luz_01",
                    "autor": "Dr. Fernando B.",
                    "procedencia": "Oaxaca",
                    "fecha": "2026-10-06",
                    "testimonio": "Es el ultimo conjunto de hornos arabes activos en Mexico. Un patrimonio vivo que no debe perderse.",
                    "perfil": "sin_restriccion"
                }
            ]
        },
        "poi_templo_la_luz": {
            "secret_to_unlock": {
                "titulo": "La Fachada de Petatillo Donada por Alfareros",
                "descripcion": "Los propios alfareros de La Luz decoraron el frontispicio de su templo con azulejos rojos y amarillos simulando un petate de barro tejido.",
                "pista": "Examina la pared lateral sobre la calle Juan de Palafox y Mendoza.",
                "insignia_nombre": "Devoto de La Luz"
            }
        },
        "poi_mercado_el_alto": {
            "secret_to_unlock": {
                "titulo": "El Secreto del Papaloquelite en la Cemita",
                "descripcion": "La cemita original de El Alto nunca se calienta: el pan crujiente de piso se sirve a temperatura ambiente con milanesa fresca, quesillo deshebrado y hojas de papalo recien cortadas.",
                "pista": "Pasa por el pasillo central del mercado donde tocan las cuadrillas de mariachis.",
                "insignia_nombre": "Cemita Master de El Alto"
            },
            "artisan_profile": {
                "nombre_taller": "Cocina Tradicional y Cemitas Dona Chelo",
                "maestro_artesano": "Cocinera Tradicional Consuelo Morales",
                "oficio": "Cocinera tradicional de antojitos y mole poblano",
                "fundacion_anio": 1952,
                "demostracion_en_vivo": "Molienda de cuatro chiles secos en metate de piedra volcanica para mole poblano",
                "horario_demostracion": "Diario 12:00 a 17:00",
                "tecnica_ancestral": "Coccion lenta en cazuela de barro de La Luz con manteca de cerdo y chocolate de tablilla",
                "sello_artesanal": "Cocina Tipica El Alto 1952"
            },
            "historical_figures": [
                {
                    "nombre": "Fray Toribio de Benavente 'Motolinia'",
                    "rol": "Misionero y cronista franciscano",
                    "epoca": "1531",
                    "relato": "Celebro la primera misa de fundacion de la Puebla de los Angeles en las colinas de El Alto."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_alt_01",
                    "autor": "Ramon J.",
                    "procedencia": "Puebla",
                    "fecha": "2026-10-08",
                    "testimonio": "El mercado tiene piso parejo y rampa de acceso; se puede comer una autentica cemita poblana con musica de mariachi en vivo.",
                    "perfil": "movilidad_reducida"
                }
            ]
        },
        "poi_casa_aguada": {
            "secret_to_unlock": {
                "titulo": "El Manantial que Surtia al Convento",
                "descripcion": "Bajo las losas de piedra de los lavaderos fluye agua de manantial cristalina que surtio al huerto de los franciscanos desde el siglo XVI.",
                "pista": "Observa el canal de silleria que desemboca en la alberca de reposo.",
                "insignia_nombre": "Aguador de Almoloya"
            },
            "historical_figures": [
                {
                    "nombre": "Lavanderas de Almoloya",
                    "rol": "Gremio vecinal femenino",
                    "epoca": "Siglo XIX",
                    "relato": "Utilizaban las 36 piletas de piedra como espacio de ayuda mutua e intercambio de cantos populares."
                }
            ]
        },
        "poi_ciudad_mural": {
            "secret_to_unlock": {
                "titulo": "El Ladrillo de 1890 Oculto en el Muro",
                "descripcion": "En uno de los 70 murales comunitarios se incrusto un ladrillo rojo original cocido en los hornos antiguos de Xanenetla en el siglo XIX.",
                "pista": "Inspecciona el mural del aguila de fuego sobre la Calle 4 Norte.",
                "insignia_nombre": "Explorador de Xanenetla"
            },
            "artisan_profile": {
                "nombre_taller": "Colectivo Comunitario Muralistas de Xanenetla",
                "maestro_artesano": "Muralista Raul Dominguez",
                "oficio": "Artista visual y cronista comunitario",
                "fundacion_anio": 2011,
                "demostracion_en_vivo": "Tecnicas de estencil y muralismo con pigmentos minerales sobre adobe colonial",
                "horario_demostracion": "Sabados 11:00 a 13:00",
                "tecnica_ancestral": "Integracion de relatos orales de las familias del callejon en murales a gran escala",
                "sello_artesanal": "Xanenetla Ciudad Mural 2011"
            },
            "historical_figures": [
                {
                    "nombre": "Familias Ladrilleras de Xanenetla",
                    "rol": "Pobladores fundadores del callejon",
                    "epoca": "Siglo XIX",
                    "relato": "Hornearon millones de ladrillos rojos y losetas con los que se edificaron los claustros y casonas del centro."
                }
            ],
            "community_memories": [
                {
                    "id": "mem_xan_01",
                    "autor": "Valeria N.",
                    "procedencia": "Turista",
                    "fecha": "2026-10-09",
                    "testimonio": "Caminar entre las calles empedradas descubriendo murales en cada esquina es una experiencia visual hermosa.",
                    "perfil": "sin_restriccion"
                }
            ]
        },
        "poi_antojeria_xanenetla": {
            "secret_to_unlock": {
                "titulo": "La Chalupa Frita en Manteca Criolla",
                "descripcion": "Las chalupas se crearon como comida rapida para los horneros de ladrillo: tortilla delgada frita en manteca con salsa verde o roja y hebras de carne deshebrada.",
                "pista": "Observa el comal de barro concavo y el borboteo de la manteca.",
                "insignia_nombre": "Gourmet de Callejón"
            },
            "artisan_profile": {
                "nombre_taller": "Antojeria Tradicional Las Cazuelas de Xanenetla",
                "maestro_artesano": "Dona Beatriz Perez",
                "oficio": "Cocinera tradicional de chalupas y molotes",
                "fundacion_anio": 1974,
                "demostracion_en_vivo": "Elaboracion de chalupas al momento con masa de maiz nixtamalizado criollo",
                "horario_demostracion": "Viernes a Domingo 13:00 a 19:00",
                "tecnica_ancestral": "Salsa cocida en molcajete de piedra y fritura rapida en manteca sobre comal caliente",
                "sello_artesanal": "Chalupas Xanenetla 1974"
            }
        }
    }

    # Aplicar enriquecimiento a los POIs
    for p in pois:
        pid = p["id"]
        if pid in enrichments:
            enr = enrichments[pid]
            if "secret_to_unlock" in enr:
                p["secret_to_unlock"] = enr["secret_to_unlock"]
            if "historical_figures" in enr:
                p["historical_figures"] = enr["historical_figures"]
            if "community_memories" in enr:
                p["community_memories"] = enr["community_memories"]
            if "artisan_profile" in enr:
                p["artisan_profile"] = enr["artisan_profile"]

    # Guardar en data/raw/pois_curated.json
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(pois, f, indent=2, ensure_ascii=False)

    print(f"POIs enriquecidos exitosamente en {raw_path}")

if __name__ == "__main__":
    main()
