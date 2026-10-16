/**
 * Web Audio API Tactical Synthesizer for Ruta Abierta Puebla.
 * 100% native, zero external audio dependencies.
 */

class TacticalAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Pulso Urbano: Deep tactical radar sweep with sub-bass sonar ping.
   */
  public playUrbanPulse(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 100]);
      } catch {}
    }

    const t = ctx.currentTime;

    // Sub-bass sonar ping
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(320, t);
    osc1.frequency.exponentialRampToValueAtTime(70, t + 0.45);

    gain1.gain.setValueAtTime(0.25, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.55);

    // High frequency telemetry radar chirp
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1400, t + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(2200, t + 0.28);

    gain2.gain.setValueAtTime(0.12, t + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(t + 0.08);
    osc2.stop(t + 0.38);
  }

  /**
   * Proximity Alert: 2-tone melodic notification when user arrives within 50m of POI.
   */
  public playProximityChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }

    const t = ctx.currentTime;
    const notes = [659.25, 880.0]; // E5, A5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0, t + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, t + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.45);
    });
  }

  /**
   * Stamp / Secret Unlocked: Resonant triumphant chord.
   */
  public playStampSuccess(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 50, 120, 60, 200]);
      } catch {}
    }

    const t = ctx.currentTime;
    // C Major Arpeggio (C5, E5, G5, C6)
    const freqs = [523.25, 659.25, 783.99, 1046.5];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);

      gain.gain.setValueAtTime(0, t + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.2, t + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.6);
    });
  }

  /**
   * Subtle tactile tick on interactive command buttons.
   */
  public playTacticalClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }
}

export const tacticalAudio = new TacticalAudioEngine();
