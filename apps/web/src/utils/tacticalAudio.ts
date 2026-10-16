/**
 * Silent Tactical Engine for Ruta Abierta Puebla.
 * Zero audio emission; maintains optional haptic vibration where supported.
 */

class TacticalAudioEngine {
  /**
   * Pulso Urbano: Silent haptic pulse without audio emission.
   */
  public playUrbanPulse(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 100]);
      } catch {}
    }
  }

  /**
   * Proximity Alert: Subtle silent haptic chime.
   */
  public playProximityChime(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }
  }

  /**
   * Stamp / Secret Unlocked: Haptic confirmation without audio emission.
   */
  public playStampSuccess(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 50, 120, 60, 200]);
      } catch {}
    }
  }

  /**
   * Subtle tactile tick on interactive command buttons (100% silent).
   */
  public playTacticalClick(): void {
    // 100% silent
  }
}

export const tacticalAudio = new TacticalAudioEngine();
