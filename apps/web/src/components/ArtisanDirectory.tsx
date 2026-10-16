import { useState, type FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import { Store, Flame, Award, MapPin, ChevronRight, Sparkles } from 'lucide-react';
import { tacticalAudio } from '../utils/tacticalAudio';

interface ArtisanDirectoryProps {
  pois: POI[];
  onSelectArtisan: (poiId: string) => void;
  language: Language;
}

export const ArtisanDirectory: FC<ArtisanDirectoryProps> = ({
  pois,
  onSelectArtisan,
  language
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('all');

  // Filter local artisan businesses
  const artisans = pois.filter((p) => p.is_local_business && p.artisan_profile);

  const zones = ['all', 'analco', 'la_luz', 'el_parian', 'el_alto', 'xanenetla'];

  const filtered = selectedZone === 'all'
    ? artisans
    : artisans.filter((a) => a.zone.toLowerCase().includes(selectedZone));

  const handleInspect = (id: string) => {
    tacticalAudio.playTacticalClick();
    onSelectArtisan(id);
  };

  return (
    <div className="space-y-4 pb-28 pt-2">
      {/* Header Telemetry */}
      <div className="bg-[var(--surface)] backdrop-blur-xl border border-[var(--line)] rounded-2xl p-4 shadow-[var(--shadow)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] border border-[var(--line)] text-[var(--brand)] flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--ink)] tracking-tight">
                {language === 'es' ? 'Talleres y Maestros Artesanos' : 'Master Artisans & Workshops'}
              </h2>
              <p className="text-[11px] text-[var(--muted)]">
                {language === 'es'
                  ? 'Directorio vivo de barrios tradicionales (DENUE INEGI)'
                  : 'Traditional neighborhood workshop directory (DENUE)'}
              </p>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="font-bold text-[var(--brand)]">{filtered.length}</span>
            <span className="text-[var(--ink)]0"> {language === 'es' ? 'talleres' : 'shops'}</span>
          </div>
        </div>

        {/* Zone Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all uppercase text-[11px] font-mono cursor-pointer ${
                selectedZone === zone
                  ? 'bg-[var(--primary)] text-[var(--on-primary)] font-bold shadow-sm'
                  : 'bg-[var(--well)] text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {zone.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Artisan Cards List Responsivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((item) => {
          const prof = item.artisan_profile!;

          return (
            <div
              key={item.id}
              onClick={() => handleInspect(item.id)}
              className="bg-[var(--surface)] backdrop-blur-xl border border-[var(--line)] rounded-2xl p-4 shadow-[var(--shadow)] hover:border-sky-400/50 transition-all cursor-pointer space-y-3 group"
            >
              {/* Card Title & Barrio */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-[var(--ink)] group-hover:text-[var(--brand)] transition-colors">
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] font-mono mt-0.5">
                    <MapPin className="w-3 h-3 text-[var(--brand)] flex-shrink-0" />
                    <span>{item.address} ({item.zone.replace(/_/g, ' ')})</span>
                  </div>
                </div>

                <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--brand)] border border-[var(--line)] flex-shrink-0">
                  {prof.oficio}
                </span>
              </div>

              {/* Master Artisan & Heritage Details */}
              <div className="bg-[var(--surface)] rounded-xl p-2.5 border border-[var(--line)] grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[var(--muted)] block">
                    {language === 'es' ? 'Maestro Artesano:' : 'Master Artisan:'}
                  </span>
                  <span className="text-[var(--ink)] font-bold text-[11px]">{prof.maestro_artesano}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted)] block">
                    {language === 'es' ? 'Fundación:' : 'Founded:'}
                  </span>
                  <span className="text-[var(--brand)] font-bold text-[11px]">{prof.fundacion_anio}</span>
                </div>
              </div>

              {/* Live Demonstration and Technique */}
              <div className="space-y-1.5 text-xs font-mono bg-[var(--surface)] p-2.5 rounded-xl border border-[var(--line)]">
                <div className="flex items-center gap-1.5 text-[var(--brand)] text-[11px]">
                  <Flame className="w-3.5 h-3.5 text-[var(--brand)] animate-pulse flex-shrink-0" />
                  <span className="font-semibold">{prof.demostracion_en_vivo}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--muted)] text-[10px]">
                  <Sparkles className="w-3 h-3 text-[var(--brand)] flex-shrink-0" />
                  <span>{prof.tecnica_ancestral}</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <span>{prof.sello_artesanal}</span>
                </span>

                <div className="text-xs font-bold text-[var(--brand)] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  <span>{language === 'es' ? 'Ver en Mapa' : 'Map View'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
