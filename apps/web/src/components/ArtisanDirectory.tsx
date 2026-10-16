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
      <div className="bg-[#FAF6EE] border-2 border-[#0F3078]/20 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#0F3078] text-[#FAF6EE] flex items-center justify-center shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-black text-[#0F3078] tracking-tight">
                {language === 'es' ? 'Talleres y Maestros Artesanos' : 'Master Artisans & Workshops'}
              </h2>
              <p className="text-[11px] text-[#0F3078]/70">
                {language === 'es'
                  ? 'Directorio vivo de barrios tradicionales de Puebla'
                  : 'Traditional neighborhood workshop directory of Puebla'}
              </p>
            </div>
          </div>

          <div className="text-right font-serif text-xs">
            <span className="font-black text-[#0F3078]">{filtered.length}</span>
            <span className="text-[#0F3078]/70"> {language === 'es' ? 'talleres' : 'shops'}</span>
          </div>
        </div>

        {/* Zone Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase font-serif cursor-pointer ${
                selectedZone === zone
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-sm'
                  : 'bg-white/80 border border-[#0F3078]/15 text-[#0F3078] hover:bg-white'
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
              className="bg-[#FAF6EE] border-2 border-[#0F3078]/25 hover:border-[#0F3078] rounded-2xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer space-y-3 group"
            >
              {/* Card Title & Barrio */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-black text-sm text-[#0F3078] group-hover:text-[#B84A2C] transition-colors">
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#0F3078]/70 font-sans mt-0.5">
                    <MapPin className="w-3 h-3 text-[#B84A2C] flex-shrink-0" />
                    <span>{item.address} ({item.zone.replace(/_/g, ' ')})</span>
                  </div>
                </div>

                <span className="font-serif text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#B84A2C]/15 text-[#B84A2C] border border-[#B84A2C]/30 flex-shrink-0">
                  {prof.oficio}
                </span>
              </div>

              {/* Master Artisan & Heritage Details */}
              <div className="bg-white/90 rounded-xl p-2.5 border border-[#0F3078]/15 grid grid-cols-2 gap-2 text-xs shadow-xs">
                <div>
                  <span className="text-[10px] text-[#0F3078]/70 block font-serif">
                    {language === 'es' ? 'Maestro Artesano:' : 'Master Artisan:'}
                  </span>
                  <span className="text-[#162035] font-bold text-[11px]">{prof.maestro_artesano}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#0F3078]/70 block font-serif">
                    {language === 'es' ? 'Fundación:' : 'Founded:'}
                  </span>
                  <span className="text-[#B84A2C] font-bold text-[11px] font-serif">{prof.fundacion_anio}</span>
                </div>
              </div>

              {/* Live Demonstration and Technique */}
              <div className="space-y-1.5 text-xs bg-white/70 p-2.5 rounded-xl border border-[#0F3078]/15 shadow-xs">
                <div className="flex items-center gap-1.5 text-[#B84A2C] text-[11px] font-serif">
                  <Flame className="w-3.5 h-3.5 text-[#B84A2C] animate-pulse flex-shrink-0" />
                  <span className="font-semibold">{prof.demostracion_en_vivo}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#0F3078]/70 text-[10px]">
                  <Sparkles className="w-3 h-3 text-[#0F3078] flex-shrink-0" />
                  <span>{prof.tecnica_ancestral}</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-[#0F3078]/15 flex items-center justify-between">
                <span className="text-[11px] text-[#0F3078]/70 flex items-center gap-1 font-serif">
                  <Award className="w-3.5 h-3.5 text-[#0F3078]" />
                  <span>{prof.sello_artesanal}</span>
                </span>

                <div className="text-xs font-serif font-bold text-[#0F3078] group-hover:text-[#B84A2C] flex items-center gap-0.5 group-hover:translate-x-1 transition-all">
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
