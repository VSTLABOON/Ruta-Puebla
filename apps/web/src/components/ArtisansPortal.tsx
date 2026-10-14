import { useState, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import { Store, Hammer, Clock, Award, Users, DollarSign, CheckCircle2 } from 'lucide-react';

interface ArtisansPortalProps {
  pois: POI[];
  language: Language;
}

export const ArtisansPortal: FC<ArtisansPortalProps> = ({ pois, language }) => {
  const localBusinesses = pois.filter((p) => p.is_local_business && p.artisan_profile);
  const [selectedPoiId, setSelectedPoiId] = useState<string>(localBusinesses[0]?.id || '');
  const [stampedSuccess, setStampedSuccess] = useState<string | null>(null);

  const selectedPoi = localBusinesses.find((p) => p.id === selectedPoiId) || localBusinesses[0];
  const profile = selectedPoi?.artisan_profile;

  const handleIssueStamp = () => {
    if (!profile) return;
    setStampedSuccess(profile.sello_artesanal);
    setTimeout(() => setStampedSuccess(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Banner de bienvenida al portal */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">
            {language === 'es' ? 'Portal del Artesano y Pequeño Comercio' : 'Local Artisans & Merchants Portal'}
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5">
            {language === 'es'
              ? 'Economía Local en Barrios Tradicionales de Puebla'
              : 'Local Economy in Traditional Puebla Neighborhoods'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            {language === 'es'
              ? 'Herramienta para microtalleres y cocinas de Analco, La Luz, El Alto, Los Sapos y Xanenetla catalogados en el censo DENUE (INEGI). Conecta tu taller con los itinerarios peatonales accesibles.'
              : 'Tool for craft micro-workshops and kitchens in Analco, La Luz, El Alto, Los Sapos, and Xanenetla registered in DENUE (INEGI).'}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-lg border border-slate-700 text-xs">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              {language === 'es' ? 'Derrama Directa Estimada' : 'Estimated Direct Impact'}
            </div>
            <div className="text-sm font-bold text-emerald-300">+59.4% en comercio local</div>
          </div>
        </div>
      </div>

      {/* Selector de Taller */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Store className="w-4 h-4 text-amber-600" />
          {language === 'es' ? 'Selecciona tu Taller o Establecimiento Tradicional:' : 'Select Traditional Workshop:'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {localBusinesses.map((b) => {
            const isSelected = b.id === selectedPoiId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedPoiId(b.id)}
                className={`text-left p-3 rounded-lg border text-xs transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900">{b.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {b.artisan_profile?.maestro_artesano} |{' '}
                    <span className="font-medium text-slate-700">{b.zone.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-semibold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded w-fit">
                  {b.artisan_profile?.oficio}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ficha Detallada del Taller */}
      {selectedPoi && profile && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Informacion del Taller */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  {language === 'es' ? 'Ficha de Oficio Patrimonial' : 'Heritage Craft Dossier'}
                </span>
                <h3 className="text-base font-bold text-slate-900">{profile.nombre_taller}</h3>
                <div className="text-xs text-slate-600 mt-0.5">
                  <strong>{language === 'es' ? 'Maestro Artesano:' : 'Master Artisan:'}</strong> {profile.maestro_artesano} (Fundado en {profile.fundacion_anio})
                </div>
              </div>

              <span className="bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1 rounded-full text-xs font-bold">
                {profile.oficio}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Hammer className="w-3.5 h-3.5 text-amber-700" />
                  {language === 'es' ? 'Técnica Ancestral Documentada:' : 'Documented Ancestral Technique:'}
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {profile.tecnica_ancestral}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-700" />
                  {language === 'es' ? 'Demostración en Vivo para Visitantes:' : 'Live Demonstration for Visitors:'}
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {profile.demostracion_en_vivo}
                </p>
                <div className="text-[11px] font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                  {profile.horario_demostracion}
                </div>
              </div>
            </div>

            {/* Sello de Taller y Validacion de Visita */}
            <div className="bg-amber-50/50 border border-amber-200/80 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  {language === 'es' ? 'Sello Artesanal Oficial:' : 'Official Artisan Stamp:'}
                </div>
                <div className="text-sm font-extrabold text-amber-900 mt-0.5">
                  "{profile.sello_artesanal}"
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {language === 'es'
                    ? 'Otorga este sello a los turistas con movilidad accesible que asistan a tu taller para validar su pasaporte cultural.'
                    : 'Issue this stamp to visitors attending your workshop to validate their cultural passport.'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleIssueStamp}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg shadow transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {language === 'es' ? 'Emitir Sello a Visitante' : 'Stamp Visitor Passport'}
              </button>
            </div>

            {stampedSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>{language === 'es' ? '¡Sello emitido con éxito!' : 'Stamp successfully issued!'}</strong>{' '}
                  {stampedSuccess}
                </span>
              </div>
            )}
          </div>

          {/* Métricas de Afluencia Proyectada para el Taller */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-600" />
              {language === 'es' ? 'Afluencia Peatonal Proyectada' : 'Projected Foot Traffic'}
            </h4>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-500">{language === 'es' ? 'Visitantes proyectados hoy:' : 'Projected visitors today:'}</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">28 a 45 caminantes</div>
                <div className="text-[10px] text-emerald-700 font-medium mt-1">
                  {language === 'es' ? '+35% gracias a rutas desconcentradas' : '+35% from decentralized routes'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-500">{language === 'es' ? 'Tiempo promedio de estancia:' : 'Average stay duration:'}</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{selectedPoi.visit_duration_min} minutos</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[11px] text-slate-500">{language === 'es' ? 'Criterio de accesibilidad:' : 'Accessibility status:'}</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">
                  {selectedPoi.entrance_accessible ? (
                    <span className="text-emerald-700">{language === 'es' ? 'Entrada transitable a nivel' : 'Step-free entrance'}</span>
                  ) : (
                    <span className="text-amber-700">{language === 'es' ? 'Requiere rampa de transición' : 'Needs transition ramp'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
