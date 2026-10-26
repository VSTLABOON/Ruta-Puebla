import { useState, useEffect, type FC } from 'react';
import { X, BookOpen, Scale, Database, Filter, ChevronDown } from 'lucide-react';

interface DataInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'es' | 'en';
}

export const DataInfoModal: FC<DataInfoModalProps> = ({
  isOpen,
  onClose,
  language
}) => {
  const [activeTab, setActiveTab] = useState<'funnel' | 'norms' | 'sources'>('funnel');
  const [funnelData, setFunnelData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/data/data_cleaning_funnel.json?v=4')
      .then((r) => r.json())
      .then((data) => setFunnelData(data))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultSteps = [
    { etapa: 1, nombre: 'Total de unidades en el estado', desc: 'Censo INEGI del Estado de Puebla', reg: '410,693', pct: '100%', width: 100 },
    { etapa: 2, nombre: 'Municipio de Puebla', desc: 'Capital del estado (cve_mun 114)', reg: '107,087', pct: '26.1%', width: 65 },
    { etapa: 3, nombre: 'Centro Histórico y Barrios', desc: 'Zócalo, Analco, La Luz, El Alto y Xanenetla', reg: '4,456', pct: '1.08%', width: 38 },
    { etapa: 4, nombre: 'Giro cultural y artesanal', desc: 'Talavera, alfarería, gastronomía típica y museos', reg: '742', pct: '0.18%', width: 22 },
    { etapa: 5, nombre: 'Comercios y talleres locales', desc: 'Microempresas locales (sin cadenas comerciales)', reg: '676', pct: '0.16%', width: 15 }
  ];

  const funnelSteps = funnelData?.funnel_steps
    ? funnelData.funnel_steps.map((s: any, idx: number) => ({
        etapa: s.stage,
        nombre: s.name,
        desc: s.criterion,
        reg: Number(s.records_remaining).toLocaleString('en-US'),
        pct: `${s.pct_of_total}%`,
        width: Math.max(12, 100 - idx * 17)
      }))
    : defaultSteps;

  const zonalDist = funnelData?.zonal_distribution || {
    barrio_analco: 389,
    zocalo_centro_nucleo: 236,
    barrio_la_luz: 34,
    barrio_el_alto: 14,
    barrio_xanenetla: 3
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1E4A]/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-slide">
      <div className="bg-[#FAF6EE] border-t-4 sm:border-4 border-[#0F3078] text-[#162035] rounded-t-[28px] sm:rounded-3xl max-w-2xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* 1. Cabecera Fija */}
        <header className="px-5 py-3.5 bg-[#0F3078] text-[#FAF6EE] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-[#F0B43A]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif font-black text-sm sm:text-base text-[#FAF6EE] truncate">
                {language === 'es' ? 'Sobre los Datos y Accesibilidad' : 'About Data & Accessibility'}
              </h2>
              <p className="text-[11px] text-[#DCE6F9] truncate">
                {language === 'es'
                  ? 'Cómo seleccionamos los talleres y evaluamos las banquetas'
                  : 'How we select local workshops and evaluate sidewalks'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF6EE] transition cursor-pointer flex-shrink-0"
            aria-label={language === 'es' ? 'Cerrar' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 2. Control Segmentado Unificado */}
        <div className="px-4 py-2.5 bg-[#F2EBDC] border-b border-[#0F3078]/15 flex-shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-white/80 p-1 rounded-xl border border-[#0F3078]/15 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('funnel')}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'funnel'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                  : 'text-[#0F3078]/75 hover:text-[#0F3078]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="truncate">{language === 'es' ? 'Lugares' : 'Places'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('norms')}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'norms'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                  : 'text-[#0F3078]/75 hover:text-[#0F3078]'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="truncate">{language === 'es' ? 'Accesibilidad' : 'Access'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sources')}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'sources'
                  ? 'bg-[#0F3078] text-[#FAF6EE] shadow-xs'
                  : 'text-[#0F3078]/75 hover:text-[#0F3078]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="truncate">{language === 'es' ? 'Fuentes' : 'Sources'}</span>
            </button>
          </div>
        </div>

        {/* 3. Cuerpo con Scroll Propio */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'funnel' && (
            <div className="space-y-4">
              <p className="text-xs text-[#162035]/80 leading-relaxed">
                {language === 'es'
                  ? 'Partimos del directorio oficial de INEGI (DENUE) para incluir únicamente talleres familiares, panaderías de barrio y espacios culturales auténticos, dejando fuera a las cadenas comerciales.'
                  : 'We filter the official INEGI business directory to include authentic family workshops and cultural sites, excluding corporate chains.'}
              </p>

              {/* Lista visual de etapas con barra proporcional */}
              <div className="space-y-2.5">
                {funnelSteps.map((s: any) => (
                  <div
                    key={s.etapa}
                    className="p-3 rounded-2xl bg-white border border-[#0F3078]/15 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#0F3078]">
                        {s.etapa}. {s.nombre}
                      </span>
                      <span className="font-mono font-black text-[#0F3078]">
                        {s.reg}{' '}
                        <span className="text-[10px] font-semibold text-[#B84A2C]">({s.pct})</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-[#162035]/70">{s.desc}</p>
                    <div className="w-full bg-[#F2EBDC] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0F3078] h-full rounded-full"
                        style={{ width: `${s.width}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen por barrio */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 space-y-2.5">
                <span className="text-xs font-bold text-[#0F3078] block">
                  {language === 'es'
                    ? 'Talleres y comercios culturales por zona:'
                    : 'Cultural workshops and businesses by neighborhood:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="bg-[#FAF6EE] p-2 rounded-xl border border-[#0F3078]/10">
                    <div className="font-black text-[#0F3078] text-sm">{zonalDist.barrio_analco ?? 389}</div>
                    <div className="text-[#162035]/70">Analco</div>
                  </div>
                  <div className="bg-[#FAF6EE] p-2 rounded-xl border border-[#0F3078]/10">
                    <div className="font-black text-[#0F3078] text-sm">{zonalDist.zocalo_centro_nucleo ?? 236}</div>
                    <div className="text-[#162035]/70">Zócalo</div>
                  </div>
                  <div className="bg-[#FAF6EE] p-2 rounded-xl border border-[#0F3078]/10">
                    <div className="font-black text-[#0F3078] text-sm">{zonalDist.barrio_la_luz ?? 34}</div>
                    <div className="text-[#162035]/70">La Luz</div>
                  </div>
                  <div className="bg-[#FAF6EE] p-2 rounded-xl border border-[#0F3078]/10">
                    <div className="font-black text-[#0F3078] text-sm">{zonalDist.barrio_el_alto ?? 14}</div>
                    <div className="text-[#162035]/70">El Alto</div>
                  </div>
                  <div className="bg-[#FAF6EE] p-2 rounded-xl border border-[#0F3078]/10">
                    <div className="font-black text-[#0F3078] text-sm">{zonalDist.barrio_xanenetla ?? 3}</div>
                    <div className="text-[#162035]/70">Xanenetla</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'norms' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 space-y-1">
                  <strong className="text-[#0F3078] block">
                    {language === 'es' ? 'Paso práctico en calle' : 'Real sidewalk conditions'}
                  </strong>
                  <p className="text-[#162035]/75 leading-relaxed">
                    {language === 'es'
                      ? 'Evaluamos el ancho libre de banqueta, el estado de las lajas, la pendiente y si existen rampas en los cruces.'
                      : 'We evaluate actual sidewalk width, stone surface smoothness, slope, and curb ramps.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 space-y-1">
                  <strong className="text-[#1D6B52] block">
                    {language === 'es' ? 'Rutas según tu movilidad' : 'Tailored to your mobility'}
                  </strong>
                  <p className="text-[#162035]/75 leading-relaxed">
                    {language === 'es'
                      ? 'Al elegir silla de ruedas o paso tranquilo, el mapa evita escalones y prioriza calles planas con cruces seguros.'
                      : 'Selecting wheelchair or gentle pace automatically avoids steps and steep streets.'}
                  </p>
                </div>
              </div>

              {/* Acordeón desplegable para referencias técnicas NOM */}
              <details className="group bg-white rounded-2xl border border-[#0F3078]/15 overflow-hidden">
                <summary className="px-4 py-3 text-xs font-bold text-[#0F3078] flex items-center justify-between cursor-pointer select-none list-none">
                  <span>
                    {language === 'es'
                      ? 'Ver normas técnicas de referencia (NOM-001 y NOM-004)'
                      : 'View technical reference standards (NOM-001 & NOM-004)'}
                  </span>
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-3.5 pt-1 border-t border-[#0F3078]/10 text-[11px] space-y-2 text-[#162035]/80">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-[#0F3078]">NOM-004-SEDATU-2023</span>
                    <span>Ancho mínimo en centro histórico: 1.50 m</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-[#0F3078]">NOM-004-SEDATU-2023</span>
                    <span>Pendiente máxima en rampas: 5% a 8%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-semibold text-[#0F3078]">NOM-001-SEDATU-2021</span>
                    <span>Altura libre de paso peatonal: 2.10 m</span>
                  </div>
                </div>
              </details>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 space-y-1">
                <strong className="text-[#0F3078] block">INEGI • DENUE</strong>
                <p className="text-[#162035]/75">
                  Directorio Nacional de Unidades Económicas del Municipio de Puebla (datos abiertos oficiales).
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 space-y-1">
                <strong className="text-[#0F3078] block">OpenStreetMap (OSM)</strong>
                <p className="text-[#162035]/75">
                  Traza de calles y banquetas del Centro Histórico de Puebla bajo licencia abierta ODbL.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-[#0F3078]/15 space-y-1">
                <strong className="text-[#0F3078] block">Acervo Histórico y Cultural</strong>
                <p className="text-[#162035]/75">
                  Catálogos públicos del INAH, declaratorias UNESCO y entrevistas con talleres de La Luz y Analco.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer Fijo */}
        <footer className="p-3.5 sm:px-5 bg-white border-t border-[#0F3078]/15 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0F3078] hover:bg-[#1B49AC] text-[#FAF6EE] font-bold text-xs shadow-sm transition cursor-pointer"
          >
            {language === 'es' ? 'Entendido' : 'Got it'}
          </button>
        </footer>
      </div>
    </div>
  );
};
