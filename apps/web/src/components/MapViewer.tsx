import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FC, PointerEvent as ReactPointerEvent } from 'react';
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
  Hand,
  Gamepad2,
  Play,
  Pause,
  ChevronDown,
  ChevronUp
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

interface PoiVisualTheme {
  id: 'patrimonio' | 'artesania' | 'gastronomia' | 'espacio_publico';
  hex: string;
  label: { es: string; en: string };
  svgIcon: string;
}

function getPoiVisualTheme(poi: POI): PoiVisualTheme {
  const cat = (poi.category || '').toLowerCase();
  if (
    cat.includes('artesania') ||
    cat.includes('taller') ||
    cat === 'comercio_local'
  ) {
    return {
      id: 'artesania',
      hex: '#D48914', // Ámbar / Oro Talavera
      label: { es: 'Taller Artesanal', en: 'Artisan Workshop' },
      svgIcon: `<svg viewBox="0 0 24 24" class="w-3 h-3 stroke-white fill-none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8l-1 5c2.5 1.5 4 4 4 7a7 7 0 0 1-14 0c0-3 1.5-5.5 4-7L8 3z"/><path d="M6 21h12"/></svg>`
    };
  }
  if (cat.includes('gastronomia')) {
    return {
      id: 'gastronomia',
      hex: '#C35328', // Cobre / Terracota Culinario
      label: { es: 'Gastronomía Local', en: 'Traditional Food' },
      svgIcon: `<svg viewBox="0 0 24 24" class="w-3 h-3 stroke-white fill-none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`
    };
  }
  if (cat.includes('espacio_publico') || cat.includes('plaza')) {
    return {
      id: 'espacio_publico',
      hex: '#1D6B52', // Verde Esmeralda Poblano
      label: { es: 'Plaza / Arte Urbano', en: 'Public Plaza & Murals' },
      svgIcon: `<svg viewBox="0 0 24 24" class="w-3 h-3 stroke-white fill-none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-7"/><path d="M7 15a5 5 0 0 1 10 0H7Z"/><path d="M9 10a3 3 0 0 1 6 0H9Z"/></svg>`
    };
  }
  return {
    id: 'patrimonio',
    hex: '#0F3078', // Azul Cobalto Majólica
    label: { es: 'Patrimonio / Museo', en: 'Heritage & Museum' },
    svgIcon: `<svg viewBox="0 0 24 24" class="w-3 h-3 stroke-white fill-none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><polygon points="12 2 20 7 4 7"/></svg>`
  };
}

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

// Distancia mínima de un punto a un segmento [A, B] en metros aproximados
function getPointToSegmentMeters(pt: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return getDistanceMeters(pt, a);
  const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  const proj: [number, number] = [a[0] + t * dx, a[1] + t * dy];
  return getDistanceMeters(pt, proj);
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

  // Estados de Controladores de Demostración:
  // 1) Joystick Táctil Virtual (Móvil / Pantalla)
  // 2) Mando Xbox USB/Bluetooth (Gamepad API) + Teclado WASD
  const [showJoystickPad, setShowJoystickPad] = useState(true);
  const [walkSpeedMultiplier, setWalkSpeedMultiplier] = useState<1 | 2 | 4>(2);
  const [isAutoWalking, setIsAutoWalking] = useState(false);
  const [gamepadConnectedName, setGamepadConnectedName] = useState<string | null>(null);
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [barrierWarning, setBarrierWarning] = useState<{
    segmentId: string;
    reasonEs: string;
    reasonEn: string;
  } | null>(null);

  // Referencias mutables para el bucle de 60fps de físicas de movimiento
  const touchVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const keysPressedRef = useRef<Set<string>>(new Set());
  const userLocationRef = useRef<[number, number]>(userLocation);
  const lastButtonPressRef = useRef<Record<number, number>>({});
  const lastRumbleTimeRef = useRef<number>(0);
  const autoWalkProgressRef = useRef<{ legIdx: number; t: number }>({ legIdx: 0, t: 0 });

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

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
      const [lng, lat] = p.coordinates;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    segments.forEach((s) => {
      s.geometry?.coordinates?.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });
    });

    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const padLng = Math.max((maxLng - minLng) * 1.15, 0.015);
    const padLat = Math.max((maxLat - minLat) * 1.15, 0.015);

    return {
      dynamicCenter: [centerLng, centerLat] as [number, number],
      dynamicBounds: [
        [minLng - padLng, minLat - padLat],
        [maxLng + padLng, maxLat + padLat]
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
      zoom: 15.4,
      pitch: 45,
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

  // Construcción continua y auto-orientada de las coordenadas de la ruta (Cero zigzags y sin línea de retorno cruzada)
  const orderedRouteCoords = useMemo((): [number, number][] => {
    if (!selectedRoute || selectedRoute.stops.length === 0) return [];

    const sqDist = (a: [number, number], b: [number, number]) =>
      (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);

    const coords: [number, number][] = [];
    const pushDedup = (pt: [number, number]) => {
      if (coords.length === 0) {
        coords.push(pt);
        return;
      }
      const last = coords[coords.length - 1];
      if (Math.abs(last[0] - pt[0]) > 1e-6 || Math.abs(last[1] - pt[1]) > 1e-6) {
        coords.push(pt);
      }
    };

    const rawGeom = selectedRoute.geometry?.coordinates;
    if (rawGeom && rawGeom.length >= 2) {
      for (const pt of rawGeom) {
        pushDedup(pt);
      }
      // Si la geometría precalculada cerraba el bucle al inicio, recortamos el regreso final para no cruzar el mapa
      const firstStop = selectedRoute.stops[0].poi.coordinates;
      const lastStop = selectedRoute.stops[selectedRoute.stops.length - 1].poi.coordinates;
      if (
        selectedRoute.stops.length > 1 &&
        sqDist(firstStop, lastStop) > 1e-7 &&
        coords.length > 2 &&
        sqDist(coords[coords.length - 1], firstStop) < 1e-7
      ) {
        // Encontrar el índice donde se alcanzó la última parada
        let lastStopVertexIdx = -1;
        let bestD = Infinity;
        for (let i = 1; i < coords.length; i++) {
          const d = sqDist(coords[i], lastStop);
          if (d <= bestD) {
            bestD = d;
            lastStopVertexIdx = i;
          }
        }
        if (lastStopVertexIdx > 0 && lastStopVertexIdx < coords.length - 1) {
          return coords.slice(0, lastStopVertexIdx + 1);
        }
      }
      return coords;
    }

    // Reconstrucción orientada desde path_segments si no había geometry.coordinates
    const edgeMap = new Map(segments.map((s) => [s.id, s]));
    let currentPos = selectedRoute.stops[0].poi.coordinates;
    pushDedup(currentPos);

    for (const segId of selectedRoute.path_segments) {
      const seg = edgeMap.get(segId);
      if (seg && seg.geometry?.coordinates && seg.geometry.coordinates.length > 0) {
        const raw = seg.geometry.coordinates;
        const firstPt = raw[0];
        const lastPt = raw[raw.length - 1];
        const oriented =
          sqDist(currentPos, lastPt) < sqDist(currentPos, firstPt) ? [...raw].reverse() : raw;
        for (const pt of oriented) {
          pushDedup(pt);
        }
        currentPos = coords[coords.length - 1];
      }
    }

    return coords;
  }, [selectedRoute, segments]);

  const routeGeoJSON = useMemo(() => {
    if (!selectedRoute || orderedRouteCoords.length < 2) {
      return { type: 'FeatureCollection', features: [] } as any;
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
            coordinates: orderedRouteCoords
          }
        }
      ]
    } as any;
  }, [selectedRoute, orderedRouteCoords]);

  // Actualización de capas vectoriales
  const updateMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (!map.getSource('sidewalk-segments')) {
      map.addSource('sidewalk-segments', {
        type: 'geojson',
        data: segmentsGeoJSON
      });

      // Red peatonal base continua para evitar tramos huérfanos flotantes
      map.addLayer({
        id: 'sidewalk-network-base',
        type: 'line',
        source: 'sidewalk-segments',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#475569',
          'line-width': 2.0,
          'line-opacity': 0.25
        }
      });

      // Banquetas verificadas accesibles (Verde Esmeralda Poblano)
      map.addLayer({
        id: 'sidewalk-verified',
        type: 'line',
        source: 'sidewalk-segments',
        filter: ['all', ['get', 'is_verified'], ['get', 'transitable']],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#1D6B52',
          'line-width': 3.0,
          'line-opacity': 0.88
        }
      });

      // Barreras físicas / Escalones (Rojo Carmín de Alerta — distinto de talleres y gastronomía)
      map.addLayer({
        id: 'sidewalk-barriers',
        type: 'line',
        source: 'sidewalk-segments',
        filter: ['!', ['get', 'transitable']],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#DC2626',
          'line-width': 3.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.92
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
          'line-width': 13,
          'line-blur': 5,
          'line-opacity': 0.42
        }
      });

      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0F3078',
          'line-width': 7,
          'line-opacity': 0.96
        }
      });

      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#F0B43A',
          'line-width': 4,
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

  // Punto permanente "Dónde estoy" (Avatar 3D Gatito Talavera) + Evaluación de proximidad a POIs y Barreras
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    if (!userMarkerRef.current) {
      const avatarCtrl = createAvatar3D('/models/avatar.glb', 48, 62);
      avatarCtrlRef.current = avatarCtrl;

      const markerWrapper = document.createElement('div');
      markerWrapper.className =
        'relative flex flex-col items-center justify-center pointer-events-none z-40 transition-transform duration-150 ease-out';
      markerWrapper.style.transformOrigin = 'bottom center';
      markerWrapper.appendChild(avatarCtrl.container);

      const updateZoomScale = () => {
        if (!mapRef.current) return;
        const currentZoom = mapRef.current.getZoom();
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

    // 1. Evaluar proximidad a lugares cercanos (< 85m)
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

    // 2. Evaluar si el usuario se acerca a un tramo bloqueado según su perfil de movilidad (< 25m)
    let foundBarrier: { segmentId: string; reasonEs: string; reasonEn: string } | null = null;
    for (const seg of segments) {
      if (!seg.transitable[activeProfile] && seg.geometry?.coordinates?.length >= 2) {
        const coords = seg.geometry.coordinates;
        for (let i = 0; i < coords.length - 1; i++) {
          const d = getPointToSegmentMeters(userLocation, coords[i], coords[i + 1]);
          if (d <= 24) {
            const reasonEs = seg.has_steps
              ? `Escalones sin rampa (${seg.width_m}m ancho, ${seg.slope_pct}% pend.)`
              : `Banqueta angosta (${seg.width_m}m) o pendiente (${seg.slope_pct}%)`;
            const reasonEn = seg.has_steps
              ? `Steps without curb ramp (${seg.width_m}m width)`
              : `Narrow width (${seg.width_m}m) or slope (${seg.slope_pct}%)`;
            foundBarrier = { segmentId: seg.id, reasonEs, reasonEn };
            break;
          }
        }
        if (foundBarrier) break;
      }
    }
    setBarrierWarning(foundBarrier);
  }, [userLocation, isLoaded, language, pois, segments, activeProfile]);

  // Marcadores interactivos con Paleta Semántica Talavera y Micro-Iconografía SVG
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const stopsByPoiId = new Map(
      (selectedRoute?.stops || []).map((stop) => [stop.poi.id, stop])
    );

    // 1. Paradas activas del recorrido (Baliza vertical elevada + Medallón Volumétrico con acento de categoría)
    if (selectedRoute) {
      selectedRoute.stops.forEach((stop) => {
        const isSelected = stop.poi.id === selectedStopPoiId;
        const isNearby = proximityAlert?.poi.id === stop.poi.id;
        const theme = getPoiVisualTheme(stop.poi);

        const el = document.createElement('div');
        el.className = `flex flex-col items-center cursor-pointer select-none transition-all duration-300 ease-out ${
          isSelected || isNearby ? 'scale-115 z-40' : 'hover:scale-105 z-30'
        }`;

        el.innerHTML = `
          ${
            isSelected || isNearby
              ? `<div class="mb-1.5 px-3 py-1 rounded-xl bg-[#FAF6EE]/98 border-2 text-[10px] font-black text-[#0F3078] shadow-[0_6px_20px_rgba(15,48,120,0.35)] whitespace-nowrap animate-bounce flex items-center gap-1.5" style="border-color: ${theme.hex};">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${theme.hex};"></span>
                  <span>${stop.poi.name}</span>
                </div>`
              : ''
          }
          <div class="relative flex flex-col items-center">
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-1.5 rounded-full blur-sm ${
                isSelected || isNearby ? 'animate-pulse' : ''
              }" style="background-color: ${theme.hex}44;"></div>
              <div class="w-10 h-10 rounded-full p-0.5 shadow-[0_6px_18px_rgba(15,48,120,0.45)] flex items-center justify-center border-2 border-white transform transition-transform ${
                isSelected ? 'scale-110' : ''
              }" style="background: linear-gradient(135deg, #0F3078, ${theme.hex});">
                <div class="w-full h-full rounded-full bg-[#FAF6EE] p-0.5 flex items-center justify-center border" style="border-color: ${theme.hex};">
                  <div class="w-full h-full rounded-full border border-dashed flex items-center justify-center font-black text-sm text-[#0F3078] shadow-inner font-serif" style="border-color: ${theme.hex}88;">
                    <span>${stop.stop_order}</span>
                  </div>
                </div>
              </div>
              <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-white flex items-center justify-center shadow" style="background-color: ${theme.hex};">
                ${theme.svgIcon}
              </div>
            </div>

            <div class="w-1 h-5 shadow-[0_0_8px_rgba(15,48,120,0.6)]" style="background: linear-gradient(to bottom, ${theme.hex}, #0F3078);"></div>

            <div class="relative w-4 h-4 flex items-center justify-center">
              <div class="absolute inset-0 rounded-full animate-ping" style="background-color: ${theme.hex}55;"></div>
              <div class="w-2.5 h-2.5 rounded-full border-2 border-[#FAF6EE] shadow" style="background-color: ${theme.hex};"></div>
            </div>
          </div>
        `;

        const handleSelect = (e: Event) => {
          e.stopPropagation();
          onSelectPoi(stop.poi.id);
          if (onInspectStop) onInspectStop(stop.poi.id);
        };

        el.addEventListener('click', handleSelect);

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(stop.poi.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 2. Todos los demás lugares en el mapa con su color de categoría e icono propio
    pois.forEach((poi) => {
      if (stopsByPoiId.has(poi.id)) return;

      const isSelected = poi.id === selectedStopPoiId;
      const isNearby = proximityAlert?.poi.id === poi.id;
      const theme = getPoiVisualTheme(poi);

      const el = document.createElement('div');
      el.className = `flex flex-col items-center cursor-pointer transition-transform duration-300 ease-out ${
        isSelected || isNearby ? 'scale-125 z-30' : 'hover:scale-110 z-10'
      }`;

      el.innerHTML = `
        <div class="relative flex items-center justify-center p-0.5">
          ${
            isSelected || isNearby
              ? `<div class="absolute -inset-1 rounded-full animate-ping" style="background-color: ${theme.hex}66;"></div>`
              : ''
          }
          <div class="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center ring-1 ring-black/15" style="background-color: ${theme.hex};">
            ${theme.svgIcon}
          </div>
        </div>
        ${
          isSelected || isNearby
            ? `<div class="mt-0.5 px-2.5 py-0.5 rounded-lg border-2 bg-[#FAF6EE]/95 text-[9px] font-black shadow-xl whitespace-nowrap animate-fade-slide" style="color: ${theme.hex}; border-color: ${theme.hex};">
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
  }, [pois, selectedRoute, selectedStopPoiId, proximityAlert, isLoaded, onSelectPoi, onInspectStop]);

  // Botón "¿Dónde estoy?"
  const handleWhereAmI = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: userLocationRef.current,
        zoom: 16.4,
        pitch: is3D ? 48 : 0,
        duration: 900,
        essential: true
      });
    }

    if ('geolocation' in navigator && !isGpsTracking) {
      setIsGpsTracking(true);
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
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
  }, [is3D, isGpsTracking, onUserLocationChange]);

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
    bounds.extend(userLocationRef.current);

    map.fitBounds(bounds, {
      padding: { top: 80, bottom: 130, left: 50, right: 50 },
      maxZoom: 16.2,
      duration: 1200,
      essential: true
    });
  }, [selectedRoute]);

  useEffect(() => {
    if (selectedRoute && mapRef.current && isLoaded) {
      fitToRoute();
    }
  }, [selectedRoute, isLoaded, fitToRoute]);

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

  // ============================================================================
  // SISTEMA DUAL DE CONTROLES INTERACTIVOS (JOYSTICK TÁCTIL + MANDO XBOX USB + TECLADO)
  // ============================================================================

  // Detección de conexión de Mando Xbox / Gamepad USB o Bluetooth y Teclado WASD
  useEffect(() => {
    const onGamepadConnected = (e: GamepadEvent) => {
      setGamepadConnectedName(e.gamepad.id || 'Xbox / USB Controller');
      setShowJoystickPad(true);
    };
    const onGamepadDisconnected = () => {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      if (pads.length === 0) {
        setGamepadConnectedName(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysPressedRef.current.add(k);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Bucle de 60fps para Joystick Virtual, Mando de Xbox (Gamepad API), Teclado y Auto-Walk IA
  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();

    const stepLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      let vx = touchVectorRef.current.x;
      let vy = touchVectorRef.current.y;
      let camYawDelta = 0;
      let camPitchDelta = 0;
      let zoomDelta = 0;

      // 1. Lectura de Teclado (WASD / Flechas)
      const keys = keysPressedRef.current;
      if (keys.has('w') || keys.has('arrowup')) vy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) vy += 1;
      if (keys.has('a') || keys.has('arrowleft')) vx -= 1;
      if (keys.has('d') || keys.has('arrowright')) vx += 1;

      // 2. Lectura nativa de Mando de Xbox / Gamepad USB-Bluetooth
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const activePad = Array.from(gamepads).find((gp) => gp && gp.connected);

      if (activePad) {
        if (!gamepadConnectedName) {
          setGamepadConnectedName(activePad.id || 'Xbox Controller');
        }

        const deadzone = 0.16;
        const lx = activePad.axes[0] || 0;
        const ly = activePad.axes[1] || 0;
        const rx = activePad.axes[2] || 0;
        const ry = activePad.axes[3] || 0;

        if (Math.hypot(lx, ly) > deadzone) {
          vx += lx;
          vy += ly;
          setStickOffset({
            x: Math.max(-34, Math.min(34, lx * 34)),
            y: Math.max(-34, Math.min(34, ly * 34))
          });
        } else if (touchVectorRef.current.x === 0 && touchVectorRef.current.y === 0) {
          // D-Pad (botones 12=Up, 13=Down, 14=Left, 15=Right)
          if (activePad.buttons[12]?.pressed) vy -= 1;
          if (activePad.buttons[13]?.pressed) vy += 1;
          if (activePad.buttons[14]?.pressed) vx -= 1;
          if (activePad.buttons[15]?.pressed) vx += 1;
          if (vx === 0 && vy === 0) {
            setStickOffset({ x: 0, y: 0 });
          }
        }

        // Stick derecho: Rotación orbital 3D de la cámara (Bearing y Pitch)
        if (Math.abs(rx) > deadzone) camYawDelta = rx * 75 * dt;
        if (Math.abs(ry) > deadzone) camPitchDelta = -ry * 45 * dt;

        // Gatillos LT (6) y RT (7): Zoom Out / Zoom In
        const lt = activePad.buttons[6]?.value || 0;
        const rt = activePad.buttons[7]?.value || 0;
        if (lt > 0.1) zoomDelta -= lt * 1.8 * dt;
        if (rt > 0.1) zoomDelta += rt * 1.8 * dt;

        // Botones de acción con debounce de 320ms
        const canPress = (btnIdx: number) => {
          const prev = lastButtonPressRef.current[btnIdx] || 0;
          if (now - prev > 320) {
            lastButtonPressRef.current[btnIdx] = now;
            return true;
          }
          return false;
        };

        // Botón A (0): Inspeccionar lugar cercano
        if (activePad.buttons[0]?.pressed && canPress(0) && proximityAlert) {
          onSelectPoi(proximityAlert.poi.id);
          if (onInspectStop) onInspectStop(proximityAlert.poi.id);
        }
        // Botón X (2): Centrar cámara en el avatar
        if (activePad.buttons[2]?.pressed && canPress(2)) {
          handleWhereAmI();
        }
        // Botón Y (3): Alternar vista 3D / 2D
        if (activePad.buttons[3]?.pressed && canPress(3)) {
          toggle3D();
        }
      }

      // Aplicar rotación de cámara o zoom del mando Xbox si hubo entrada en stick derecho / gatillos
      const map = mapRef.current;
      if (map && (camYawDelta !== 0 || camPitchDelta !== 0 || zoomDelta !== 0)) {
        map.jumpTo({
          bearing: map.getBearing() + camYawDelta,
          pitch: Math.max(0, Math.min(65, map.getPitch() + camPitchDelta)),
          zoom: Math.max(13.5, Math.min(18.5, map.getZoom() + zoomDelta))
        });
      }

      // 3. Modo Auto-Recorrido IA (Camina automáticamente por los vértices de la ruta activa)
      if (isAutoWalking && orderedRouteCoords.length >= 2) {
        const prog = autoWalkProgressRef.current;
        if (prog.legIdx >= orderedRouteCoords.length - 1) {
          prog.legIdx = 0;
          prog.t = 0;
        }
        const pA = orderedRouteCoords[prog.legIdx];
        const pB = orderedRouteCoords[prog.legIdx + 1];
        const segDistM = Math.max(1, getDistanceMeters(pA, pB));
        const speedMps = 18 * walkSpeedMultiplier;
        prog.t += (speedMps * dt) / segDistM;

        if (prog.t >= 1) {
          prog.legIdx += 1;
          prog.t = 0;
          if (prog.legIdx >= orderedRouteCoords.length - 1) {
            setIsAutoWalking(false);
          }
        }

        const clampedIdx = Math.min(prog.legIdx, orderedRouteCoords.length - 2);
        const curA = orderedRouteCoords[clampedIdx];
        const curB = orderedRouteCoords[clampedIdx + 1];
        const nextLng = curA[0] + (curB[0] - curA[0]) * prog.t;
        const nextLat = curA[1] + (curB[1] - curA[1]) * prog.t;
        const nextCoords: [number, number] = [nextLng, nextLat];

        const headingRad = Math.atan2(curB[0] - curA[0], curB[1] - curA[1]);
        const headingDeg = (headingRad * 180) / Math.PI;
        if (avatarCtrlRef.current) {
          avatarCtrlRef.current.setHeading(headingDeg);
        }

        userLocationRef.current = nextCoords;
        onUserLocationChange(nextCoords);
        if (map) {
          map.jumpTo({ center: nextCoords });
        }
      } else if (Math.hypot(vx, vy) > 0.05) {
        // Si el usuario mueve el joystick o mando manualmente, pausar auto-walk
        if (isAutoWalking) setIsAutoWalking(false);

        const mag = Math.min(1, Math.hypot(vx, vy));
        const normX = vx / Math.hypot(vx, vy);
        const normY = vy / Math.hypot(vx, vy);

        // Orientar el movimiento respecto al ángulo actual de la cámara (bearing)
        const bearingRad = map ? (map.getBearing() * Math.PI) / 180 : 0;
        // En pantalla: normX > 0 es derecha (+Este), normY < 0 es arriba (+Norte)
        const forwardNorth = -normY;
        const rightEast = normX;

        const worldEast = rightEast * Math.cos(bearingRad) + forwardNorth * Math.sin(bearingRad);
        const worldNorth = -rightEast * Math.sin(bearingRad) + forwardNorth * Math.cos(bearingRad);

        // Velocidad base ~ 18 m/s en demo (ajustable con multiplicador 1x, 2x, 4x)
        const metersPerSec = 16 * walkSpeedMultiplier * mag;
        const dLat = ((worldNorth * metersPerSec * dt) / 111320);
        const dLng =
          ((worldEast * metersPerSec * dt) /
            (111320 * Math.cos((userLocationRef.current[1] * Math.PI) / 180)));

        const nextCoords: [number, number] = [
          userLocationRef.current[0] + dLng,
          userLocationRef.current[1] + dLat
        ];

        const headingDeg = (Math.atan2(worldEast, worldNorth) * 180) / Math.PI;
        if (avatarCtrlRef.current) {
          avatarCtrlRef.current.setHeading(headingDeg);
        }

        userLocationRef.current = nextCoords;
        onUserLocationChange(nextCoords);

        if (map) {
          map.jumpTo({ center: nextCoords });
        }

        // Vibración háptica en el mando Xbox si topa con una barrera en silla de ruedas
        if (
          activePad &&
          (activePad as any).vibrationActuator &&
          barrierWarning &&
          now - lastRumbleTimeRef.current > 1200
        ) {
          lastRumbleTimeRef.current = now;
          (activePad as any).vibrationActuator
            .playEffect('dual-rumble', {
              startDelay: 0,
              duration: 180,
              weakMagnitude: 0.5,
              strongMagnitude: 0.8
            })
            .catch(() => {});
        }
      }

      animFrameId = requestAnimationFrame(stepLoop);
    };

    animFrameId = requestAnimationFrame(stepLoop);
    return () => cancelAnimationFrame(animFrameId);
  }, [
    walkSpeedMultiplier,
    isAutoWalking,
    orderedRouteCoords,
    gamepadConnectedName,
    proximityAlert,
    barrierWarning,
    onUserLocationChange,
    onSelectPoi,
    onInspectStop,
    handleWhereAmI,
    toggle3D
  ]);

  // Handlers de gestos para el Joystick Táctil Virtual (Móvil y Mouse)
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const isDraggingStickRef = useRef(false);
  const [isDraggingStick, setIsDraggingStick] = useState(false);
  const [isJoystickMinimized, setIsJoystickMinimized] = useState(false);

  const updateStickFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = 34;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) {
      setStickOffset({ x: 0, y: 0 });
      touchVectorRef.current = { x: 0, y: 0 };
      return;
    }

    const clampedDist = Math.min(maxRadius, dist);
    const angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * clampedDist;
    const oy = Math.sin(angle) * clampedDist;

    setStickOffset({ x: ox, y: oy });
    touchVectorRef.current = {
      x: ox / maxRadius,
      y: oy / maxRadius
    };
  }, []);

  const handleStickPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingStickRef.current = true;
    setIsDraggingStick(true);
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const handleStickPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingStickRef.current) return;
    e.stopPropagation();
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const handleStickPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDraggingStickRef.current = false;
    setIsDraggingStick(false);
    setStickOffset({ x: 0, y: 0 });
    touchVectorRef.current = { x: 0, y: 0 };
  };

  // Pulso Urbano: busca el lugar más cercano al usuario
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
    <div className="relative w-full h-full overflow-hidden bg-[var(--surface-solid)] select-none">
      {/* Lienzo de mapa de pantalla completa */}
      <div ref={mapContainerRef} className="w-full h-full touch-none" />

      {/* Alerta en Tiempo Real de Barrera Peatonal (Demostración de Poda de Grafo IA) */}
      {barrierWarning && (
        <div className="absolute top-28 left-3 right-16 sm:left-4 sm:right-auto sm:max-w-xs z-20 pointer-events-none animate-fade-slide">
          <div className="bg-red-950/95 text-white px-3 py-2 rounded-2xl border-2 border-red-500 shadow-xl flex items-center gap-2.5 backdrop-blur-md">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 animate-bounce" />
            <div className="text-[11px] leading-tight">
              <span className="font-black uppercase tracking-wider text-red-300 block text-[9px]">
                {language === 'es'
                  ? `Barrera Detectada (${activeProfile.replace(/_/g, ' ')})`
                  : `Barrier Detected (${activeProfile})`}
              </span>
              <span className="font-bold">
                {language === 'es' ? barrierWarning.reasonEs : barrierWarning.reasonEn}
              </span>
            </div>
          </div>
        </div>
      )}

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
        {/* Lado Izquierdo: Insignia de Estado, Ruta Activa e Indicador de Mando Xbox */}
        <div className="flex flex-col gap-1.5 pointer-events-auto max-w-[calc(100%-60px)]">
          {selectedRoute ? (
            <div className="flex items-center gap-2 bg-[#FAF6EE]/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border-2 border-[#0F3078] shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1D6B52] animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(29,107,82,0.8)]" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold tracking-wider uppercase text-[#1D6B52] leading-none">
                  {language === 'es' ? 'Ruta Activa • Sin Retorno Cruzado' : 'Active Route'}
                </span>
                <span className="text-xs font-black text-[#0F3078] truncate leading-tight mt-0.5">
                  {selectedRoute.name}
                </span>
              </div>
              {orderedRouteCoords.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isAutoWalking) {
                      autoWalkProgressRef.current = { legIdx: 0, t: 0 };
                    }
                    setIsAutoWalking((v) => !v);
                  }}
                  className={`ml-1 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 transition cursor-pointer ${
                    isAutoWalking
                      ? 'bg-[#B84A2C] text-white'
                      : 'bg-[#0F3078] text-[#FAF6EE] hover:bg-[#1B49AC]'
                  }`}
                  title={
                    language === 'es'
                      ? 'Simular caminata automática por las paradas de la ruta'
                      : 'Simulate automatic walk along route stops'
                  }
                >
                  {isAutoWalking ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isAutoWalking ? 'Pausa' : 'Simular'}</span>
                </button>
              )}
              {onClearRoute && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoWalking(false);
                    onClearRoute();
                  }}
                  className="ml-0.5 p-1 rounded-lg bg-[#0F3078]/10 hover:bg-rose-500/20 text-[#0F3078] hover:text-rose-700 transition cursor-pointer"
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

          {gamepadConnectedName && (
            <div className="inline-flex items-center gap-1.5 bg-[#0F3078]/95 text-[#FAF6EE] px-2.5 py-1 rounded-xl border border-[#F0B43A] shadow-lg text-[10px] font-bold w-fit">
              <Gamepad2 className="w-3.5 h-3.5 text-[#F0B43A]" />
              <span>
                {language === 'es'
                  ? 'Mando Xbox Activo • Stick Izq: Caminar | Der: Cámara 3D | A: Ver'
                  : 'Xbox Pad Active • L-Stick: Walk | R-Stick: 3D Cam | A: Open'}
              </span>
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

          {/* Botón Mostrar/Ocultar Joystick Táctil y Controlador */}
          <button
            type="button"
            onClick={() => setShowJoystickPad((v) => !v)}
            className={`w-10 h-10 rounded-2xl backdrop-blur-md border-2 shadow-lg flex items-center justify-center transition-all cursor-pointer ${
              showJoystickPad
                ? 'bg-[#D48914] text-white border-white'
                : 'bg-[#FAF6EE]/95 text-[#0F3078] border-[#0F3078]'
            }`}
            aria-label={language === 'es' ? 'Mostrar u ocultar Joystick Virtual' : 'Toggle Virtual Joystick'}
            title={
              language === 'es'
                ? 'Joystick Táctil / Mando Xbox / Teclado WASD'
                : 'Touch Joystick / Xbox Controller / WASD'
            }
          >
            <Gamepad2 className="w-4 h-4" />
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

      {/* Joystick Virtual Táctil Flotante (Teléfono / Mouse / Indicador de Mando Xbox) */}
      {showJoystickPad && (
        <div className="absolute bottom-24 sm:bottom-28 left-3 sm:left-4 z-30 pointer-events-auto">
          {isJoystickMinimized ? (
            <button
              type="button"
              onClick={() => setIsJoystickMinimized(false)}
              className="h-9 px-3 rounded-2xl bg-[#FAF6EE]/95 hover:bg-[#FFFDF9] text-[#0F3078] border-2 border-[#0F3078] shadow-lg backdrop-blur-md flex items-center gap-1.5 font-bold text-xs cursor-pointer transition-all duration-200 active:scale-95"
              title={language === 'es' ? 'Abrir joystick de exploración' : 'Open exploration joystick'}
            >
              <Gamepad2 className="w-4 h-4 text-[#D48914]" />
              <span className="text-[11px] font-black">{language === 'es' ? 'Control' : 'Joystick'}</span>
              <ChevronUp className="w-3.5 h-3.5 text-[#0F3078]/70 ml-0.5" />
            </button>
          ) : (
            <div className="bg-[#FAF6EE]/95 backdrop-blur-xl border-2 border-[#0F3078] shadow-[0_12px_32px_rgba(15,48,120,0.25)] rounded-3xl p-2.5 flex flex-col items-center gap-2 select-none w-36 transition-all duration-300">
              {/* Header con título y botón de minimizar */}
              <div className="w-full flex items-center justify-between pb-1 border-b border-[#0F3078]/15 px-0.5">
                <div className="flex items-center gap-1.5 text-[#0F3078]">
                  <Gamepad2 className="w-3.5 h-3.5 text-[#D48914]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {language === 'es' ? 'Control' : 'Joystick'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsJoystickMinimized(true)}
                  className="w-5 h-5 rounded-lg text-[#0F3078]/70 hover:text-[#0F3078] hover:bg-[#0F3078]/10 flex items-center justify-center transition cursor-pointer"
                  title={language === 'es' ? 'Minimizar control' : 'Minimize controller'}
                  aria-label={language === 'es' ? 'Minimizar control' : 'Minimize controller'}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Selector de velocidad de exploración */}
              <div className="flex items-center w-full bg-[#0F3078]/8 p-0.5 rounded-xl border border-[#0F3078]/20">
                {([1, 2, 4] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setWalkSpeedMultiplier(spd)}
                    className={`flex-1 py-0.5 text-[10px] font-black rounded-lg transition cursor-pointer ${
                      walkSpeedMultiplier === spd
                        ? 'bg-[#0F3078] text-[#FAF6EE] shadow-sm'
                        : 'text-[#0F3078]/70 hover:text-[#0F3078]'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Pad Analógico Circular Talavera */}
              <div
                ref={joystickBaseRef}
                onPointerDown={handleStickPointerDown}
                onPointerMove={handleStickPointerMove}
                onPointerUp={handleStickPointerUp}
                onPointerCancel={handleStickPointerUp}
                className="relative w-24 h-24 rounded-full bg-gradient-to-b from-[#FAF6EE] to-[#E9DFCF] border-2 border-[#0F3078] shadow-[inset_0_3px_8px_rgba(15,48,120,0.2),0_6px_16px_rgba(15,48,120,0.15)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
                title={
                  language === 'es'
                    ? 'Arrastra para caminar (Compatible con Mando Xbox y WASD)'
                    : 'Drag to walk (Xbox Controller & WASD supported)'
                }
              >
                {/* Guía direccional Talavera */}
                <div className="w-16 h-16 rounded-full border border-dashed border-[#0F3078]/25 pointer-events-none flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#0F3078]/25" />
                </div>

                {/* Flechas direccionales ortogonales */}
                <span className="absolute top-1 text-[8px] font-black text-[#0F3078]/40 pointer-events-none select-none">▲</span>
                <span className="absolute bottom-1 text-[8px] font-black text-[#0F3078]/40 pointer-events-none select-none">▼</span>
                <span className="absolute left-1.5 text-[8px] font-black text-[#0F3078]/40 pointer-events-none select-none">◀</span>
                <span className="absolute right-1.5 text-[8px] font-black text-[#0F3078]/40 pointer-events-none select-none">▶</span>

                {/* Stick móvil con respuesta instantánea sin lag */}
                <div
                  style={{
                    transform: `translate3d(${stickOffset.x}px, ${stickOffset.y}px, 0)`
                  }}
                  className={`w-10 h-10 rounded-full bg-gradient-to-tr from-[#0F3078] via-[#1B49AC] to-[#D48914] border-2 border-white shadow-[0_4px_12px_rgba(15,48,120,0.5)] flex items-center justify-center pointer-events-none ${
                    isDraggingStick ? 'transition-none scale-105' : 'transition-transform duration-200 ease-out'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FAF6EE] border border-[#0F3078]/40 shadow-inner" />
                </div>
              </div>

              {/* Indicador de hardware / estado de entrada */}
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#0F3078] bg-[#0F3078]/8 px-2 py-0.5 rounded-full border border-[#0F3078]/15 max-w-full truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    stickOffset.x !== 0 || stickOffset.y !== 0
                      ? 'bg-emerald-500 animate-pulse'
                      : gamepadConnectedName
                      ? 'bg-emerald-500'
                      : 'bg-[#D48914]'
                  }`}
                />
                <span className="truncate">
                  {gamepadConnectedName
                    ? 'Xbox USB'
                    : stickOffset.x !== 0 || stickOffset.y !== 0
                    ? (language === 'es' ? 'Caminando' : 'Walking')
                    : (language === 'es' ? 'Táctil / WASD' : 'Touch / WASD')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guía del Mapa Poblano (Simbología Sincronizada con Avatar 3D y 4 Categorías) */}
      <div className="absolute bottom-24 sm:bottom-28 right-3 sm:right-4 z-20 flex items-center gap-2">
        {showLegend ? (
          <div className="bg-[#FAF6EE]/98 backdrop-blur-md p-3.5 rounded-2xl border-2 border-[#0F3078] text-xs text-[#162035] shadow-2xl space-y-1.5 transition-all duration-300 max-w-[250px]">
            <div className="flex items-center justify-between font-bold text-[#0F3078] uppercase tracking-wider text-[10px] pb-1 border-b border-[#0F3078]/20 gap-4">
              <span>{language === 'es' ? 'Simbología Talavera' : 'Puebla Map Guide'}</span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-[#0F3078] hover:text-[#B84A2C] p-0.5 rounded hover:bg-[#DCE6F9] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#0F3078] text-[#EDE28E] border border-[#EDE28E] inline-flex items-center justify-center text-[9px] font-black">
                🐱
              </span>
              <span className="text-[11px] font-bold text-[#0F3078]">
                {language === 'es' ? 'Tu Avatar 3D (Gatito Talavera)' : 'Your 3D Avatar'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#FAF6EE] border-2 border-[#0F3078] inline-flex items-center justify-center text-[9px] font-black text-[#0F3078]">
                1
              </span>
              <span className="text-[11px] font-bold text-[#0F3078]">
                {language === 'es' ? 'Paradas de tu ruta (Platos 3D)' : 'Active route stops'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#0F3078] border border-white inline-block"></span>
              <span className="text-[11px] font-semibold text-[#0F3078]">
                {language === 'es' ? 'Patrimonio, Templos y Museos' : 'Heritage & Museums'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#D48914] border border-white inline-block"></span>
              <span className="text-[11px] font-semibold text-[#9E650C]">
                {language === 'es' ? 'Talleres Artesanales (Talavera/Barro)' : 'Artisan Workshops'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#C35328] border border-white inline-block"></span>
              <span className="text-[11px] font-semibold text-[#C35328]">
                {language === 'es' ? 'Gastronomía Tradicional de Barrio' : 'Traditional Gastronomy'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#1D6B52] border border-white inline-block"></span>
              <span className="text-[11px] font-semibold text-[#1D6B52]">
                {language === 'es' ? 'Plazas, Murales y Miradores' : 'Plazas & Viewpoints'}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-[#0F3078]/15">
              <span className="w-4 h-1 bg-[#1D6B52] inline-block rounded"></span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-[#1D6B52]">
                <ShieldCheck className="w-3 h-3 text-[#1D6B52]" />
                {language === 'es' ? 'Banqueta accesible verificada' : 'Verified accessible sidewalk'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-[#DC2626] inline-block rounded"></span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-[#DC2626]">
                <AlertTriangle className="w-3 h-3 text-[#DC2626]" />
                {language === 'es' ? 'Escalón o barrera física' : 'Step or physical barrier'}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className="px-3 py-1.5 bg-[#FAF6EE]/95 backdrop-blur-md rounded-xl border-2 border-[#0F3078] text-[#0F3078] hover:bg-[#FFFDF9] shadow-lg text-xs flex items-center gap-1.5 transition-all duration-300 cursor-pointer font-bold"
          >
            <Hand className="w-3.5 h-3.5 text-[#D48914]" />
            <span className="text-[11px]">
              {language === 'es' ? 'Simbología • Categorías' : 'Map Legend'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
