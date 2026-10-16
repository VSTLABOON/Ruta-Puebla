export interface UserProfile {
  id: string;
  name: string;
  nickname: string;
  email?: string;
  role: 'tourist' | 'artisan' | 'government';
  mobilityProfile: 'sin_restriccion' | 'movilidad_reducida' | 'silla_de_ruedas';
  level: number;
  xp: number;
  createdAt: string;
  rememberMe: boolean;
}

export interface WalkRecord {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  distanceMeters: number;
  stopsVisited: number;
  badgesEarned: number;
  zone: string;
}

export interface ExplorerStats {
  totalKmWalked: number;
  longestWalkKm: number;
  totalTimeMinutes: number;
  totalBadgesUnlocked: number;
  localWorkshopsSupported: number;
  walksHistory: WalkRecord[];
}
