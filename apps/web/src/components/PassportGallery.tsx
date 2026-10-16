import { useState, type FC } from 'react';
import { POI, Language, PassportState } from '@ruta-abierta/shared-types';
import { Award, Check, Lock } from 'lucide-react';
import { HolographicBadge } from './HolographicBadge';

interface PassportGalleryProps {
  pois: POI[];
  passportState: PassportState;
  onUnlockSecret: (poiId: string, badgeName: string) => void;
  language: Language;
}

const BARRIOS = [
  { id: 'all', name: { es: 'Todos los Barrios', en: 'All Neighborhoods' } },
  { id: 'analco', name: { es: 'Analco', en: 'Analco' } },
  { id: 'la_luz', name: { es: 'La Luz', en: 'La Luz' } },
  { id: 'el_parian', name: { es: 'El Parián', en: 'El Parián' } },
  { id: 'el_alto', name: { es: 'El Alto', en: 'El Alto' } },
  { id: 'xanenetla', name: { es: 'Xanenetla', en: 'Xanenetla' } }
];

export const PassportGallery: FC<PassportGalleryProps> = ({
  pois,
  passportState,
  onUnlockSecret,
  language
}) => {
  const [selectedBarrio, setSelectedBarrio] = useState('all');
  const [inspectingPoiId, setInspectingPoiId] = useState<string | null>(null);

  // Filter POIs that have secrets or badges
  const badgePois = pois.filter((p) => p.secret_to_unlock || p.artisan_profile);

  const filteredPois = selectedBarrio === 'all'
    ? badgePois
    : badgePois.filter((p) => p.zone.toLowerCase().includes(selectedBarrio));

  const totalBadges = badgePois.length;
  const unlockedCount = passportState.unlocked_secrets.length;
  const progressPct = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0;

  const inspectingPoi = pois.find((p) => p.id === inspectingPoiId);

  return (
    <div className="space-y-4 pb-28 pt-2">
      {/* Header Telemetry Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-tight">
                {language === 'es' ? 'Pasaporte de Exploración Peatonal' : 'Pedestrian Exploration Passport'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'es' ? 'Insignias y sellos oficiales de talleres y patrimonio' : 'Official workshop & heritage stamps'}
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-sm font-black text-amber-400">{unlockedCount}</span>
            <span className="text-xs text-slate-500"> / {totalBadges}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-400">
            <span>{language === 'es' ? 'Progreso de Colección' : 'Collection Progress'}</span>
            <span className="text-amber-400 font-bold">{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Barrio Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {BARRIOS.map((barrio) => (
            <button
              key={barrio.id}
              onClick={() => setSelectedBarrio(barrio.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedBarrio === barrio.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {barrio.name[language]}
            </button>
          ))}
        </div>
      </div>

      {/* Inspect Modal if a badge is tapped */}
      {inspectingPoi && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                {language === 'es' ? 'Ficha Holográfica' : 'Holographic Card'}
              </span>
              <button
                onClick={() => setInspectingPoiId(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-900 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <HolographicBadge
              badgeName={inspectingPoi.secret_to_unlock?.insignia_nombre || `Medallón ${inspectingPoi.name}`}
              poiName={inspectingPoi.name}
              zone={inspectingPoi.zone}
              secretTitle={inspectingPoi.secret_to_unlock?.titulo}
              secretDescription={inspectingPoi.secret_to_unlock?.descripcion}
              isUnlocked={passportState.unlocked_secrets.includes(inspectingPoi.id)}
              onUnlock={() => {
                const badge = inspectingPoi.secret_to_unlock?.insignia_nombre || `Medallón ${inspectingPoi.name}`;
                onUnlockSecret(inspectingPoi.id, badge);
              }}
              language={language}
            />
          </div>
        </div>
      )}

      {/* Badges Grid Responsivo */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredPois.map((p) => {
          const isUnlocked = passportState.unlocked_secrets.includes(p.id);
          const badgeName = p.secret_to_unlock?.insignia_nombre || `Sello ${p.name}`;

          return (
            <div
              key={p.id}
              onClick={() => setInspectingPoiId(p.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isUnlocked
                  ? 'bg-slate-900/90 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-400'
                  : 'bg-slate-950/80 border-slate-800 opacity-75 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              {/* Top row */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                <span className="uppercase truncate max-w-[80px]">{p.zone.replace(/_/g, ' ')}</span>
                {isUnlocked ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center">
                    <Lock className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Medallion Preview */}
              <div className="my-2 flex flex-col items-center text-center">
                <div
                  className={`w-12 h-12 rounded-full border flex items-center justify-center mb-1.5 transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-900 border-slate-700 text-slate-600'
                  }`}
                >
                  <Award className="w-6 h-6 stroke-[2]" />
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-1">
                  {badgeName}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {p.name}
                </p>
              </div>

              {/* Status footer */}
              <div className="pt-2 border-t border-white/5 text-center">
                <span
                  className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full inline-block ${
                    isUnlocked
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {isUnlocked
                    ? (language === 'es' ? 'Coleccionada' : 'Collected')
                    : (language === 'es' ? 'Por descubrir' : 'Locked')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
