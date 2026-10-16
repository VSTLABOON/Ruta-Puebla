import type { FC } from 'react';
import { POI, Language } from '@ruta-abierta/shared-types';
import { ArtisansPortal } from '../../components/ArtisansPortal';
import { Store, Compass, ArrowLeft } from 'lucide-react';
import { useRouter } from '../../router/Router';

interface ArtisanViewProps {
  pois: POI[];
  language: Language;
}

export const ArtisanView: FC<ArtisanViewProps> = ({ pois, language }) => {
  const { navigate } = useRouter();

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 pb-24 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Barra superior de navegación rápida del taller */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {language === 'es' ? 'Portal del Artesano y Comercio Tradicional' : 'Artisans & Local Commerce Portal'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'es'
                  ? 'Gestión de hornos, demostraciones en vivo y sellado de pasaporte en barrios tradicionales'
                  : 'Manage workshop demonstrations, live status, and visitor stamps'}
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
              {language === 'es' ? 'Volver al Mapa Peatonal' : 'Back to Walking Map'}
            </span>
          </button>
        </div>

        {/* Portal de Artesanos */}
        <ArtisansPortal pois={pois} language={language} />
      </div>
    </div>
  );
};
export default ArtisanView;
