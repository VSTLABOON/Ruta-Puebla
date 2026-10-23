import type { FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import { Landmark, BookOpen, Sparkles, ScrollText, Compass } from 'lucide-react';

interface PoiCulturalContextCardProps {
  poi: POI;
  language: Language;
}

export const PoiCulturalContextCard: FC<PoiCulturalContextCardProps> = ({ poi, language }) => {
  const ctx = poi.cultural_context;
  const imgSrc = poi.image_url || `/images/pois/${poi.id}.svg`;

  return (
    <div className="space-y-3">
      {/* Postal / Ilustración Arquitectónica del Lugar */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#0F3078] shadow-md bg-[#0A2255]">
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
          className="w-full h-36 sm:h-40 object-cover block"
        />
        {ctx?.siglo_fundacion && (
          <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-[#FAF6EE]/95 border border-[#0F3078] text-[10px] font-black text-[#0F3078] shadow">
            {ctx.siglo_fundacion}
          </div>
        )}
      </div>

      {/* Ficha de Contexto Cultural y Arquitectónico */}
      {ctx && (
        <div className="bg-white/95 rounded-2xl p-3.5 border-2 border-[#0F3078]/20 space-y-2.5 shadow-sm text-xs">
          <div className="flex items-center justify-between border-b border-[#0F3078]/15 pb-1.5">
            <span className="font-serif font-black text-[11px] uppercase tracking-wider text-[#0F3078] flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-[#D48914]" />
              {language === 'es' ? 'Contexto Histórico y Cultural' : 'Historical & Cultural Context'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-[#FAF6EE] p-2.5 rounded-xl border border-[#0F3078]/15">
              <span className="text-[10px] font-bold text-[#0F3078]/70 flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#0F3078]" />
                {language === 'es' ? 'Arquitectura y Traza' : 'Architectural Style'}
              </span>
              <span className="font-bold text-[#162035] mt-0.5 block leading-snug">
                {ctx.estilo_arquitectonico}
              </span>
            </div>

            <div className="bg-[#FAF6EE] p-2.5 rounded-xl border border-[#0F3078]/15">
              <span className="text-[10px] font-bold text-[#B84A2C] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#D48914]" />
                {language === 'es' ? 'Patrimonio Vivo' : 'Living Heritage'}
              </span>
              <span className="font-bold text-[#162035] mt-0.5 block leading-snug">
                {ctx.patrimonio_inmaterial}
              </span>
            </div>
          </div>

          {/* Dato Curioso de Crónica Virreinal */}
          {ctx.dato_curioso && (
            <div className="bg-gradient-to-r from-[#0F3078]/5 via-[#F0B43A]/15 to-[#0F3078]/5 p-2.5 rounded-xl border border-[#D48914]/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#9E650C] flex items-center gap-1 mb-0.5 font-serif">
                <ScrollText className="w-3 h-3 text-[#B84A2C]" />
                {language === 'es' ? 'Crónica y Dato Curioso' : 'Historical Chronicle Fact'}
              </span>
              <p className="text-[#162035] leading-relaxed font-medium">{ctx.dato_curioso}</p>
            </div>
          )}

          {/* Fuentes Documentales Verificadas */}
          {ctx.citas_documentales && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#0F3078]/75 pt-0.5 font-semibold">
              <BookOpen className="w-3 h-3 flex-shrink-0 text-[#0F3078]" />
              <span className="truncate">{ctx.citas_documentales}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
