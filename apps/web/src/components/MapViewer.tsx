import { useState, useMemo } from 'react';
import type { FC, MouseEvent } from 'react';
import { Segment, POI, RouteAlternative, MobilityProfile } from '@ruta-abierta/shared-types';
import { ZoomIn, ZoomOut, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react';

interface MapViewerProps {
  segments: Segment[];
  pois: POI[];
  selectedRoute: RouteAlternative | null;
  activeProfile: MobilityProfile;
  selectedStopPoiId: string | null;
  onSelectPoi: (poiId: string) => void;
  language: 'es' | 'en';
}

export const MapViewer: FC<MapViewerProps> = ({
  segments,
  pois,
  selectedRoute,
  activeProfile,
  selectedStopPoiId,
  onSelectPoi,
  language
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null);

  // Extremos geograficos de la zona piloto (Centro Historico y barrios aledanos)
  const bounds = useMemo(() => {
    return {
      minLon: -98.2020,
      maxLon: -98.1880,
      minLat: 19.0395,
      maxLat: 19.0510
    };
  }, []);

  const svgWidth = 800;
  const svgHeight = 650;

  // Proyeccion Mercator local a coordenadas SVG
  const project = (coords: [number, number]): [number, number] => {
    const [lon, lat] = coords;
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * svgWidth;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * svgHeight;
    return [x, y];
  };

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Conjunto de segmentos que forman parte de la ruta activa
  const routeSegmentIds = useMemo(() => {
    return new Set(selectedRoute ? selectedRoute.path_segments : []);
  }, [selectedRoute]);

  // Posiciones de paradas numeradas
  const stopMarkers = useMemo(() => {
    if (!selectedRoute) return [];
    return selectedRoute.stops.map((stop) => {
      const [x, y] = project(stop.poi.coordinates);
      return {
        stopOrder: stop.stop_order,
        poi: stop.poi,
        x,
        y,
        isSelected: stop.poi.id === selectedStopPoiId
      };
    });
  }, [selectedRoute, selectedStopPoiId]);

  return (
    <div className="relative w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner select-none">
      {/* Controles de navegacion */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-800/90 backdrop-blur p-1.5 rounded-lg border border-slate-700 shadow">
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          className="p-2 text-slate-200 hover:bg-slate-700 rounded transition"
          aria-label="Acercar mapa"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
          className="p-2 text-slate-200 hover:bg-slate-700 rounded transition"
          aria-label="Alejar mapa"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={resetView}
          className="p-2 text-slate-200 hover:bg-slate-700 rounded transition"
          aria-label="Restablecer vista"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Leyenda interactiva */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-800/95 backdrop-blur p-3.5 rounded-lg border border-slate-700 text-xs text-slate-200 shadow max-w-xs space-y-2">
        <div className="font-semibold text-slate-100 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-700">
          {language === 'es' ? 'Simbologia de Red' : 'Network Legend'}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-1 bg-amber-400 inline-block rounded"></span>
          <span>{language === 'es' ? 'Ruta activa optimizada' : 'Active optimized route'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-0.5 bg-emerald-400 inline-block"></span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {language === 'es' ? 'Tramo verificado (alta confianza)' : 'Verified segment (high confidence)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-0.5 border-t border-dashed border-slate-400 inline-block"></span>
          <span>{language === 'es' ? 'Tramo inferido (baja confianza)' : 'Inferred segment (low confidence)'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-0.5 bg-rose-500 inline-block"></span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            {language === 'es' ? 'No transitable para perfil actual' : 'Inaccessible for active profile'}
          </span>
        </div>
      </div>

      {/* Info tooltip de segmento al pasar cursor */}
      {hoveredSegment && (
        <div className="absolute top-4 left-4 z-20 bg-slate-800/95 p-3 rounded-lg border border-slate-700 text-xs text-slate-200 shadow pointer-events-none max-w-sm">
          <div className="font-semibold text-amber-400">{hoveredSegment.id}</div>
          <div>Zona: {hoveredSegment.zone.replace(/_/g, ' ')}</div>
          <div>Longitud: {hoveredSegment.length_m} m | Ancho: {hoveredSegment.width_m} m</div>
          <div>Pendiente: {hoveredSegment.slope_pct}% | Superficie: {hoveredSegment.surface}</div>
          <div className="mt-1 pt-1 border-t border-slate-700">
            Confianza de auditoria: {(hoveredSegment.confidence * 100).toFixed(0)}% ({hoveredSegment.is_verified ? 'Verificado' : 'No verificado'})
          </div>
          <div className={hoveredSegment.transitable[activeProfile] ? 'text-emerald-400' : 'text-rose-400'}>
            Transitabilidad ({activeProfile}): {hoveredSegment.transitable[activeProfile] ? 'Transitable' : 'Bloqueado'}
          </div>
        </div>
      )}

      {/* Contenedor SVG del mapa */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          transform-origin="center"
        >
          {/* Fondo cuadricula de referencia urbana */}
          <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#0f172a" />

          {/* Trazado de tramos de acera */}
          {segments.map((seg) => {
            const [x1, y1] = project(seg.geometry.coordinates[0]);
            const [x2, y2] = project(seg.geometry.coordinates[1]);
            const isRouteEdge = routeSegmentIds.has(seg.id);
            const isTransitable = seg.transitable[activeProfile];

            let strokeColor = '#475569';
            let strokeWidth = 1.5;
            let strokeDash = seg.is_verified ? 'none' : '4, 4';

            if (!isTransitable) {
              strokeColor = '#f43f5e';
              strokeWidth = 2.0;
            } else if (seg.is_verified) {
              strokeColor = '#10b981';
              strokeWidth = 2.0;
            } else {
              strokeColor = '#64748b';
            }

            if (isRouteEdge) {
              strokeColor = '#fbbf24';
              strokeWidth = 4.5;
              strokeDash = 'none';
            }

            return (
              <line
                key={seg.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDash}
                strokeLinecap="round"
                className="transition-all hover:stroke-amber-300 hover:stroke-[5px] cursor-pointer"
                onMouseEnter={() => setHoveredSegment(seg)}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            );
          })}

          {/* Marcadores de todos los POIs disponibles */}
          {pois.map((poi) => {
            const [x, y] = project(poi.coordinates);
            const isSelected = poi.id === selectedStopPoiId;
            const isStop = stopMarkers.find((s) => s.poi.id === poi.id);

            if (isStop) return null; // Los marcadores de parada se dibujan encima

            return (
              <g
                key={poi.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                onClick={() => onSelectPoi(poi.id)}
              >
                <circle
                  r={isSelected ? 6 : 4}
                  fill={poi.is_local_business ? '#38bdf8' : '#94a3b8'}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          {/* Marcadores numerados de paradas en la ruta activa */}
          {stopMarkers.map((marker) => (
            <g
              key={`stop-${marker.poi.id}`}
              transform={`translate(${marker.x}, ${marker.y})`}
              className="cursor-pointer"
              onClick={() => onSelectPoi(marker.poi.id)}
            >
              <circle
                r={marker.isSelected ? 16 : 13}
                fill={marker.isSelected ? '#d97706' : '#f59e0b'}
                stroke="#ffffff"
                strokeWidth="2.5"
                className="filter drop-shadow-md"
              />
              <text
                textAnchor="middle"
                dy="4.5"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
              >
                {marker.stopOrder}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};
