import type { FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import { BookOpen, Sparkles, ScrollText, Compass, ChevronDown } from 'lucide-react';

interface PoiCulturalContextCardProps {
  poi: POI;
  language: Language;
}

export const PoiCulturalContextCard: FC<PoiCulturalContextCardProps> = ({ poi, language }) => {
  const ctx = poi.cultural_context;
  const imgSrc = poi.image_url || `/images/pois/${poi.id}.svg`;

  return (
    <div className="space-y-2.5">
      {/* Postal / Ilustración del Lugar */}
      <div className="relative rounded-2xl overflow-hidden border border-[#0F3078]/25 shadow-sm bg-[#0A2255]">
        <img
          src={imgSrc}
          alt={poi.name}
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.endsWith(`/images/pois/${poi.id}.svg`)) {
              target.src = `/images/pois/${poi.id}.svg`;
            }
          }}
          className="w-full h-32 sm:h-36 object-cover block"
        />
        {ctx?.siglo_fundacion && (
          <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-[#FAF6EE]/95 border border-[#0F3078]/30 text-[10px] font-bold text-[#0F3078] shadow-xs">
            {ctx.siglo_fundacion}
          </div>
        )}
      </div>

      {/* Ficha compacta con acordeón para detalles históricos */}
      {ctx && (
        <div className="bg-white rounded-2xl p-3 border border-[#0F3078]/15 space-y-2.5 shadow-xs text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-[#FAF6EE] p-2.5 rounded-xl border border-[#0F3078]/10">
              <span className="text-[10px] font-bold text-[#0F3078]/70 flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#0F3078]" />
                {language === 'es' ? 'Arquitectura' : 'Architecture'}
              </span>
              <span className="font-bold text-[#162035] mt-0.5 block leading-snug">
                {ctx.estilo_arquitectonico}
              </span>
            </div>

            <div className="bg-[#FAF6EE] p-2.5 rounded-xl border border-[#0F3078]/10">
              <span className="text-[10px] font-bold text-[#B84A2C] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#D48914]" />
                {language === 'es' ? 'Tradición viva' : 'Living heritage'}
              </span>
              <span className="font-bold text-[#162035] mt-0.5 block leading-snug">
                {ctx.patrimonio_inmaterial}
              </span>
            </div>
          </div>

          {ctx.dato_curioso && (
            <details className="group bg-[#FAF6EE]/70 rounded-xl border border-[#0F3078]/10 overflow-hidden">
              <summary className="px-3 py-2 text-[11px] font-bold text-[#0F3078] flex items-center justify-between cursor-pointer select-none list-none">
                <span className="flex items-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5 text-[#B84A2C]" />
                  {language === 'es' ? 'Ver historia y dato curioso' : 'Read history & fun fact'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3 pb-2.5 pt-1 border-t border-[#0F3078]/10 space-y-1.5">
                <p className="text-[#162035] leading-relaxed">{ctx.dato_curioso}</p>
                {ctx.citas_documentales && (
                  <div className="flex items-start gap-1.5 text-[10px] text-[#0F3078]/70 pt-0.5 font-medium min-w-0">
                    <BookOpen className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{ctx.citas_documentales}</span>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
