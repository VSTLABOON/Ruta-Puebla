import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Segment, POI, RouteAlternative, MobilityProfile } from '@ruta-abierta/shared-types';
import {
  ShieldCheck,
  AlertTriangle,
  Maximize2,
  Palette,
  Moon,
  Sun,
  Navigation,
  Sparkles,
  X,
  Hand
} from 'lucide-react';
import { createAvatar3D, Avatar3DController } from '../utils/avatar3d';

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
  userLocation: [number, number];
  onUserLocationChange: (coords: [number, number]) => void;
  onClearRoute?: () => void;
  onOpenCustomizer?: () => void;
}

type MapStyleKey = 'dark' | 'voyager' | 'positron';

const MAP_STYLES: Record<
  MapStyleKey,
  { name: { es: string; en: string }; url: string; iconType: 'palette' | 'moon' | 'sun' }
> = {
  dark: {
    name: { es: 'Oscuro', en: 'Dark' },
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    iconType: 'moon'
  },
  voyager: {
    name: { es: 'Callejero', en: 'Streets' },
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    iconType: 'palette'
  },
  positron: {
    name: { es: 'Claro', en: 'Light' },
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
  onInspectStop,
  userLocation,
  onUserLocationChange,
  onClearRoute,
  onOpenCustomizer
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const avatarCtrlRef = useRef<Avatar3DController | null>(null);
  const watchPositionIdRef = useRef<number | null>(null);

  const [activeStyle, setActiveStyle] = useState<MapStyleKey>('voyager');
  const [is3D, setIs3D] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  // Estados de geolocalización y radar de proximidad
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const [proximityAlert, setProximityAlert] = useState<{ poi: POI; distanceM: number } | null>(null);
  const [isAlertMinimized, setIsAlertMinimized] = useState(false);
  const alertTimerRef = useRef<number | null>(null);
  const currentAlertPoiIdRef = useRef<string | null>(null);

  // Cálculo dinámico de límites espaciales
  const { dynamicCenter, dynamicBounds } = useMemo(() => {
    if (pois.length === 0 && segments.length === 0) {
      return {
        dynamicCenter: [-98.198, 19.0431] as [number, number],
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
    const pad = 0.035;

    return {
      dynamicCenter: [centerLng, centerLat] as [number, number],
      dynamicBounds: [
        [minLng - pad, minLat - pad],
        [maxLng + pad, maxLat + pad]
      ] as [[number, number], [number, number]]
    };
  }, [pois, segments]);

  // Inicialización de MapLibre GL con navegación de 1 solo dedo (cooperativeGestures: false)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[activeStyle].url,
      center: dynamicCenter,
      zoom: 15.2,
      pitch: 42,
      bearing: -12,
      maxBounds: dynamicBounds,
      cooperativeGestures: false,
      dragPan: true,
      touchZoomRotate: true,
      touchPitch: true,
      fadeDuration: 300
    });

    map.on('load', () => {
      setIsLoaded(true);
      map.resize();
    });

    mapRef.current = map;

    // ResizeObserver para compatibilidad total con Brave, Safari y contenedores dinámicos
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [dynamicCenter, dynamicBounds]);

  // Cambio de estilo de mapa
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    mapRef.current.setStyle(MAP_STYLES[activeStyle].url);
  }, [activeStyle, isLoaded]);

  // Conversión GeoJSON de aceras
  const segmentsGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: segments.map((seg) => ({
        type: 'Feature',
        id: seg.id,
        properties: {
          id: seg.id,
          is_verified: seg.is_verified,
          transitable: seg.transitable[activeProfile]
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

  // Actualización de capas vectoriales
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
          'line-color': '#B84A2C',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.85
        }
      });

      map.addLayer({
        id: 'sidewalk-verified',
        type: 'line',
        source: 'sidewalk-segments',
        filter: ['all', ['get', 'is_verified'], ['get', 'transitable']],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#1D6B52',
          'line-width': 2.5,
          'line-opacity': 0.85
        }
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
          'line-color': '#F0B43A',
          'line-width': 14,
          'line-blur': 6,
          'line-opacity': 0.45
        }
      });

      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0F3078',
          'line-width': 7.5,
          'line-opacity': 0.98
        }
      });

      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#F0B43A',
          'line-width': 4.5,
          'line-opacity': 1
        }
      });
    } else {
      const source = map.getSource('active-route') as maplibregl.GeoJSONSource;
      source.setData(routeGeoJSON);
    }
  }, [segmentsGeoJSON, routeGeoJSON]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      updateMapLayers();
    } else {
      map.once('style.load', updateMapLayers);
    }
  }, [updateMapLayers, activeStyle]);

  // Punto permanente "Dónde estoy" (Ubicación del usuario con avatar 3D y escala vinculada al zoom)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    if (!userMarkerRef.current) {
      const avatarCtrl = createAvatar3D('/models/base.fbx', 48, 62);
      avatarCtrlRef.current = avatarCtrl;

      const markerWrapper = document.createElement('div');
      markerWrapper.className = 'relative flex flex-col items-center justify-center pointer-events-none z-40 transition-transform duration-150 ease-out';
      markerWrapper.style.transformOrigin = 'bottom center';
      markerWrapper.appendChild(avatarCtrl.container);

      // Listener de escala dinámica vinculada al nivel de zoom del mapa
      const updateZoomScale = () => {
        if (!mapRef.current) return;
        const currentZoom = mapRef.current.getZoom();
        // Zoom 13: 0.65x, Zoom 15.5: 0.9x, Zoom 16.5: 1.05x, Zoom 18+: 1.3x
        const factor = Math.max(0.65, Math.min(1.3, Math.pow(1.15, currentZoom - 15.5)));
        markerWrapper.style.transform = `scale(${factor.toFixed(2)})`;
      };
      updateZoomScale();
      map.on('zoom', updateZoomScale);

      userMarkerRef.current = new maplibregl.Marker({ element: markerWrapper, anchor: 'bottom' })
        .setLngLat(userLocation)
        .addTo(map);

      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (e.alpha !== null && avatarCtrlRef.current) {
          avatarCtrlRef.current.setHeading(e.alpha);
        }
      };
      window.addEventListener('deviceorientation', handleOrientation);
    } else {
      userMarkerRef.current.setLngLat(userLocation);
    }

    // Evaluar proximidad a lugares cercanos (< 85m)
    let closest: { poi: POI; distanceM: number } | null = null;
    pois.forEach((poi) => {
      const dist = getDistanceMeters(userLocation, poi.coordinates);
      if (dist <= 85) {
        if (!closest || dist < closest.distanceM) {
          closest = { poi, distanceM: dist };
        }
      }
    });
    setProximityAlert(closest);
  }, [userLocation, isLoaded, language, pois]);

  // Marcadores interactivos para las paradas de la ruta y todas las locaciones disponibles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const stopsByPoiId = new Map(
      (selectedRoute?.stops || []).map((stop) => [stop.poi.id, stop])
    );

    // 1. Paradas activas del recorrido (Destacados en 3D: Baliza vertical elevada + Medallón Volumétrico)
    if (selectedRoute) {
      selectedRoute.stops.forEach((stop) => {
        const isSelected = stop.poi.id === selectedStopPoiId;
        const isNearby = proximityAlert?.poi.id === stop.poi.id;

        const el = document.createElement('div');
        el.className = `flex flex-col items-center cursor-pointer select-none transition-all duration-300 ease-out ${
          isSelected || isNearby ? 'scale-115 z-40' : 'hover:scale-105 z-30'
        }`;

        // Arquitectura de Baliza de Cerámica Talavera 3D Elevada (Anchor Bottom):
        // 1. Ficha flotante de cerámica con doble filete cobalto
        // 2. Plato de Talavera 3D con doble anillo concéntrico de cobalto y centro marfil majólica
        // 3. Columna de luz vertical cobalto/ocre sobre las construcciones 3D
        // 4. Base georreferenciada de barro cocido y cobalto
        el.innerHTML = `
          ${
            isSelected || isNearby
              ? `<div class="mb-1.5 px-3 py-1 rounded-xl bg-[#FAF6EE]/98 border-2 border-[#0F3078] text-[10px] font-black text-[#0F3078] shadow-[0_6px_20px_rgba(15,48,120,0.35)] whitespace-nowrap animate-bounce flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-[#B84A2C]"></span>
                  <span>${stop.poi.name}</span>
                </div>`
              : ''
          }
          <div class="relative flex flex-col items-center">
            <!-- Plato de Talavera 3D Volumétrico -->
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-1.5 rounded-full bg-[#0F3078]/25 blur-sm ${
                isSelected || isNearby ? 'animate-pulse' : ''
              }"></div>
              <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0F3078] via-[#1B49AC] to-[#0F3078] p-0.5 shadow-[0_6px_18px_rgba(15,48,120,0.45)] flex items-center justify-center border-2 border-white transform transition-transform ${
                isSelected ? 'scale-110 ring-2 ring-[#B84A2C]' : ''
              }">
                <!-- Borde concéntrico interior de Talavera -->
                <div class="w-full h-full rounded-full bg-[#FAF6EE] p-0.5 flex items-center justify-center border border-[#0F3078]">
                  <div class="w-full h-full rounded-full border border-dashed border-[#0F3078]/50 flex items-center justify-center font-black text-sm text-[#0F3078] shadow-inner font-serif">
                    <span>${stop.stop_order}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Baliza de luz vertical (Cobalto y Ocre Poblano) -->
            <div class="w-1 h-6 bg-gradient-to-b from-[#0F3078] via-[#1B49AC]/80 to-[#B84A2C]/30 shadow-[0_0_8px_rgba(15,48,120,0.6)]"></div>

            <!-- Base geodésica anclada a nivel de calle (Barro y Cobalto) -->
            <div class="relative w-4 h-4 flex items-center justify-center">
              <div class="absolute inset-0 rounded-full bg-[#0F3078]/40 animate-ping"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-[#0F3078] border-2 border-[#FAF6EE] shadow-[0_0_6px_rgba(15,48,120,0.9)]"></div>
            </div>
          </div>
        `;

        const handleSelect = (e: Event) => {
          e.stopPropagation();
          onSelectPoi(stop.poi.id);
          if (onInspectStop) onInspectStop(stop.poi.id);
        };

        el.addEventListener('click', handleSelect);

        // anchor: 'bottom' para que la base de la baliza toque la calle y el medallón flote en el aire 3D
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(stop.poi.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 2. Todas las demás locaciones en el mapa (Gemas de Talavera y Barro Poblano)
    const shouldRenderAll = true;
    if (shouldRenderAll) {
      pois.forEach((poi) => {
        if (stopsByPoiId.has(poi.id)) return;

        const isSelected = poi.id === selectedStopPoiId;
        const isNearby = proximityAlert?.poi.id === poi.id;
        const isWorkshop = poi.is_local_business;

        const el = document.createElement('div');
        el.className = `flex flex-col items-center cursor-pointer transition-transform duration-300 ease-out ${
          isSelected || isNearby ? 'scale-125 z-30' : 'hover:scale-110 z-10'
        }`;

        // Talleres = Terracota petatillo con halo ocre; Patrimonio = Azul cobalto poblano
        const gemBg = isWorkshop
          ? 'bg-[#B84A2C] shadow-[0_0_10px_rgba(184,74,44,0.7)]'
          : 'bg-[#0F3078] shadow-[0_0_10px_rgba(15,48,120,0.7)]';

        const textTint = isWorkshop
          ? 'text-[#B84A2C] border-[#B84A2C]/40 bg-[#FAF6EE]/95'
          : 'text-[#0F3078] border-[#0F3078]/40 bg-[#FAF6EE]/95';

        el.innerHTML = `
          <div class="relative flex items-center justify-center p-1">
            ${
              isSelected || isNearby
                ? `<div class="absolute -inset-1 rounded-full ${isWorkshop ? 'bg-[#B84A2C]/40' : 'bg-[#0F3078]/40'} animate-ping"></div>`
                : ''
            }
            <div class="w-3.5 h-3.5 rounded-full ${gemBg} border-2 border-white ring-1 ring-black/10"></div>
          </div>
          ${
            isSelected || isNearby
              ? `<div class="mt-0.5 px-2.5 py-0.5 rounded-lg border-2 ${textTint} text-[9px] font-black shadow-xl whitespace-nowrap animate-fade-slide">
                  ${poi.name}
                </div>`
              : ''
          }
        `;

        const handleSelect = (e: Event) => {
          e.stopPropagation();
          onSelectPoi(poi.id);
          if (onInspectStop) onInspectStop(poi.id);
        };

        el.addEventListener('click', handleSelect);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(poi.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [pois, selectedRoute, selectedStopPoiId, proximityAlert, isLoaded, onSelectPoi, onInspectStop]);

  // Botón "¿Dónde estoy?" — Centra la cámara en la ubicación del usuario e intenta GPS real si está en Puebla
  const handleWhereAmI = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: userLocation,
        zoom: 16.4,
        pitch: is3D ? 48 : 0,
        duration: 1100,
        essential: true
      });
    }

    if ('geolocation' in navigator && !isGpsTracking) {
      setIsGpsTracking(true);
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          // Verificar si el usuario está físicamente dentro de la zona metropolitana de Puebla
          const distFromCenter = getDistanceMeters(coords, [-98.198, 19.0431]);
          if (distFromCenter < 15000) {
            onUserLocationChange(coords);
          }
        },
        () => {
          setIsGpsTracking(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
      watchPositionIdRef.current = id;
    }
  }, [userLocation, is3D, isGpsTracking, onUserLocationChange]);

  useEffect(() => {
    return () => {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
      }
    };
  }, []);

  // Transición suave de cámara al seleccionar una locación
  useEffect(() => {
    if (!mapRef.current || !selectedStopPoiId) return;
    const target = pois.find((p) => p.id === selectedStopPoiId);
    if (target) {
      mapRef.current.flyTo({
        center: target.coordinates,
        zoom: 16.4,
        pitch: is3D ? 48 : 0,
        duration: 1100,
        essential: true
      });
    }
  }, [selectedStopPoiId, pois, is3D]);

  // Encuadrar toda la ruta con transición suave
  const fitToRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !selectedRoute || selectedRoute.stops.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    selectedRoute.stops.forEach((stop) => bounds.extend(stop.poi.coordinates));
    bounds.extend(userLocation);

    map.fitBounds(bounds, {
      padding: { top: 80, bottom: 130, left: 50, right: 50 },
      maxZoom: 16.2,
      duration: 1200,
      essential: true
    });
  }, [selectedRoute, userLocation]);

  useEffect(() => {
    if (selectedRoute && mapRef.current && isLoaded) {
      fitToRoute();
    }
  }, [selectedRoute, isLoaded]);

  const toggle3D = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextState = !is3D;
    setIs3D(nextState);
    map.easeTo({
      pitch: nextState ? 48 : 0,
      bearing: nextState ? -12 : 0,
      duration: 900,
      essential: true
    });
  }, [is3D]);

  const cycleMapStyle = useCallback(() => {
    setActiveStyle((prev) => {
      if (prev === 'dark') return 'voyager';
      if (prev === 'voyager') return 'positron';
      return 'dark';
    });
  }, []);

  // Pulso Urbano: busca el lugar más cercano al usuario o al centro de la pantalla
  useEffect(() => {
    if (!isPulseActive) return;
    let closest: { poi: POI; distanceM: number } | null = null;
    pois.forEach((poi) => {
      const dist = getDistanceMeters(userLocation, poi.coordinates);
      if (!closest || dist < closest.distanceM) {
        closest = { poi, distanceM: dist };
      }
    });

    if (closest) {
      setProximityAlert(closest);
    }
  }, [isPulseActive, pois, userLocation]);

  // Minimización automática del aviso de proximidad a burbuja después de 3.5 segundos
  useEffect(() => {
    if (proximityAlert) {
      if (currentAlertPoiIdRef.current !== proximityAlert.poi.id) {
        currentAlertPoiIdRef.current = proximityAlert.poi.id;
        setIsAlertMinimized(false);
        if (alertTimerRef.current !== null) {
          window.clearTimeout(alertTimerRef.current);
        }
        alertTimerRef.current = window.setTimeout(() => {
          setIsAlertMinimized(true);
        }, 3500);
      }
    } else {
      currentAlertPoiIdRef.current = null;
      setIsAlertMinimized(false);
      if (alertTimerRef.current !== null) {
        window.clearTimeout(alertTimerRef.current);
        alertTimerRef.current = null;
      }
    }
  }, [proximityAlert]);

  useEffect(() => {
    return () => {
      if (alertTimerRef.current !== null) {
        window.clearTimeout(alertTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* Lienzo de mapa de pantalla completa con soporte de 1 solo dedo (touch-none) */}
      <div ref={mapContainerRef} className="w-full h-full touch-none" />

      {/* Banner de Proximidad Inteligente con minimización automática a burbuja */}
      <div
        className={`absolute top-16 left-3 right-16 sm:left-4 sm:right-auto sm:max-w-sm z-20 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          proximityAlert
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {proximityAlert &&
          (isAlertMinimized ? (
            /* Burbuja minimizada flotante Talavera */
            <div
              onClick={() => {
                onSelectPoi(proximityAlert.poi.id);
                if (onInspectStop) onInspectStop(proximityAlert.poi.id);
              }}
              className="bg-[#FAF6EE]/95 hover:bg-[#FFFDF9] text-[#162035] p-2 px-3.5 rounded-full border-2 border-[#0F3078] shadow-[0_6px_25px_rgba(15,48,120,0.35)] backdrop-blur-xl flex items-center gap-2.5 cursor-pointer transition-all duration-300 hover:scale-105 animate-fade-slide"
              title={language === 'es' ? 'Toca para abrir la ficha de este lugar' : 'Tap to open place details'}
            >
              <div className="w-6 h-6 rounded-full bg-[#0F3078] text-[#FAF6EE] flex items-center justify-center flex-shrink-0 shadow">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-xs text-[#0F3078] truncate max-w-[140px] sm:max-w-[200px]">
                  {proximityAlert.poi.name}
                </span>
                <span className="text-[10px] font-bold text-[#B84A2C] bg-[#B84A2C]/10 px-1.5 py-0.5 rounded-full">
                  {proximityAlert.distanceM}m
                </span>
              </div>
            </div>
          ) : (
            /* Banner expandido completo Talavera */
            <div className="bg-[#FAF6EE]/98 backdrop-blur-md text-[#162035] p-3 rounded-2xl border-2 border-[#0F3078] shadow-2xl flex items-center justify-between gap-3 sm:max-w-sm animate-fade-slide">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#0F3078] text-[#FAF6EE] flex items-center justify-center flex-shrink-0 shadow">
                  <Sparkles className="w-4 h-4 text-[#F0B43A]" />
                </div>
                <div className="text-xs min-w-0">
                  <span className="font-black uppercase tracking-wider text-[10px] block text-[#B84A2C]">
                    {language === 'es' ? 'Lugar cercano a ti' : 'Nearby location'}
                  </span>
                  <span className="font-extrabold text-sm truncate block text-[#0F3078]">
                    {proximityAlert.poi.name}
                  </span>
                  <span className="text-[#162035]/80 font-semibold text-[11px]">
                    {language === 'es'
                      ? `A ${proximityAlert.distanceM} metros de tu ubicación`
                      : `${proximityAlert.distanceM}m away`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelectPoi(proximityAlert.poi.id);
                    if (onInspectStop) onInspectStop(proximityAlert.poi.id);
                  }}
                  className="px-3 py-1.5 bg-[#0F3078] text-[#FAF6EE] font-bold rounded-xl text-xs shadow hover:bg-[#1B49AC] transition whitespace-nowrap cursor-pointer"
                >
                  {language === 'es' ? 'Ver lugar' : 'Open'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAlertMinimized(true)}
                  className="p-1 rounded-lg bg-[#0F3078]/10 hover:bg-[#0F3078]/20 text-[#0F3078] cursor-pointer"
                  title={language === 'es' ? 'Minimizar a burbuja' : 'Minimize to bubble'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* HUD Flotante Superior Talavera */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between pointer-events-none">
        {/* Lado Izquierdo: Insignia de Estado y Selector de Enfoque */}
        <div className="flex flex-col gap-1.5 pointer-events-auto max-w-[calc(100%-60px)]">
          {selectedRoute ? (
            <div className="flex items-center gap-2 bg-[#FAF6EE]/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border-2 border-[#0F3078] shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B84A2C] animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(184,74,44,0.8)]" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold tracking-wider uppercase text-[#B84A2C] leading-none">
                  {language === 'es' ? 'Ruta Activa' : 'Active Route'}
                </span>
                <span className="text-xs font-black text-[#0F3078] truncate leading-tight mt-0.5">
                  {selectedRoute.name}
                </span>
              </div>
              {onClearRoute && (
                <button
                  type="button"
                  onClick={onClearRoute}
                  className="ml-1 p-1 rounded-lg bg-[#0F3078]/10 hover:bg-rose-500/20 text-[#0F3078] hover:text-rose-700 transition cursor-pointer"
                  title={language === 'es' ? 'Salir de la ruta y volver a exploración libre' : 'Exit route'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#FAF6EE]/95 backdrop-blur-md px-3 py-2 rounded-2xl border-2 border-[#0F3078] shadow-xl">
                <span className="w-2 h-2 rounded-full bg-[#0F3078] flex-shrink-0 shadow-[0_0_8px_rgba(15,48,120,0.8)]" />
                <span className="text-xs font-black text-[#0F3078]">
                  {language === 'es' ? `Puebla (${pois.length} lugares)` : `Puebla (${pois.length} places)`}
                </span>
              </div>
              {onOpenCustomizer && (
                <button
                  type="button"
                  onClick={onOpenCustomizer}
                  className="flex items-center gap-1.5 bg-[#B84A2C] hover:bg-[#D66544] text-white font-black text-xs px-3.5 py-2 rounded-2xl shadow-md border border-white/30 transition active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F0B43A]" />
                  <span>{language === 'es' ? 'Personalizar' : 'Customize'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lado Derecho: Dock de Comandos Vertical Talavera */}
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          {/* Botón ¿Dónde estoy? */}
          <button
            type="button"
            onClick={handleWhereAmI}
            className="w-10 h-10 rounded-2xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] shadow-[0_4px_16px_rgba(15,48,120,0.45)] border-2 border-white flex items-center justify-center active:scale-95 focus-visible:ring-2 focus-visible:ring-[#0F3078] focus:outline-none transition-all cursor-pointer"
            aria-label={language === 'es' ? 'Centrar en mi ubicación' : 'Center on my location'}
            title={language === 'es' ? 'Centrar en mi ubicación' : 'Center on my location'}
          >
            <Navigation className="w-4 h-4 fill-[#FAF6EE]" />
          </button>

          {/* Botón 3D / 2D */}
          <button
            type="button"
            onClick={toggle3D}
            className={`w-10 h-10 rounded-2xl backdrop-blur-md border-2 shadow-lg flex items-center justify-center text-xs font-black focus-visible:ring-2 focus-visible:ring-[#0F3078] focus:outline-none transition-all cursor-pointer ${
              is3D
                ? 'bg-[#0F3078] text-[#FAF6EE] border-[#0F3078]'
                : 'bg-[#FAF6EE]/95 text-[#0F3078] border-[#0F3078]'
            }`}
            aria-label={language === 'es' ? 'Alternar perspectiva 3D y 2D' : 'Toggle 3D and 2D perspective'}
            title={language === 'es' ? 'Alternar perspectiva 3D / 2D' : 'Toggle 3D / 2D perspective'}
          >
            <span>{is3D ? '3D' : '2D'}</span>
          </button>

          {/* Botón Cambio de Estilo de Mapa */}
          <button
            type="button"
            onClick={cycleMapStyle}
            className="w-10 h-10 rounded-2xl bg-[#FAF6EE]/95 hover:bg-[#FFFDF9] text-[#0F3078] border-2 border-[#0F3078] backdrop-blur-md flex items-center justify-center shadow-lg focus-visible:ring-2 focus-visible:ring-[#0F3078] focus:outline-none transition-all cursor-pointer"
            aria-label={
              language === 'es'
                ? `Cambiar estilo de mapa. Actual: ${MAP_STYLES[activeStyle].name.es}`
                : `Change map style. Current: ${MAP_STYLES[activeStyle].name.en}`
            }
            title={
              language === 'es'
                ? `Estilo actual: ${MAP_STYLES[activeStyle].name.es} (Toca para cambiar)`
                : `Current style: ${MAP_STYLES[activeStyle].name.en} (Tap to change)`
            }
          >
            {activeStyle === 'dark' && <Moon className="w-4 h-4 text-[#0F3078]" />}
            {activeStyle === 'voyager' && <Palette className="w-4 h-4 text-[#B84A2C]" />}
            {activeStyle === 'positron' && <Sun className="w-4 h-4 text-[#D48914]" />}
          </button>

          {/* Botón Encuadrar Ruta Completa */}
          {selectedRoute && (
            <button
              type="button"
              onClick={fitToRoute}
              className="w-10 h-10 rounded-2xl bg-[#FAF6EE]/95 hover:bg-[#FFFDF9] text-[#B84A2C] border-2 border-[#B84A2C] backdrop-blur-md flex items-center justify-center shadow-lg focus-visible:ring-2 focus-visible:ring-[#B84A2C] focus:outline-none transition-all cursor-pointer"
              aria-label={language === 'es' ? 'Encuadrar y ver ruta completa en el mapa' : 'Fit full route on map'}
              title={language === 'es' ? 'Ver ruta completa' : 'Fit full route'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Indicador discreto de navegación con un dedo y simbología Talavera */}
      <div className="absolute bottom-24 left-3 z-10 flex items-center gap-2">
        {showLegend ? (
          <div className="bg-[#FAF6EE]/98 backdrop-blur-md p-3.5 rounded-2xl border-2 border-[#0F3078] text-xs text-[#162035] shadow-2xl space-y-2 transition-all duration-300">
            <div className="flex items-center justify-between font-bold text-[#0F3078] uppercase tracking-wider text-[10px] pb-1 border-b border-[#0F3078]/20 gap-4">
              <span>{language === 'es' ? 'Guía del Mapa Poblano' : 'Puebla Map Guide'}</span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-[#0F3078] hover:text-[#B84A2C] p-0.5 rounded hover:bg-[#DCE6F9] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#0F3078] border border-white inline-block"></span>
              <span className="text-[11px] font-bold text-[#0F3078]">
                {language === 'es' ? 'Tu ubicación actual' : 'Your location'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F0B43A] border border-[#0F3078] inline-block"></span>
              <span className="text-[11px] font-bold text-[#9E650C]">
                {language === 'es' ? 'Paradas del recorrido (Platos 3D)' : 'Route stops'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#B84A2C] border border-white inline-block"></span>
              <span className="text-[11px] font-semibold text-[#B84A2C]">
                {language === 'es' ? 'Talleres artesanales (Barro)' : 'Artisan workshops'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-[#1D6B52] inline-block rounded"></span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-[#1D6B52]">
                <ShieldCheck className="w-3 h-3 text-[#1D6B52]" />
                {language === 'es' ? 'Banqueta accesible sin barreras' : 'Accessible sidewalk'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-[#B84A2C] inline-block rounded"></span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-[#B84A2C]">
                <AlertTriangle className="w-3 h-3 text-[#B84A2C]" />
                {language === 'es' ? 'Escalón o calle con obstáculo' : 'Step or obstacle'}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className="px-3 py-1.5 bg-[#FAF6EE]/95 backdrop-blur-md rounded-xl border-2 border-[#0F3078] text-[#0F3078] hover:bg-[#FFFDF9] shadow-lg text-xs flex items-center gap-1.5 transition-all duration-300 cursor-pointer font-bold"
          >
            <Hand className="w-3.5 h-3.5 text-[#B84A2C]" />
            <span className="text-[11px]">
              {language === 'es' ? 'Mueve con 1 dedo • Simbología' : '1-finger pan • Legend'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
