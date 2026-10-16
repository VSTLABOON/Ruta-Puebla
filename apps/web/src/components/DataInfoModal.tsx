import { useState, useEffect, type FC } from 'react';
import { X, BookOpen, Scale, Database, Filter, CheckCircle2 } from 'lucide-react';

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
    fetch('/data/data_cleaning_funnel.json?v=3')
      .then((r) => r.json())
      .then((data) => setFunnelData(data))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultSteps = [
    { etapa: 1, nombre: 'Universo Total Estatal', desc: 'Archivo censal INEGI del Estado de Puebla', reg: '410,693', pct: '100.0%' },
    { etapa: 2, nombre: 'Municipio de Puebla', desc: 'Clave municipal cve_mun == 114 (Capital)', reg: '107,087', pct: '26.07%' },
    { etapa: 3, nombre: 'Polígono Piloto Centro y Barrios', desc: 'BBOX Centro, Analco, La Luz, El Alto, Xanenetla', reg: '4,456', pct: '1.08%' },
    { etapa: 4, nombre: 'Pertinencia Cultural y Artesanal', desc: 'SCIAN artesanías, alfarería, talavera, gastronomía típica, museos', reg: '742', pct: '0.18%' },
    { etapa: 5, nombre: 'Microescala Económica Local', desc: 'Estratos de 0 a 5 y 6 a 10 empleados', reg: '676', pct: '0.16%' },
    { etapa: 6, nombre: 'Depuración de Cadenas Masivas', desc: 'Exclusión por palabras corporativas (OXXO, cadenas de comida rápida)', reg: '676', pct: '0.16%' }
  ];

  const funnelSteps = funnelData?.funnel_steps
    ? funnelData.funnel_steps.map((s: any) => ({
        etapa: s.stage,
        nombre: s.name,
        desc: s.criterion,
        reg: Number(s.records_remaining).toLocaleString('en-US'),
        pct: `${s.pct_of_total}%`
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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FAF6EE] rounded-3xl border-4 border-[#0F3078] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-[#162035]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0F3078] font-serif" />
            <h2 className="text-base font-bold text-[#0F3078] font-serif">
              {language === 'es' ? 'Metodología de Datos, Limpieza y Marco Normativo' : 'Data Methodology, Cleaning & Legal Norms'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas del Modal */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('funnel')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              activeTab === 'funnel'
                ? 'bg-[#0F3078] text-[#FAF6EE] shadow-sm font-serif font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {language === 'es' ? 'Embudo de Purga DENUE' : 'DENUE Cleaning Funnel'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('norms')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              activeTab === 'norms'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            {language === 'es' ? 'Estatus Normativo (NOMs)' : 'Normative Status (NOMs)'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              activeTab === 'sources'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            {language === 'es' ? 'Inventario de Fuentes' : 'Data Inventory'}
          </button>
        </div>

        {/* PESTAÑA 1: EMBUDO DE PURGA Y LIMPIEZA */}
        {activeTab === 'funnel' && (
          <div className="space-y-4">
            <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-lg text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-amber-700" />
                {language === 'es' ? 'Embudo Cuantitativo de Selección de Datos (Data Funnel)' : 'Data Selection Funnel'}
              </div>
              <p className="text-[11px] text-slate-600">
                {language === 'es'
                  ? 'Filtro metodológico reproducible a partir del DENUE oficial de INEGI (edición 2026). Garantiza que las rutas derramen a talleres auténticos y no a franquicias.'
                  : 'Reproducible methodological filter from official INEGI DENUE (2026). Ensures spending targets traditional workshops rather than corporate chains.'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Etapa</th>
                    <th className="p-2.5">Criterio de Filtrado</th>
                    <th className="p-2.5">Descripción</th>
                    <th className="p-2.5 text-right">Unidades</th>
                    <th className="p-2.5 text-right">% Retenido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                  {funnelSteps.map((s: { etapa: number; nombre: string; desc: string; reg: string; pct: string }) => (
                    <tr key={s.etapa} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-bold text-[#0F3078] font-serif">#{s.etapa}</td>
                      <td className="p-2.5 font-semibold text-[#0F3078] font-serif">{s.nombre}</td>
                      <td className="p-2.5 text-slate-500">{s.desc}</td>
                      <td className="p-2.5 font-mono text-right font-bold text-slate-800">{s.reg}</td>
                      <td className="p-2.5 font-mono text-right font-semibold text-amber-800">{s.pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Distribucion Zonal */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2 text-xs">
              <span className="font-bold text-[#0F3078] font-serif">Distribución de las unidades culturales en polígono piloto:</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="font-bold text-[#0F3078] font-serif text-sm">{zonalDist.barrio_analco ?? 389}</div>
                  <div className="text-slate-500">Barrio de Analco</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="font-bold text-[#0F3078] font-serif text-sm">{zonalDist.zocalo_centro_nucleo ?? 236}</div>
                  <div className="text-slate-500">Centro Núcleo</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="font-bold text-[#0F3078] font-serif text-sm">{zonalDist.barrio_la_luz ?? 34}</div>
                  <div className="text-slate-500">Barrio de La Luz</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="font-bold text-[#0F3078] font-serif text-sm">{zonalDist.barrio_el_alto ?? 14}</div>
                  <div className="text-slate-500">Barrio de El Alto</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="font-bold text-[#0F3078] font-serif text-sm">{zonalDist.barrio_xanenetla ?? 3}</div>
                  <div className="text-slate-500">Barrio Xanenetla</div>
                </div>
              </div>
            </div>

            {/* Respuestas Jurado */}
            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="font-bold text-[#0F3078] font-serif flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'es' ? 'Respuestas a Preguntas Frecuentes del Jurado:' : 'Jury FAQ Answers:'}
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong>¿Cómo se conectaron a la red peatonal?</strong> Se aplicó un algoritmo de <em>snapping</em> ortogonal que desplaza las coordenadas originales del DENUE hacia la arista de acera más cercana, calculando distancias sobre banquetas reales y no sobre el arroyo vehicular.
              </p>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ESTATUS NORMATIVO */}
        {activeTab === 'norms' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs text-slate-800 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-slate-700" />
                {language === 'es'
                  ? 'Distinción Conceptual: Cumplimiento Normativo vs Transitabilidad Funcional'
                  : 'Conceptual Distinction: Regulatory Compliance vs Functional Transitability'}
              </div>
              <p className="text-[11px] text-slate-600">
                Las normas técnicas regulan diseño y rehabilitación; no dictan por sí solas si una banqueta virreinal consolidada es transitable. El sistema separa dos niveles:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                <li><strong>Nivel 1 (Cumplimiento normativo):</strong> Apego documental a NOM-001, NOM-004 y NTDIU Puebla.</li>
                <li><strong>Nivel 2 (Transitabilidad funcional):</strong> Criterio físico real evaluado por el motor de ruteo (ancho continuo, ausencia de escalones, rampas obligatorias en silla de ruedas).</li>
              </ul>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Norma</th>
                    <th className="p-2">Parámetro</th>
                    <th className="p-2">Valor preliminar</th>
                    <th className="p-2">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
                  <tr>
                    <td className="p-2 font-medium text-slate-800">NOM-001-SEDATU-2021</td>
                    <td className="p-2">Altura libre de paso</td>
                    <td className="p-2">2.10 m</td>
                    <td className="p-2 text-amber-700 font-semibold">Por verificar contra texto íntegro DOF</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium text-slate-800">NOM-004-SEDATU-2023</td>
                    <td className="p-2">Franja peatonal general</td>
                    <td className="p-2">1.80 m</td>
                    <td className="p-2 text-amber-700 font-semibold">Por verificar contra texto íntegro DOF</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium text-slate-800">NOM-004-SEDATU-2023</td>
                    <td className="p-2">Franja peatonal en zonas históricas</td>
                    <td className="p-2">1.50 m</td>
                    <td className="p-2 text-amber-700 font-semibold">Por verificar contra texto íntegro DOF</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium text-slate-800">NOM-004-SEDATU-2023</td>
                    <td className="p-2">Pendiente de rampas</td>
                    <td className="p-2">5% a 8%</td>
                    <td className="p-2 text-amber-700 font-semibold">Por verificar contra texto íntegro DOF</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium text-slate-800">NTDIU Puebla</td>
                    <td className="p-2">Zona de Monumentos Históricos</td>
                    <td className="p-2">Directriz municipal</td>
                    <td className="p-2 text-slate-600">Supeditada a INAH y Gerencia del Centro Histórico</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: FUENTES */}
        {activeTab === 'sources' && (
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-2.5 rounded border border-slate-100 bg-slate-50">
              <span className="font-bold text-slate-800">INEGI DENUE:</span> Directorio Nacional de Unidades Económicas 2026 (cve_mun: 114). Uso público oficial.
            </div>
            <div className="p-2.5 rounded border border-slate-100 bg-slate-50">
              <span className="font-bold text-slate-800">OpenStreetMap (OSM):</span> Red vial y geometría base. Licencia ODbL 1.0. Atribución: (c) Colaboradores de OpenStreetMap.
            </div>
            <div className="p-2.5 rounded border border-slate-100 bg-slate-50">
              <span className="font-bold text-slate-800">Corpus de Patrimonio Cultural:</span> Textos e inventarios históricos verificados de INAH, UNESCO y relatos orales de maestros artesanos de La Luz y Analco.
            </div>
            <div className="p-2.5 rounded border border-slate-100 bg-slate-50">
              <span className="font-bold text-slate-800">Auditoría de Accesibilidad en Campo:</span> Mediciones directas en tramos piloto con control de concordancia inter-auditor. Licencia abierta CC BY 4.0.
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3">
          Todos los umbrales funcionales y coeficientes econométricos son ajustables tras las pruebas de campo.
        </div>
      </div>
    </div>
  );
};
