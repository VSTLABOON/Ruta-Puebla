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
  { id: 'patrimonio', labelEs: 'Patrimonio histórico', labelEn: 'Historic heritage' },
  { id: 'arte_sacro', labelEs: 'Arte sacro', labelEn: 'Sacred art' },
  { id: 'museo', labelEs: 'Museos', labelEn: 'Museums' },
  { id: 'gastronomia', labelEs: 'Gastronomía poblana', labelEn: 'Puebla cuisine' },
  { id: 'artesania', labelEs: 'Artesanías y talavera', labelEn: 'Crafts and Talavera' },
  { id: 'espacio_publico', labelEs: 'Plazas y miradores', labelEn: 'Public squares' },
  { id: 'comercio_local', labelEs: 'Comercio tradicional', labelEn: 'Local shops' }
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
    <div className="bg-slate-900/90 rounded-2xl border border-white/10 p-4 shadow-xl space-y-5 text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          {language === 'es' ? 'Personaliza tu Recorrido' : 'Customize Your Walk'}
        </h2>
      </div>

      {/* 1. Perfil de Movilidad */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          {language === 'es' ? '¿Cómo prefieres caminar?' : 'Walking comfort'}
        </label>
        <div className="grid grid-cols-1 gap-2">
          {(
            [
              {
                id: 'sin_restriccion',
                labelEs: 'Caminata estándar',
                labelEn: 'Standard walk',
                descEs: 'Todo tipo de calles y callejones tradicionales',
                descEn: 'All historic streets and alleys'
              },
              {
                id: 'movilidad_reducida',
                labelEs: 'Paso cómodo sin escalones',
                labelEn: 'Step-free gentle walk',
                descEs: 'Calles planas, descansadas y sin desniveles bruscos',
                descEn: 'Gentle streets without steps'
              },
              {
                id: 'silla_de_ruedas',
                labelEs: 'Silla de ruedas o carriola',
                labelEn: 'Wheelchair or stroller',
                descEs: 'Banquetas amplias verificadas con rampas continuas',
                descEn: 'Wide verified sidewalks with curb ramps'
              }
            ] as const
          ).map((prof) => {
            const isSelected = request.profile === prof.id;
            return (
              <button
                key={prof.id}
                type="button"
                onClick={() => onChangeRequest({ profile: prof.id as MobilityProfile })}
                className={`p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/20 text-white shadow-sm'
                    : 'border-white/10 hover:border-white/20 bg-slate-950/70 text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">
                  {language === 'es' ? prof.labelEs : prof.labelEn}
                </div>
                <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-amber-200' : 'text-slate-400'}`}>
                  {language === 'es' ? prof.descEs : prof.descEn}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tiempo y Presupuesto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {language === 'es' ? 'Duración:' : 'Duration:'}
            </label>
            <span className="text-xs font-bold text-amber-400">{request.max_time_min} min</span>
          </div>
          <input
            type="range"
            min="60"
            max="360"
            step="30"
            value={request.max_time_min}
            onChange={(e) => onChangeRequest({ max_time_min: Number(e.target.value) })}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>1 hora</span>
            <span>3 horas</span>
            <span>6 horas</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              {language === 'es' ? 'Gasto estimado:' : 'Budget:'}
            </label>
            <span className="text-xs font-bold text-emerald-400">${request.max_budget_mxn} MXN</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="50"
            value={request.max_budget_mxn}
            onChange={(e) => onChangeRequest({ max_budget_mxn: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>Gratis</span>
            <span>$250</span>
            <span>$500</span>
          </div>
        </div>
      </div>

      {/* 3. Punto de partida */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          {language === 'es' ? 'Punto de partida' : 'Starting location'}
        </label>
        <select
          value={request.start_poi_id}
          onChange={(e) => onChangeRequest({ start_poi_id: e.target.value })}
          className="w-full border border-white/15 rounded-xl p-2.5 text-xs text-white bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {pois.map((poi) => (
            <option key={poi.id} value={poi.id}>
              {poi.name} ({poi.zone.replace(/_/g, ' ')})
            </option>
          ))}
        </select>
      </div>

      {/* 4. Orientación: Zócalo vs Barrios */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-semibold text-slate-300">
            {language === 'es' ? 'Estilo de ruta:' : 'Route style:'}
          </label>
          <span className="text-xs font-bold text-amber-300">
            {request.balance_local_pct <= 30
              ? language === 'es'
                ? 'Monumentos del Centro'
                : 'Classic Center'
              : request.balance_local_pct >= 70
              ? language === 'es'
                ? 'Talleres de Barrio'
                : 'Local Workshops'
              : language === 'es'
              ? 'Centro y Barrios'
              : 'Balanced Mix'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={request.balance_local_pct}
          onChange={(e) => onChangeRequest({ balance_local_pct: Number(e.target.value) })}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
          <span>{language === 'es' ? 'Más Zócalo' : 'Historic Core'}</span>
          <span>{language === 'es' ? 'Más Barrios y Talleres' : 'Artisan Barrios'}</span>
        </div>
      </div>

      {/* 5. Intereses */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          {language === 'es' ? '¿Qué te gustaría descubrir?' : 'What do you want to see?'}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_INTERESTS.map((item) => {
            const isSelected = request.interests.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-950 border-white/10 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {language === 'es' ? item.labelEs : item.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Búsqueda opcional */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          {language === 'es' ? 'Buscar algo específico (opcional)' : 'Search keyword (optional)'}
        </label>
        <input
          type="text"
          value={request.free_text || ''}
          onChange={(e) => onChangeRequest({ free_text: e.target.value })}
          placeholder={
            language === 'es'
              ? 'Ej. talavera, dulces, puente, vidrio, pan...'
              : 'E.g. talavera, sweets, bridge, glass...'
          }
          className="w-full border border-white/15 rounded-xl p-2.5 text-xs text-white bg-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Botón principal */}
      <button
        type="button"
        onClick={onGenerate}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold py-3 px-4 rounded-xl text-sm shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
      >
        <UserCheck className="w-4 h-4" />
        {language === 'es' ? 'Actualizar Mi Recorrido' : 'Update My Route'}
      </button>
    </div>
  );
};
