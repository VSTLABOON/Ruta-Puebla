import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, WalkRecord } from '../types/userRecord';
import { PassportState } from '@ruta-abierta/shared-types';

export interface SyncStatus {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isCloudConfigured: boolean;
  pendingQueueCount: number;
  lastSyncTime: string | null;
}

class HybridDbSyncService {
  private supabase: SupabaseClient | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOffline: boolean = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private lastSyncTime: string | null = null;

  constructor() {
    const metaEnv = (import.meta as any).env || {};
    const supabaseUrl =
      metaEnv.VITE_SUPABASE_URL || 'https://ricxqfkpxcozqrxaccmk.supabase.co';
    const supabaseAnonKey =
      metaEnv.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpY3hxZmtweGNvenFyeGFjY21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMTg5NjQsImV4cCI6MjEwNzY5NDk2NH0.NYrlyEXVUSACg7AOOoLNtbd_UGyk4BLn0yDHjRoq8E8';

    if (supabaseUrl && supabaseAnonKey && typeof supabaseUrl === 'string' && supabaseUrl.startsWith('http')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      } catch (err) {
        console.warn('Error inicializando cliente de Supabase:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyStatus();
        this.drainOfflineQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyStatus();
      });
    }
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  public getStatus(): SyncStatus {
    const effectiveOnline = this.isOnline && !this.isSimulatedOffline;
    return {
      isOnline: effectiveOnline,
      isSimulatedOffline: this.isSimulatedOffline,
      isCloudConfigured: !!this.supabase,
      pendingQueueCount: this.getQueue().length,
      lastSyncTime: this.lastSyncTime
    };
  }

  public toggleSimulatedOffline(): boolean {
    this.isSimulatedOffline = !this.isSimulatedOffline;
    this.notifyStatus();
    if (!this.isSimulatedOffline && this.isOnline) {
      this.drainOfflineQueue();
    }
    return this.isSimulatedOffline;
  }

  private notifyStatus() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => cb(status));
  }

  private getQueue(): Array<{ type: string; payload: any; timestamp: number }> {
    try {
      const q = localStorage.getItem('ruta_abierta_offline_queue');
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  }

  private setQueue(queue: Array<{ type: string; payload: any; timestamp: number }>) {
    try {
      localStorage.setItem('ruta_abierta_offline_queue', JSON.stringify(queue));
    } catch {}
    this.notifyStatus();
  }

  private enqueue(type: string, payload: any) {
    const queue = this.getQueue();
    queue.push({ type, payload, timestamp: Date.now() });
    this.setQueue(queue);
  }

  // --- Operaciones de Persistencia ---

  public async saveUserProfile(profile: UserProfile): Promise<void> {
    // 1. Guardar siempre en almacenamiento local seguro (0 fallos)
    try {
      localStorage.setItem('ruta_abierta_tourist_user', JSON.stringify(profile));
    } catch {}

    // 2. Si hay conexión y nube configurada, guardar en Supabase
    const effectiveOnline = this.isOnline && !this.isSimulatedOffline;
    if (this.supabase && effectiveOnline) {
      try {
        await this.supabase.from('user_profiles').upsert({
          id: profile.id,
          name: profile.name,
          nickname: profile.nickname,
          email: profile.email || null,
          role: profile.role,
          mobility_profile: profile.mobilityProfile,
          level: profile.level,
          xp: profile.xp
        });
        this.lastSyncTime = new Date().toLocaleTimeString();
        this.notifyStatus();
      } catch (err) {
        console.warn('Fallo guardando en Supabase, encolando local:', err);
        this.enqueue('user_profile', profile);
      }
    } else {
      this.enqueue('user_profile', profile);
    }
  }

  public async saveWalkRecord(record: WalkRecord, userId: string): Promise<void> {
    // 1. Guardar en bitácora local
    try {
      const existing = localStorage.getItem('ruta_abierta_walk_records');
      const list: WalkRecord[] = existing ? JSON.parse(existing) : [];
      const updated = [record, ...list.filter((r) => r.id !== record.id)];
      localStorage.setItem('ruta_abierta_walk_records', JSON.stringify(updated));
    } catch {}

    // 2. Sincronizar en la nube
    const effectiveOnline = this.isOnline && !this.isSimulatedOffline;
    if (this.supabase && effectiveOnline) {
      try {
        await this.supabase.from('walk_records').upsert({
          id: record.id,
          user_id: userId,
          title: record.title,
          date: record.date,
          duration_minutes: record.durationMinutes,
          distance_meters: record.distanceMeters,
          stops_visited: record.stopsVisited,
          badges_earned: record.badgesEarned,
          zone: record.zone
        });
        this.lastSyncTime = new Date().toLocaleTimeString();
        this.notifyStatus();
      } catch (err) {
        this.enqueue('walk_record', { record, userId });
      }
    } else {
      this.enqueue('walk_record', { record, userId });
    }
  }

  public async savePassportState(passport: PassportState, userId?: string): Promise<void> {
    try {
      localStorage.setItem('ruta_abierta_passport', JSON.stringify(passport));
    } catch {}

    const effectiveOnline = this.isOnline && !this.isSimulatedOffline;
    if (this.supabase && effectiveOnline && userId) {
      try {
        await this.supabase.from('user_passports').upsert({
          user_id: userId,
          unlocked_secrets: passport.unlocked_secrets,
          visited_poi_ids: passport.visited_poi_ids,
          collected_badges: passport.collected_badges
        });
        this.lastSyncTime = new Date().toLocaleTimeString();
        this.notifyStatus();
      } catch (err) {
        this.enqueue('passport_state', { passport, userId });
      }
    } else if (userId) {
      this.enqueue('passport_state', { passport, userId });
    }
  }

  public async drainOfflineQueue(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0 || !this.supabase) return;
    if (!this.isOnline || this.isSimulatedOffline) return;

    const remaining: typeof queue = [];

    for (const item of queue) {
      try {
        if (item.type === 'user_profile') {
          const p = item.payload as UserProfile;
          await this.supabase.from('user_profiles').upsert({
            id: p.id,
            name: p.name,
            nickname: p.nickname,
            email: p.email || null,
            role: p.role,
            mobility_profile: p.mobilityProfile,
            level: p.level,
            xp: p.xp
          });
        } else if (item.type === 'walk_record') {
          const { record, userId } = item.payload;
          await this.supabase.from('walk_records').upsert({
            id: record.id,
            user_id: userId,
            title: record.title,
            date: record.date,
            duration_minutes: record.durationMinutes,
            distance_meters: record.distanceMeters,
            stops_visited: record.stopsVisited,
            badges_earned: record.badgesEarned,
            zone: record.zone
          });
        } else if (item.type === 'passport_state') {
          const { passport, userId } = item.payload;
          await this.supabase.from('user_passports').upsert({
            user_id: userId,
            unlocked_secrets: passport.unlocked_secrets,
            visited_poi_ids: passport.visited_poi_ids,
            collected_badges: passport.collected_badges
          });
        }
      } catch (err) {
        console.warn('Error reintentando sincronización de cola:', err);
        remaining.push(item);
      }
    }

    this.setQueue(remaining);
    this.lastSyncTime = new Date().toLocaleTimeString();
    this.notifyStatus();
  }
}

export const dbSync = new HybridDbSyncService();
