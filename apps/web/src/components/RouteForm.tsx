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
    <div className="bg-[#FAF6EE] rounded-2xl border-2 border-[#0F3078]/20 p-4 shadow-xl space-y-5 text-[#162035]">
      <div className="flex items-center justify-between border-b-2 border-[#0F3078]/15 pb-3">
        <h2 className="text-sm font-serif font-black text-[#0F3078] flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#B84A2C]" />
          {language === 'es' ? 'Personaliza tu Recorrido' : 'Customize Your Walk'}
        </h2>
      </div>

      {/* 1. Perfil de Movilidad */}
      <div>
        <label className="block text-xs font-serif font-bold text-[#0F3078] uppercase tracking-wider mb-2">
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
                className={`p-3 rounded-xl border-2 text-left transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-[#0F3078] bg-white text-[#0F3078] shadow-sm'
                    : 'border-[#0F3078]/15 hover:border-[#0F3078]/30 bg-white/70 text-[#162035]/80'
                }`}
              >
                <div className="text-xs font-serif font-black">
                  {language === 'es' ? prof.labelEs : prof.labelEn}
                </div>
                <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-[#B84A2C] font-medium' : 'text-[#162035]/60'}`}>
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
            <label className="text-xs font-serif font-bold text-[#0F3078] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0F3078]" />
              {language === 'es' ? 'Duración:' : 'Duration:'}
            </label>
            <span className="text-xs font-serif font-black text-[#0F3078]">{request.max_time_min} min</span>
          </div>
          <input
            type="range"
            min="60"
            max="360"
            step="30"
            value={request.max_time_min}
            onChange={(e) => onChangeRequest({ max_time_min: Number(e.target.value) })}
            className="w-full accent-[#0F3078]"
          />
          <div className="flex justify-between text-[10px] text-[#0F3078]/70 mt-0.5 font-serif">
            <span>1 hora</span>
            <span>3 horas</span>
            <span>6 horas</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-serif font-bold text-[#0F3078] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#B84A2C]" />
              {language === 'es' ? 'Gasto estimado:' : 'Budget:'}
            </label>
            <span className="text-xs font-serif font-black text-[#B84A2C]">${request.max_budget_mxn} MXN</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="50"
            value={request.max_budget_mxn}
            onChange={(e) => onChangeRequest({ max_budget_mxn: Number(e.target.value) })}
            className="w-full accent-[#B84A2C]"
          />
          <div className="flex justify-between text-[10px] text-[#0F3078]/70 mt-0.5 font-serif">
            <span>Gratis</span>
            <span>$250</span>
            <span>$500</span>
          </div>
        </div>
      </div>

      {/* 3. Punto de partida */}
      <div>
        <label className="block text-xs font-serif font-bold text-[#0F3078] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#0F3078]" />
          {language === 'es' ? 'Punto de partida' : 'Starting location'}
        </label>
        <select
          value={request.start_poi_id}
          onChange={(e) => onChangeRequest({ start_poi_id: e.target.value })}
          className="w-full border-2 border-[#0F3078]/25 rounded-xl p-2.5 text-xs text-[#162035] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
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
          <label className="text-xs font-serif font-bold text-[#0F3078]">
            {language === 'es' ? 'Estilo de ruta:' : 'Route style:'}
          </label>
          <span className="text-xs font-serif font-black text-[#B84A2C]">
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
          className="w-full accent-[#0F3078]"
        />
        <div className="flex justify-between text-[10px] text-[#0F3078]/70 mt-0.5 font-serif">
          <span>{language === 'es' ? 'Más Zócalo' : 'Historic Core'}</span>
          <span>{language === 'es' ? 'Más Barrios y Talleres' : 'Artisan Barrios'}</span>
        </div>
      </div>

      {/* 5. Intereses */}
      <div>
        <label className="block text-xs font-serif font-bold text-[#0F3078] uppercase tracking-wider mb-2">
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
                className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all duration-300 cursor-pointer font-serif ${
                  isSelected
                    ? 'bg-[#0F3078] border-[#0F3078] text-[#FAF6EE] font-black shadow-xs'
                    : 'bg-white border-[#0F3078]/20 text-[#0F3078] hover:bg-[#FAF6EE]'
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
        <label className="block text-xs font-serif font-bold text-[#0F3078] uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-[#0F3078]/60" />
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
          className="w-full border-2 border-[#0F3078]/25 rounded-xl p-2.5 text-xs text-[#162035] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F3078]"
        />
      </div>

      {/* Botón principal */}
      <button
        type="button"
        onClick={onGenerate}
        className="w-full bg-[#0F3078] hover:bg-[#0A2255] text-[#FAF6EE] font-serif font-black py-3 px-4 rounded-xl text-sm shadow-md border border-[#FAF6EE]/20 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
      >
        <UserCheck className="w-4 h-4" />
        {language === 'es' ? 'Actualizar Mi Recorrido' : 'Update My Route'}
      </button>
    </div>
  );
};
