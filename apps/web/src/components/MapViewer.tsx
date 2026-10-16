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
  Compass,
  Palette,
  Moon,
  Sun,
  Crosshair,
  Sparkles,
  X
} from 'lucide-react';

interface MapViewerProps {
  segments: Segment[];
  pois: POI[];
  selectedRoute: RouteAlternative | null;
  activeProfile: MobilityProfile;
  selectedStopPoiId: string | null;
  onSelectPoi: (poiId: string) => void;
  language: 'es' | 'en';
  isPulseActive?: boolean;
  onInspectStop?: (poiId: string) => void;
}

type MapStyleKey = 'voyager' | 'dark' | 'positron';

const MAP_STYLES: Record<
  MapStyleKey,
  { name: { es: string; en: string }; url: string; iconType: 'palette' | 'moon' | 'sun' }
> = {
  dark: {
    name: { es: 'Noche Neón', en: 'Dark Neon' },
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    iconType: 'moon'
  },
  voyager: {
    name: { es: 'Turismo Voyager', en: 'Voyager Tourism' },
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    iconType: 'palette'
  },
  positron: {
    name: { es: 'Luz Arquitectónica', en: 'Positron Clean' },
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    iconType: 'sun'
  }
};

// Función de distancia geodésica Haversine en metros
function getDistanceMeters(c1: [number, number], c2: [number, number]): number {
  const R = 6371e3;
  const phi1 = (c1[1] * Math.PI) / 180;
  const phi2 = (c2[1] * Math.PI) / 180;
  const deltaPhi = ((c2[1] - c1[1]) * Math.PI) / 180;
  const deltaLambda = ((c2[0] - c1[0]) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const MapViewer: FC<MapViewerProps> = ({
  segments,
  pois,
  selectedRoute,
  activeProfile,
  selectedStopPoiId,
  onSelectPoi,
  language,
  isPulseActive = false,
  onInspectStop
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const watchPositionIdRef = useRef<number | null>(null);

  const [activeStyle, setActiveStyle] = useState<MapStyleKey>('dark');
  const [is3D, setIs3D] = useState(true);
  const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLegend, setShowLegend] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );

  // Estados de geolocalización y radar GPS
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [, setUserLocation] = useState<[number, number] | null>(null);
  const [proximityAlert, setProximityAlert] = useState<{ poi: POI; distanceM: number } | null>(null);

  // Cálculo dinámico de límites espaciales
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
    const pad = 0.025;

    return {
      dynamicCenter: [centerLng, centerLat] as [number, number],
      dynamicBounds: [
        [minLng - pad, minLat - pad],
        [maxLng + pad, maxLat + pad]
      ] as [[number, number], [number, number]]
    };
  }, [pois, segments]);

  // Inicialización de MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[activeStyle].url,
      center: dynamicCenter,
      zoom: 15.3,
      pitch: 45,
      bearing: -15,
      maxBounds: dynamicBounds,
      cooperativeGestures: true
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

  // Cambio de estilo
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    mapRef.current.setStyle(MAP_STYLES[activeStyle].url);
  }, [activeStyle, isLoaded]);

  // Redimensionamiento
  useEffect(() => {
    const handleResize = () => mapRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Conversión GeoJSON
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

  const routeGeoJSON = useMemo(() => {
    if (!selectedRoute) {
      return { type: 'FeatureCollection', features: [] } as any;
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

  // Actualización de capas
  const updateMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (!map.getSource('sidewalk-segments')) {
      map.addSource('sidewalk-segments', {
        type: 'geojson',
        data: segmentsGeoJSON
      });

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

  // Marcadores estilo Fotodisco de Patrimonio con animación de levitación
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const stopsByPoiId = new Map(
      (selectedRoute?.stops || []).map((stop) => [stop.poi.id, stop])
    );

    // 1. Marcadores de paradas ordenadas (Medallones flotantes)
    if (selectedRoute) {
      selectedRoute.stops.forEach((stop) => {
        const isSelected = stop.poi.id === selectedStopPoiId;
        const isNearby = proximityAlert?.poi.id === stop.poi.id;

        const el = document.createElement('div');
        el.className = `flex flex-col items-center cursor-pointer transition-transform duration-300 ${
          isSelected || isNearby ? 'scale-125 z-30' : 'hover:scale-110 z-20'
        }`;

        el.innerHTML = `
          <div class="relative flex items-center justify-center animate-pokestop-float">
            ${
              isSelected || isNearby
                ? '<div class="absolute -inset-1.5 rounded-full bg-amber-400/40 animate-ping"></div>'
                : ''
            }
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-300 p-0.5 shadow-2xl flex items-center justify-center border border-white">
              <div class="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-black text-xs text-white">
                <span>${stop.stop_order}</span>
              </div>
            </div>
          </div>
          <div class="mt-0.5 px-1.5 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-[9px] font-bold text-amber-300 shadow whitespace-nowrap">
            ${stop.poi.name.length > 14 ? stop.poi.name.substring(0, 14) + '...' : stop.poi.name}
          </div>
        `;

        const handleClick = (e: Event) => {
          e.stopPropagation();
          onSelectPoi(stop.poi.id);
          if (onInspectStop) onInspectStop(stop.poi.id);

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
                  ? '<div class="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-semibold">[Taller Tradicional de Barrio]</div>'
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

    // 2. Nodos de cristales para otros POIs
    pois.forEach((poi) => {
      if (stopsByPoiId.has(poi.id)) return;

      const isSelected = poi.id === selectedStopPoiId;
      const isNearby = proximityAlert?.poi.id === poi.id;

      const el = document.createElement('div');
      el.className = `cursor-pointer transition-transform duration-200 hover:scale-150 ${
        isSelected ? 'scale-150 z-20' : 'z-10'
      }`;

      el.innerHTML = `
        <div class="w-3.5 h-3.5 rounded-sm rotate-45 ${
          poi.is_local_business
            ? 'bg-sky-400 border border-white shadow-[0_0_8px_rgba(56,189,248,0.8)]'
            : 'bg-slate-400 border border-slate-800 shadow'
        } ${isNearby ? 'ring-4 ring-amber-400 animate-ping' : ''}"></div>
      `;

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
                ? '<span class="inline-block mt-1.5 text-[10px] bg-sky-900/60 text-sky-300 px-1.5 py-0.5 rounded border border-sky-700">[Comercio Tradicional]</span>'
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
  }, [pois, selectedRoute, selectedStopPoiId, proximityAlert, language, onSelectPoi]);

  // Gestión de Radar GPS en Vivo
  const toggleGps = useCallback(() => {
    if (isGpsActive) {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
        watchPositionIdRef.current = null;
      }
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      setIsGpsActive(false);
      setUserLocation(null);
      setProximityAlert(null);
    } else {
      if (!('geolocation' in navigator)) {
        alert(
          language === 'es'
            ? 'Geolocalización no soportada en este navegador'
            : 'Geolocation not supported in this browser'
        );
        return;
      }

      setIsGpsActive(true);

      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setUserLocation(coords);

          const map = mapRef.current;
          if (!map) return;

          // Dibujar o actualizar avatar del usuario con ondas de radar
          if (!userMarkerRef.current) {
            const el = document.createElement('div');
            el.className = 'relative flex items-center justify-center';
            el.innerHTML = `
              <div class="absolute w-16 h-16 rounded-full bg-sky-500/25 radar-wave"></div>
              <div class="relative w-5 h-5 rounded-full bg-sky-500 border-2 border-white shadow-xl flex items-center justify-center">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            `;
            const marker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map);
            userMarkerRef.current = marker;
          } else {
            userMarkerRef.current.setLngLat(coords);
          }

          // Detección de proximidad (< 50 metros a cualquier POI)
          let closest: { poi: POI; distanceM: number } | null = null;
          pois.forEach((poi) => {
            const dist = getDistanceMeters(coords, poi.coordinates);
            if (dist <= 50) {
              if (!closest || dist < closest.distanceM) {
                closest = { poi, distanceM: dist };
              }
            }
          });

          if (closest && (!proximityAlert || proximityAlert.poi.id !== (closest as any).poi.id)) {
            // Vibración táctil háptica
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate([100, 50, 100]);
              } catch {}
            }
          }
          setProximityAlert(closest);
        },
        (err) => {
          console.error('Error GPS:', err);
          setIsGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );

      watchPositionIdRef.current = id;
    }
  }, [isGpsActive, language, pois, proximityAlert]);

  useEffect(() => {
    return () => {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
      }
    };
  }, []);

  // Centrar en POI seleccionado
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

  // Ajustar a la ruta
  const fitToRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !selectedRoute || selectedRoute.stops.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    selectedRoute.stops.forEach((stop) => bounds.extend(stop.poi.coordinates));

    map.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 40, right: 40 },
      maxZoom: 16.5,
      duration: 1200
    });
  }, [selectedRoute]);

  useEffect(() => {
    if (selectedRoute && mapRef.current) fitToRoute();
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

  useEffect(() => {
    if (!isPulseActive) return;
    const map = mapRef.current;
    if (!map) return;

    const center = map.getCenter();
    const centerCoords: [number, number] = [center.lng, center.lat];

    let closest: { poi: POI; distanceM: number } | null = null;
    pois.forEach((poi) => {
      const dist = getDistanceMeters(centerCoords, poi.coordinates);
      if (dist <= 300) {
        if (!closest || dist < closest.distanceM) {
          closest = { poi, distanceM: dist };
        }
      }
    });

    if (closest) {
      setProximityAlert(closest);
    }
  }, [isPulseActive, pois]);

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[480px] md:min-h-[560px] lg:min-h-[640px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 select-none">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Banner de Proximidad Radar en tiempo real */}
      {proximityAlert && (
        <div className="absolute top-14 left-3 right-3 sm:left-auto sm:right-14 z-20 bg-amber-500/95 backdrop-blur-md text-slate-950 p-2.5 px-3.5 rounded-xl border border-white shadow-2xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-950 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-black uppercase tracking-wider text-[10px]">
                {language === 'es' ? 'Radar de Proximidad:' : 'Proximity Radar:'}
              </span>{' '}
              <span className="font-bold">{proximityAlert.poi.name}</span>{' '}
              <span className="text-slate-800 text-[11px]">({proximityAlert.distanceM}m)</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectPoi(proximityAlert.poi.id);
              if (onInspectStop) onInspectStop(proximityAlert.poi.id);
            }}
            className="px-2.5 py-1 bg-slate-950 text-amber-400 font-bold rounded-lg text-[10px] uppercase shadow hover:bg-slate-900 transition whitespace-nowrap cursor-pointer"
          >
            {language === 'es' ? 'Explorar' : 'Explore'}
          </button>
        </div>
      )}

      {/* Barra superior de herramientas adaptativa */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-80px)]">
        {/* Selector de estilos visuales sin emojis */}
        <div className="flex bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-lg">
          {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => {
            const style = MAP_STYLES[key];
            return (
              <button
                key={key}
                onClick={() => setActiveStyle(key)}
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeStyle === key
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={style.name[language]}
              >
                {style.iconType === 'palette' && <Palette className="w-3.5 h-3.5" />}
                {style.iconType === 'moon' && <Moon className="w-3.5 h-3.5" />}
                {style.iconType === 'sun' && <Sun className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{style.name[language]}</span>
              </button>
            );
          })}
        </div>

        {/* Botón Radar GPS */}
        <button
          onClick={toggleGps}
          className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border shadow-lg transition-all ${
            isGpsActive
              ? 'bg-sky-500 text-white border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.5)]'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title={isGpsActive ? 'Desactivar GPS' : 'Activar Radar GPS en Vivo'}
        >
          <Crosshair className={`w-3.5 h-3.5 ${isGpsActive ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {isGpsActive ? (language === 'es' ? 'GPS Activo' : 'GPS Live') : 'GPS'}
          </span>
        </button>

        {/* Botón 3D / 2D */}
        <button
          onClick={toggle3D}
          className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 backdrop-blur-md border shadow-lg transition-all ${
            is3D
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title={is3D ? 'Cambiar a 2D' : 'Cambiar a 3D'}
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

      {/* HUD informativo de segmento */}
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

      {/* Leyenda interactiva */}
      <div className="absolute bottom-3 left-3 z-10">
        {showLegend ? (
          <div className="bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-xs text-slate-200 shadow-2xl max-w-[calc(100vw-24px)] sm:max-w-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-slate-100 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800">
              <span>{language === 'es' ? 'Microcartografía' : 'Cartography'}</span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800"
                title="Minimizar"
              >
                <X className="w-3.5 h-3.5" />
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
            title="Ver leyenda"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-semibold">{language === 'es' ? 'Simbología' : 'Legend'}</span>
          </button>
        )}
      </div>

      <div className="absolute bottom-3 right-12 z-10 hidden sm:flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] text-slate-300 shadow-lg">
        <Compass className="w-3 h-3 text-amber-400" />
        <span className="capitalize">{activeProfile.replace(/_/g, ' ')}</span>
      </div>
    </div>
  );
};
