import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Segment, POI, RouteAlternative, MobilityProfile } from '@ruta-abierta/shared-types';
import {
  ShieldCheck,
  AlertTriangle,
  Layers,
  Maximize2,
  Box,
  Compass
} from 'lucide-react';

interface MapViewerProps {
  segments: Segment[];
  pois: POI[];
  selectedRoute: RouteAlternative | null;
  activeProfile: MobilityProfile;
  selectedStopPoiId: string | null;
  onSelectPoi: (poiId: string) => void;
  language: 'es' | 'en';
}

type MapStyleKey = 'voyager' | 'dark' | 'positron';

const MAP_STYLES: Record<MapStyleKey, { name: { es: string; en: string }; url: string; icon: string }> = {
  voyager: {
    name: { es: 'Turismo Voyager', en: 'Voyager Tourism' },
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    icon: '🎨'
  },
  dark: {
    name: { es: 'Noche Neón', en: 'Dark Neon' },
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    icon: '🌙'
  },
  positron: {
    name: { es: 'Luz Arquitectónica', en: 'Positron Clean' },
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    icon: '☀️'
  }
};

export const MapViewer: FC<MapViewerProps> = ({
  segments,
  pois,
  selectedRoute,
  activeProfile,
  selectedStopPoiId,
  onSelectPoi,
  language
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const [activeStyle, setActiveStyle] = useState<MapStyleKey>('voyager');
  const [is3D, setIs3D] = useState(true);
  const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLegend, setShowLegend] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );

  // Cálculo 100% dinámico del centro y límites espaciales (sin valores fijos o hardcodeados)
  const { dynamicCenter, dynamicBounds } = useMemo(() => {
    if (pois.length === 0 && segments.length === 0) {
      return {
        dynamicCenter: [-98.1965, 19.0435] as [number, number],
        dynamicBounds: undefined
      };
    }

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    pois.forEach((p) => {
      minLng = Math.min(minLng, p.coordinates[0]);
      maxLng = Math.max(maxLng, p.coordinates[0]);
      minLat = Math.min(minLat, p.coordinates[1]);
      maxLat = Math.max(maxLat, p.coordinates[1]);
    });

    segments.forEach((s) => {
      s.geometry.coordinates.forEach(([lng, lat]) => {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
    });

    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const pad = 0.025; // Margen dinámico elástico

    return {
      dynamicCenter: [centerLng, centerLat] as [number, number],
      dynamicBounds: [
        [minLng - pad, minLat - pad],
        [maxLng + pad, maxLat + pad]
      ] as [[number, number], [number, number]]
    };
  }, [pois, segments]);

  // Inicialización de MapLibre GL con soporte móvil táctil cooperativo
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[activeStyle].url,
      center: dynamicCenter,
      zoom: 15.3,
      pitch: 45, // Vista tridimensional en perspectiva
      bearing: -15,
      maxBounds: dynamicBounds,
      cooperativeGestures: true // Permite scroll suave con 1 dedo en celulares y navegación con 2 dedos
    });

    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
        showZoom: true
      }),
      'top-right'
    );

    map.on('load', () => {
      setIsLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [dynamicCenter, dynamicBounds]);

  // Cambio de estilo del mapa
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    mapRef.current.setStyle(MAP_STYLES[activeStyle].url);
  }, [activeStyle, isLoaded]);

  // Redimensionamiento responsivo al girar o cambiar de tamaño en móviles
  useEffect(() => {
    const handleResize = () => {
      mapRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Conversión dinámica de segmentos a GeoJSON
  const segmentsGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: segments.map((seg) => ({
        type: 'Feature',
        id: seg.id,
        properties: {
          id: seg.id,
          is_verified: seg.is_verified,
          transitable: seg.transitable[activeProfile],
          slope_pct: seg.slope_pct,
          width_m: seg.width_m,
          length_m: seg.length_m,
          surface: seg.surface,
          zone: seg.zone,
          confidence: seg.confidence
        },
        geometry: seg.geometry
      }))
    } as any;
  }, [segments, activeProfile]);

  // Geometría GeoJSON de la ruta activa calculada
  const routeGeoJSON = useMemo(() => {
    if (!selectedRoute) {
      return {
        type: 'FeatureCollection',
        features: []
      } as any;
    }

    let coordinates = selectedRoute.geometry?.coordinates;
    if (!coordinates || coordinates.length === 0) {
      const edgeMap = new Map(segments.map((s) => [s.id, s]));
      const coords: [number, number][] = [];
      for (const segId of selectedRoute.path_segments) {
        const seg = edgeMap.get(segId);
        if (seg && seg.geometry?.coordinates) {
          coords.push(...seg.geometry.coordinates);
        }
      }
      coordinates = coords;
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: selectedRoute.name,
            focus: selectedRoute.focus
          },
          geometry: {
            type: 'LineString',
            coordinates
          }
        }
      ]
    } as any;
  }, [selectedRoute, segments]);

  // Capas vectoriales en GPU
  const updateMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // 1. Capas de la red de aceras peatonales
    if (!map.getSource('sidewalk-segments')) {
      map.addSource('sidewalk-segments', {
        type: 'geojson',
        data: segmentsGeoJSON
      });

      // Tramos no transitables (barreras normativas)
      map.addLayer({
        id: 'sidewalk-barriers',
        type: 'line',
        source: 'sidewalk-segments',
        filter: ['!', ['get', 'transitable']],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#f43f5e',
          'line-width': 3.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.95
        }
      });

      // Tramos verificados transitables (alta confianza)
      map.addLayer({
        id: 'sidewalk-verified',
        type: 'line',
        source: 'sidewalk-segments',
        filter: ['all', ['get', 'is_verified'], ['get', 'transitable']],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#10b981',
          'line-width': 2.8,
          'line-opacity': 0.85
        }
      });

      // Tramos inferidos transitables
      map.addLayer({
        id: 'sidewalk-inferred',
        type: 'line',
        source: 'sidewalk-segments',
        filter: ['all', ['!', ['get', 'is_verified']], ['get', 'transitable']],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#94a3b8',
          'line-width': 2.0,
          'line-dasharray': [3, 3],
          'line-opacity': 0.7
        }
      });

      const handleSegmentHover = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (e.features && e.features[0]) {
          map.getCanvas().style.cursor = 'pointer';
          const props = e.features[0].properties;
          const found = segments.find((s) => s.id === props.id);
          if (found) setHoveredSegment(found);
        }
      };

      const handleSegmentLeave = () => {
        map.getCanvas().style.cursor = '';
        setHoveredSegment(null);
      };

      ['sidewalk-verified', 'sidewalk-barriers', 'sidewalk-inferred'].forEach((layerId) => {
        map.on('mouseenter', layerId, handleSegmentHover);
        map.on('mouseleave', layerId, handleSegmentLeave);
      });
    } else {
      const source = map.getSource('sidewalk-segments') as maplibregl.GeoJSONSource;
      source.setData(segmentsGeoJSON);
    }

    // 2. Capa de la ruta activa optimizada
    if (!map.getSource('active-route')) {
      map.addSource('active-route', {
        type: 'geojson',
        data: routeGeoJSON
      });

      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#fde68a',
          'line-width': 12,
          'line-blur': 4,
          'line-opacity': 0.4
        }
      });

      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#78350f',
          'line-width': 7.5,
          'line-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#fbbf24',
          'line-width': 4.5,
          'line-opacity': 1
        }
      });
    } else {
      const source = map.getSource('active-route') as maplibregl.GeoJSONSource;
      source.setData(routeGeoJSON);
    }
  }, [segments, segmentsGeoJSON, routeGeoJSON]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      updateMapLayers();
    } else {
      map.once('style.load', updateMapLayers);
    }
  }, [updateMapLayers, activeStyle]);

  // Renderizado dinámico de marcadores interactivos (adaptados a toques en pantallas móviles)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const stopsByPoiId = new Map(
      (selectedRoute?.stops || []).map((stop) => [stop.poi.id, stop])
    );

    // 1. Marcadores numerados de la ruta activa
    if (selectedRoute) {
      selectedRoute.stops.forEach((stop) => {
        const isSelected = stop.poi.id === selectedStopPoiId;
        const el = document.createElement('div');
        el.className = `flex items-center justify-center rounded-full font-black text-xs cursor-pointer shadow-xl transition-all duration-300 ${
          isSelected
            ? 'w-10 h-10 bg-amber-500 text-white border-2 border-white ring-4 ring-amber-400/50 animate-marker-pulse z-30'
            : 'w-8 h-8 bg-gradient-to-tr from-amber-600 to-amber-400 text-white border-2 border-white/90 hover:scale-125 z-20'
        }`;
        el.innerHTML = `<span>${stop.stop_order}</span>`;

        const handleClick = (e: Event) => {
          e.stopPropagation();
          onSelectPoi(stop.poi.id);

          if (popupRef.current) popupRef.current.remove();

          const popupContent = `
            <div class="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 min-w-[220px] max-w-xs shadow-2xl font-sans">
              <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Parada #${stop.stop_order} • ${stop.poi.zone.replace(/_/g, ' ')}
                </span>
              </div>
              <h4 class="font-bold text-sm text-slate-100 mt-1">${stop.poi.name}</h4>
              <p class="text-xs text-slate-400 mt-0.5 capitalize">${stop.poi.category}</p>
              ${
                stop.poi.is_local_business
                  ? '<div class="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800 text-[10px] font-semibold">🏺 Taller Tradicional / Local</div>'
                  : ''
              }
              <div class="mt-2 pt-2 border-t border-slate-800 text-[11px] text-emerald-400 flex items-center gap-1">
                ✓ ${stop.accessibility_notes[language]}
              </div>
            </div>
          `;

          const popup = new maplibregl.Popup({
            offset: 25,
            closeButton: false,
            className: 'custom-map-popup'
          })
            .setLngLat(stop.poi.coordinates)
            .setHTML(popupContent)
            .addTo(map);

          popupRef.current = popup;
        };

        el.addEventListener('click', handleClick);
        el.addEventListener('touchend', handleClick);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(stop.poi.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 2. Marcadores discretos de todos los POIs
    pois.forEach((poi) => {
      if (stopsByPoiId.has(poi.id)) return;

      const isSelected = poi.id === selectedStopPoiId;
      const el = document.createElement('div');
      el.className = `rounded-full cursor-pointer transition-transform duration-200 hover:scale-150 ${
        poi.is_local_business
          ? 'w-4 h-4 bg-sky-400 border border-white shadow-md'
          : 'w-3 h-3 bg-slate-400/80 border border-slate-800'
      } ${isSelected ? 'ring-2 ring-amber-400 scale-150' : ''}`;

      el.title = poi.name;

      const handleClick = (e: Event) => {
        e.stopPropagation();
        onSelectPoi(poi.id);

        if (popupRef.current) popupRef.current.remove();

        const popupContent = `
          <div class="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 min-w-[200px] shadow-2xl font-sans">
            <h4 class="font-bold text-xs text-slate-100">${poi.name}</h4>
            <p class="text-[11px] text-amber-400 capitalize">${poi.category}</p>
            ${
              poi.is_local_business
                ? '<span class="inline-block mt-1.5 text-[10px] bg-sky-900/60 text-sky-300 px-1.5 py-0.5 rounded border border-sky-700">Comercio de Barrio</span>'
                : ''
            }
          </div>
        `;

        const popup = new maplibregl.Popup({
          offset: 15,
          closeButton: false,
          className: 'custom-map-popup'
        })
          .setLngLat(poi.coordinates)
          .setHTML(popupContent)
          .addTo(map);

        popupRef.current = popup;
      };

      el.addEventListener('click', handleClick);
      el.addEventListener('touchend', handleClick);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(poi.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [pois, selectedRoute, selectedStopPoiId, language, onSelectPoi]);

  // Centrar cámara dinámicamente cuando se selecciona un POI
  useEffect(() => {
    if (!mapRef.current || !selectedStopPoiId) return;
    const target = pois.find((p) => p.id === selectedStopPoiId);
    if (target) {
      mapRef.current.flyTo({
        center: target.coordinates,
        zoom: 16.5,
        pitch: is3D ? 50 : 0,
        speed: 1.2,
        curve: 1.4
      });
    }
  }, [selectedStopPoiId, pois, is3D]);

  // Ajuste automático y encuadre a la ruta completa
  const fitToRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !selectedRoute || selectedRoute.stops.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    selectedRoute.stops.forEach((stop) => {
      bounds.extend(stop.poi.coordinates);
    });

    map.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 40, right: 40 },
      maxZoom: 16.5,
      duration: 1200
    });
  }, [selectedRoute]);

  // Auto-encuadre inicial al seleccionar o generar una nueva ruta
  useEffect(() => {
    if (selectedRoute && mapRef.current) {
      fitToRoute();
    }
  }, [selectedRoute, fitToRoute]);

  const toggle3D = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextState = !is3D;
    setIs3D(nextState);
    map.easeTo({
      pitch: nextState ? 50 : 0,
      bearing: nextState ? -15 : 0,
      duration: 800
    });
  }, [is3D]);

  return (
    <div className="relative w-full h-[380px] sm:h-[480px] md:h-[560px] lg:h-[620px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950 select-none">
      {/* Contenedor WebGL MapLibre */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Barra superior de herramientas adaptativa para móviles */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-80px)]">
        {/* Selector de estilos visuales */}
        <div className="flex bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-lg">
          {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveStyle(key)}
              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                activeStyle === key
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{MAP_STYLES[key].icon}</span>
              <span className="hidden md:inline">{MAP_STYLES[key].name[language]}</span>
            </button>
          ))}
        </div>

        {/* Botón 3D / 2D */}
        <button
          onClick={toggle3D}
          className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 backdrop-blur-md border shadow-lg transition-all ${
            is3D
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title={is3D ? 'Cambiar a plano cenital 2D' : 'Cambiar a perspectiva 3D'}
        >
          <Box className="w-3.5 h-3.5" />
          <span>{is3D ? '3D' : '2D'}</span>
        </button>

        {/* Botón encuadrar ruta */}
        {selectedRoute && (
          <button
            onClick={fitToRoute}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-slate-900/90 text-slate-200 border border-slate-700 hover:bg-slate-800 hover:text-white shadow-lg backdrop-blur-md transition-all"
            title="Encuadrar ruta"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{language === 'es' ? 'Encuadrar' : 'Fit'}</span>
          </button>
        )}
      </div>

      {/* HUD informativo de segmento sobrevolado */}
      {hoveredSegment && (
        <div className="absolute top-14 sm:top-16 left-3 z-10 bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-xs text-slate-200 shadow-2xl pointer-events-none max-w-[calc(100vw-32px)] sm:max-w-xs animate-in fade-in duration-200">
          <div className="font-bold text-amber-400 flex items-center justify-between">
            <span>{hoveredSegment.id}</span>
            <span className="text-[10px] uppercase font-semibold text-slate-400">
              {hoveredSegment.zone.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="mt-1 text-slate-300 flex items-center gap-2.5 text-[11px]">
            <span>Long: <strong>{hoveredSegment.length_m}m</strong></span>
            <span>Ancho: <strong>{hoveredSegment.width_m}m</strong></span>
            <span>Pend: <strong>{hoveredSegment.slope_pct}%</strong></span>
          </div>
          <div className="mt-1 text-slate-400 text-[11px]">
            Superficie: <strong className="text-slate-200 capitalize">{hoveredSegment.surface.replace(/_/g, ' ')}</strong>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span>Auditoría: <strong>{(hoveredSegment.confidence * 100).toFixed(0)}%</strong></span>
            <span
              className={`font-semibold flex items-center gap-1 ${
                hoveredSegment.transitable[activeProfile] ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {hoveredSegment.transitable[activeProfile] ? (
                <>
                  <ShieldCheck className="w-3 h-3" /> Transitable
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" /> Bloqueado
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Leyenda interactiva flotante colapsable para teléfonos */}
      <div className="absolute bottom-3 left-3 z-10">
        {showLegend ? (
          <div className="bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-xs text-slate-200 shadow-2xl max-w-[calc(100vw-24px)] sm:max-w-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-slate-100 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800">
              <span>{language === 'es' ? 'Microcartografía' : 'Cartography'}</span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-white px-1 text-[11px]"
                title="Minimizar"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1.5 bg-gradient-to-r from-amber-500 to-amber-300 inline-block rounded-full"></span>
              <span className="font-semibold text-amber-300 text-[11px]">
                {language === 'es' ? 'Ruta Activa Optimizada' : 'Active Route'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-emerald-500 inline-block rounded"></span>
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {language === 'es' ? 'Acera Verificada' : 'Verified Sidewalk'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-rose-500 inline-block rounded"></span>
              <span className="flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                {language === 'es' ? 'Barrera Arquitectónica' : 'Barrier'}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLegend(true)}
            className="p-2 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700 text-slate-300 hover:text-white shadow-lg text-xs flex items-center gap-1.5"
            title="Ver leyenda de aceras"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-semibold">{language === 'es' ? 'Simbología' : 'Legend'}</span>
          </button>
        )}
      </div>

      {/* Aviso de gesto táctil en móviles */}
      <div className="absolute bottom-3 right-12 z-10 hidden sm:flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] text-slate-300 shadow-lg">
        <Compass className="w-3 h-3 text-amber-400" />
        <span className="capitalize">{activeProfile.replace(/_/g, ' ')}</span>
      </div>
    </div>
  );
};
