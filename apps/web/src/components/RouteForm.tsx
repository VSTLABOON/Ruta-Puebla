import type { FC } from 'react';
import { MobilityProfile, RouteRequest, POI, Language } from '@ruta-abierta/shared-types';
import { Sliders, Clock, DollarSign, Compass, Search, UserCheck } from 'lucide-react';

interface RouteFormProps {
  request: RouteRequest;
  onChangeRequest: (updated: Partial<RouteRequest>) => void;
  onGenerate: () => void;
  pois: POI[];
  language: Language;
}

const AVAILABLE_INTERESTS = [
  { id: 'patrimonio', labelEs: 'Patrimonio historico', labelEn: 'Historic heritage' },
  { id: 'arte_sacro', labelEs: 'Arte sacro', labelEn: 'Sacred art' },
  { id: 'museo', labelEs: 'Museos', labelEn: 'Museums' },
  { id: 'gastronomia', labelEs: 'Gastronomia poblana', labelEn: 'Puebla cuisine' },
  { id: 'artesania', labelEs: 'Artesanias y talavera', labelEn: 'Crafts and Talavera' },
  { id: 'espacio_publico', labelEs: 'Plazas y parques', labelEn: 'Public squares' },
  { id: 'comercio_local', labelEs: 'Comercio local tradicional', labelEn: 'Local neighborhood shops' }
];

export const RouteForm: FC<RouteFormProps> = ({
  request,
  onChangeRequest,
  onGenerate,
  pois,
  language
}) => {
  const toggleInterest = (interestId: string) => {
    const current = new Set(request.interests);
    if (current.has(interestId)) {
      current.delete(interestId);
    } else {
      current.add(interestId);
    }
    onChangeRequest({ interests: Array.from(current) });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-slate-700" />
          {language === 'es' ? 'Parametros de Ruta' : 'Route Parameters'}
        </h2>
        <span className="text-xs bg-emerald-50 text-emerald-800 font-medium px-2 py-0.5 rounded border border-emerald-200">
          {language === 'es' ? 'Modo sin conexion activo' : 'Offline mode active'}
        </span>
      </div>

      {/* 1. Perfil de Movilidad */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          {language === 'es' ? 'Perfil de Movilidad' : 'Mobility Profile'}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(
            [
              {
                id: 'sin_restriccion',
                labelEs: 'Sin restriccion',
                labelEn: 'Standard walking',
                descEs: 'Paso continuo estandar',
                descEn: 'Standard pedestrian paths'
              },
              {
                id: 'movilidad_reducida',
                labelEs: 'Movilidad reducida',
                labelEn: 'Reduced mobility',
                descEs: 'Pendiente max 8%, sin escalones',
                descEn: 'Max slope 8%, no steps'
              },
              {
                id: 'silla_de_ruedas',
                labelEs: 'Silla de ruedas',
                labelEn: 'Wheelchair user',
                descEs: 'Paso min 0.9m, rampas obligatorias',
                descEn: 'Clear width >=0.9m, curb ramps'
              }
            ] as const
          ).map((prof) => {
            const isSelected = request.profile === prof.id;
            return (
              <button
                key={prof.id}
                type="button"
                onClick={() => onChangeRequest({ profile: prof.id as MobilityProfile })}
                className={`p-3 rounded-lg border text-left transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800'
                }`}
              >
                <div className="text-xs font-bold">
                  {language === 'es' ? prof.labelEs : prof.labelEn}
                </div>
                <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {language === 'es' ? prof.descEs : prof.descEn}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tiempo y Presupuesto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              {language === 'es' ? 'Tiempo maximo:' : 'Time budget:'}
            </label>
            <span className="text-xs font-bold text-slate-900">{request.max_time_min} min</span>
          </div>
          <input
            type="range"
            min="60"
            max="360"
            step="30"
            value={request.max_time_min}
            onChange={(e) => onChangeRequest({ max_time_min: Number(e.target.value) })}
            className="w-full accent-slate-900"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>1h</span>
            <span>3h</span>
            <span>6h</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-slate-500" />
              {language === 'es' ? 'Presupuesto maximo:' : 'Budget limit:'}
            </label>
            <span className="text-xs font-bold text-slate-900">${request.max_budget_mxn} MXN</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="50"
            value={request.max_budget_mxn}
            onChange={(e) => onChangeRequest({ max_budget_mxn: Number(e.target.value) })}
            className="w-full accent-slate-900"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>$0 (Gratis)</span>
            <span>$250</span>
            <span>$500</span>
          </div>
        </div>
      </div>

      {/* 3. Punto de partida */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-slate-500" />
          {language === 'es' ? 'Punto de Inicio de la Ruta' : 'Starting Point'}
        </label>
        <select
          value={request.start_poi_id}
          onChange={(e) => onChangeRequest({ start_poi_id: e.target.value })}
          className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          {pois.map((poi) => (
            <option key={poi.id} value={poi.id}>
              {poi.name} ({poi.zone.replace(/_/g, ' ')})
            </option>
          ))}
        </select>
      </div>

      {/* 4. Control deslizante: Clasica vs Local */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-semibold text-slate-700">
            {language === 'es' ? 'Orientacion de la ruta:' : 'Route orientation:'}
          </label>
          <span className="text-xs font-bold text-slate-900">
            {request.balance_local_pct <= 30
              ? (language === 'es' ? 'Predominio Clasico (Zocalo)' : 'Classic Core')
              : request.balance_local_pct >= 70
              ? (language === 'es' ? 'Enfoque en Barrios Locales' : 'Neighborhoods Focus')
              : (language === 'es' ? 'Itinerario Equilibrado' : 'Balanced Route')}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={request.balance_local_pct}
          onChange={(e) => onChangeRequest({ balance_local_pct: Number(e.target.value) })}
          className="w-full accent-amber-600"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
          <span>{language === 'es' ? 'Mas clasica (Zocalo)' : 'More classic (Core)'}</span>
          <span>{language === 'es' ? 'Mas local (Analco, Luz, Alto, Xanenetla)' : 'More local (Barrios)'}</span>
        </div>
      </div>

      {/* 5. Chips de interes */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          {language === 'es' ? 'Intereses Tematicos' : 'Theme Interests'}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_INTERESTS.map((item) => {
            const isSelected = request.interests.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  isSelected
                    ? 'bg-amber-100 border-amber-400 text-amber-900 font-semibold'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {language === 'es' ? item.labelEs : item.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Texto libre */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          {language === 'es' ? 'Texto libre o busqueda especifica (opcional)' : 'Free text search (optional)'}
        </label>
        <input
          type="text"
          value={request.free_text || ''}
          onChange={(e) => onChangeRequest({ free_text: e.target.value })}
          placeholder={language === 'es' ? 'Ej. ceramica, cemitas, murales, barroco...' : 'E.g. ceramics, sandwiches, murals, baroque...'}
          className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <div className="text-[10px] text-slate-400 mt-1">
          {language === 'es'
            ? 'En modo fuera de linea, la consulta se coteja con terminos lematizados y chips estructurados.'
            : 'In offline mode, query is matched against normalized tokens and structured chips.'}
        </div>
      </div>

      {/* Boton principal de generacion */}
      <button
        type="button"
        onClick={onGenerate}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-lg text-sm shadow transition flex items-center justify-center gap-2"
      >
        <UserCheck className="w-4 h-4 text-amber-400" />
        {language === 'es' ? 'Calcular Ruta Optimizada' : 'Generate Optimized Route'}
      </button>
    </div>
  );
};
