export type UserRole = 'tourist' | 'artisan' | 'government';
export type AppMode = 'visitor' | 'artisans' | 'sustainability';

export interface RoleDefinition {
  id: UserRole;
  name: {
    es: string;
    en: string;
  };
  shortTitle: {
    es: string;
    en: string;
  };
  description: {
    es: string;
    en: string;
  };
  iconName: 'Compass' | 'Store' | 'BarChart3';
  allowedModes: AppMode[];
  defaultMode: AppMode;
  theme: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    accentColor: string;
  };
}

export const USER_ROLES: Record<UserRole, RoleDefinition> = {
  tourist: {
    id: 'tourist',
    name: {
      es: 'Turista / Explorador Urbano',
      en: 'Tourist / Urban Explorer'
    },
    shortTitle: {
      es: 'Explorador',
      en: 'Explorer'
    },
    description: {
      es: 'Itinerarios peatonales accesibles a pie, mapa vectorial 3D y pasaporte cultural.',
      en: 'Accessible walking itineraries, 3D vector map, and cultural passport.'
    },
    iconName: 'Compass',
    allowedModes: ['visitor'],
    defaultMode: 'visitor',
    theme: {
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      accentColor: '#f59e0b'
    }
  },
  artisan: {
    id: 'artisan',
    name: {
      es: 'Artesano / Comercio Local',
      en: 'Artisan / Local Merchant'
    },
    shortTitle: {
      es: 'Artesano',
      en: 'Artisan'
    },
    description: {
      es: 'Gestión de taller tradicional, sellado de pasaporte y proyección de afluencia.',
      en: 'Traditional workshop management, passport stamping, and foot traffic projection.'
    },
    iconName: 'Store',
    allowedModes: ['artisans', 'visitor'],
    defaultMode: 'artisans',
    theme: {
      badgeBg: 'bg-sky-500/20',
      badgeText: 'text-sky-300',
      badgeBorder: 'border-sky-500/40',
      accentColor: '#0ea5e9'
    }
  },
  government: {
    id: 'government',
    name: {
      es: 'Gobierno / Planificador (SECIHTI)',
      en: 'Government / Planner (SECIHTI)'
    },
    shortTitle: {
      es: 'Gobierno / Planificador',
      en: 'Government / Planner'
    },
    description: {
      es: 'Analítica macro de 150 agentes sintéticos, priorización de obras públicas y cupos zonales.',
      en: 'Macro analytics of 150 synthetic agents, public works ranking, and zonal quotas.'
    },
    iconName: 'BarChart3',
    allowedModes: ['sustainability', 'artisans', 'visitor'],
    defaultMode: 'sustainability',
    theme: {
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
      accentColor: '#10b981'
    }
  }
};
