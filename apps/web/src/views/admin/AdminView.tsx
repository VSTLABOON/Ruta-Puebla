import type { FC } from 'react';
import { Language } from '@ruta-abierta/shared-types';
import { SustainabilityDashboard } from '../../components/SustainabilityDashboard';
import { BarChart3, Compass, ArrowLeft } from 'lucide-react';
import { useRouter } from '../../router/Router';

interface AdminViewProps {
  language: Language;
}

export const AdminView: FC<AdminViewProps> = ({ language }) => {
  const { navigate } = useRouter();

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 pb-24 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Barra superior del panel de administración */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {language === 'es' ? 'Panel SECIHTI • Analítica Urbana y Sostenibilidad' : 'SECIHTI Urban Analytics & Planning'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'es'
                  ? 'Simulación de 150 agentes sintéticos, dispersión de flujo y priorización de banquetas'
                  : '150 synthetic agent simulation, crowd dispersion, and sidewalk works ranking'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-2 shadow-lg transition-all duration-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">
              {language === 'es' ? 'Ver Mapa Peatonal' : 'View Walking Map'}
            </span>
          </button>
        </div>

        {/* Dashboard de Sostenibilidad SECIHTI */}
        <SustainabilityDashboard language={language} />
      </div>
    </div>
  );
};
export default AdminView;
