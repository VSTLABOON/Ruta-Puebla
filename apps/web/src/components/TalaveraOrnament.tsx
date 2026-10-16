import type { FC, ReactNode } from 'react';

interface TalaveraPlateProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: ReactNode;
  className?: string;
  variant?: 'cobalt' | 'polychrome' | 'terracotta';
  animate?: boolean;
}

/**
 * Medallón cerámico que simula un plato de Talavera Poblana auténtica
 * (inspirado en el plato de esmalte blanco marfil con doble filete azul cobalto,
 * plumillas florales, punteado de alfarero y tallos finos en negro hierro).
 */
export const TalaveraPlateMedallion: FC<TalaveraPlateProps> = ({
  size = 'md',
  children,
  className = '',
  variant = 'cobalt',
  animate = false
}) => {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  }[size];

  const primaryStroke = variant === 'terracotta' ? '#B84A2C' : '#0F3078';
  const secondaryFill = variant === 'polychrome' ? '#D48914' : variant === 'terracotta' ? '#0F3078' : '#1B49AC';
  const accentDot = variant === 'polychrome' ? '#B84A2C' : '#0F3078';

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${dimensions} ${className}`}>
      <svg
        viewBox="0 0 120 120"
        className={`w-full h-full drop-shadow-[0_4px_10px_rgba(10,30,74,0.28)] ${
          animate ? 'animate-[spin_28s_linear_infinite]' : ''
        }`}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`majolica-glaze-${variant}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="70%" stopColor="#FAF6EE" />
            <stop offset="100%" stopColor="#EAE0CE" />
          </radialGradient>
        </defs>

        {/* Base cerámica esmaltada blanco marfil (Majólica) */}
        <circle cx="60" cy="60" r="58" fill={`url(#majolica-glaze-${variant})`} stroke="#D5C7B2" strokeWidth="1" />

        {/* Filete exterior grueso en Azul Cobalto mineral (borde del plato) */}
        <circle cx="60" cy="60" r="54" fill="none" stroke={primaryStroke} strokeWidth="4.5" />

        {/* Segundo filete concéntrico fino (clásico doble anillo de Talavera) */}
        <circle cx="60" cy="60" r="47.5" fill="none" stroke={primaryStroke} strokeWidth="1.4" />

        {/* 4 Tallos en espiral finos en Negro Hierro (#162035) y Plumillas de Cobalto en las 4 direcciones */}
        {[0, 90, 180, 270].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 60 60)`}>
            {/* Tallo fino en espiral (negro hierro) */}
            <path
              d="M 48 26 C 55 18, 66 18, 70 26 C 73 31, 67 35, 64 32"
              fill="none"
              stroke="#162035"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {/* Pétalos de plumilla azul cobalto (pinceladas características de Puebla) */}
            <path
              d="M 60 13 C 56 17, 56 23, 60 25 C 64 23, 64 17, 60 13 Z"
              fill={primaryStroke}
            />
            <path
              d="M 50 16 C 48 20, 50 25, 55 26 C 56 22, 54 17, 50 16 Z"
              fill={secondaryFill}
            />
            <path
              d="M 70 16 C 72 20, 70 25, 65 26 C 64 22, 66 17, 70 16 Z"
              fill={secondaryFill}
            />
            {/* Punteado de alfarero entre plumillas */}
            <circle cx="43" cy="23" r="2" fill={accentDot} />
            <circle cx="77" cy="23" r="2" fill={accentDot} />
            <circle cx="60" cy="29" r="1.5" fill="#162035" />
          </g>
        ))}

        {/* Plumillas diagonales a 45 grados */}
        {[45, 135, 225, 315].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 60 60)`}>
            <path
              d="M 60 16 C 57 20, 57 24, 60 27 C 63 24, 63 20, 60 16 Z"
              fill={primaryStroke}
              opacity="0.88"
            />
            <circle cx="53" cy="24" r="1.6" fill={secondaryFill} />
            <circle cx="67" cy="24" r="1.6" fill={secondaryFill} />
          </g>
        ))}

        {/* Anillo interior del medallón */}
        <circle cx="60" cy="60" r="28" fill="#FAF6EE" stroke={primaryStroke} strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>

      {/* Contenido central (ícono o número de parada) */}
      {children && (
        <div className="relative z-10 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Cenefa horizontal de Azulejo de Talavera y Ladrillo Petatillo Poblano.
 * Se coloca en cabeceras, tarjetas y modales para romper la monotonía visual.
 */
export const TalaveraFrieze: FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false
}) => {
  return (
    <div
      className={`w-full overflow-hidden select-none pointer-events-none ${
        compact ? 'h-2.5' : 'h-3.5'
      } ${className}`}
      aria-hidden="true"
      style={{
        backgroundColor: '#FAF6EE',
        borderTop: '1.5px solid #0F3078',
        borderBottom: '1.5px solid #0F3078',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='14' viewBox='0 0 64 14'%3E%3Crect width='64' height='14' fill='%23FAF6EE'/%3E%3Cpath d='M8 7 C5 3, 11 3, 8 7 C11 11, 5 11, 8 7 Z' fill='%230F3078'/%3E%3Cpath d='M4 7 C7 4, 7 10, 4 7 M12 7 C9 4, 9 10, 12 7' stroke='%230F3078' stroke-width='1.8' stroke-linecap='round' fill='none'/%3E%3Ccircle cx='8' cy='7' r='1.8' fill='%23D48914'/%3E%3Ccircle cx='20' cy='4' r='1.5' fill='%231B49AC'/%3E%3Ccircle cx='20' cy='10' r='1.5' fill='%231B49AC'/%3E%3Cpolygon points='32,2 37,7 32,12 27,7' fill='%23B84A2C'/%3E%3Ccircle cx='32' cy='7' r='1.8' fill='%23FAF6EE'/%3E%3Ccircle cx='44' cy='4' r='1.5' fill='%231B49AC'/%3E%3Ccircle cx='44' cy='10' r='1.5' fill='%231B49AC'/%3E%3Cpath d='M56 3 C54 5, 54 9, 56 11 C58 9, 58 5, 56 3 Z' fill='%230F3078'/%3E%3Cpath d='M52 7 C54 5, 58 5, 60 7 C58 9, 54 9, 52 7 Z' fill='%231D6B52' opacity='0.85'/%3E%3Ccircle cx='56' cy='7' r='1.6' fill='%23F0B43A'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'center',
        backgroundSize: compact ? '48px 10px' : '64px 14px'
      }}
    />
  );
};

/**
 * Esquinero floral de plumilla de Talavera para tarjetas cerámicas.
 */
export const TalaveraCorner: FC<{ position: 'tl' | 'tr' | 'bl' | 'br'; className?: string }> = ({
  position,
  className = ''
}) => {
  const rotation = {
    tl: 'rotate-0 top-1.5 left-1.5',
    tr: 'rotate-90 top-1.5 right-1.5',
    br: 'rotate-180 bottom-1.5 right-1.5',
    bl: '-rotate-90 bottom-1.5 left-1.5'
  }[position];

  return (
    <svg
      viewBox="0 0 36 36"
      className={`w-6 h-6 absolute pointer-events-none select-none opacity-85 ${rotation} ${className}`}
      aria-hidden="true"
    >
      <path
        d="M 4 4 L 22 4 M 4 4 L 4 22"
        stroke="#0F3078"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M 8 8 C 12 6, 17 7, 19 11 C 15 12, 10 11, 8 8 Z"
        fill="#0F3078"
      />
      <path
        d="M 8 8 C 6 12, 7 17, 11 19 C 12 15, 11 10, 8 8 Z"
        fill="#1B49AC"
      />
      <path
        d="M 9 9 C 13 13, 16 16, 20 20"
        stroke="#162035"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="22" cy="9" r="1.8" fill="#D48914" />
      <circle cx="9" cy="22" r="1.8" fill="#B84A2C" />
      <circle cx="16" cy="16" r="1.5" fill="#0F3078" />
    </svg>
  );
};
