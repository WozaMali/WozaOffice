/**
 * Audio Notification Service
 * Generates ping sounds for new collections and withdrawal requests
 */

class AudioNotificationService {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.7;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings();
    }
  }

  private loadSettings() {
    const saved = localStorage.getItem('audio-notifications');
    if (saved) {
      const settings = JSON.parse(saved);
      this.isEnabled = settings.enabled !== false;
      this.volume = settings.volume || 0.7;
    }
  }

  private saveSettings() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('audio-notifications', JSON.stringify({
        enabled: this.isEnabled,
        volume: this.volume
      }));
    }
  }

  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  private createPingSound(frequency: number, duration: number = 0.35): void {
    if (!this.isEnabled) return;

    this.getAudioContext().then(audioContext => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(Math.max(0.05, this.volume * 0.6), audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    }).catch(error => {
      console.warn('Failed to play audio notification:', error);
    });
  }

  // Ensure audio context is unlocked by a user gesture
  ensureUnlocked(): void {
    this.getAudioContext().then(ctx => {
      if (ctx.state === 'running') return;
      ctx.resume().catch(() => {});
    }).catch(() => {});
  }

  playCollectionSound(): void {
    console.log('🔔 Playing collection notification sound');
    // Higher frequency ping for collections
    this.createPingSound(800, 0.3);
  }

  playWithdrawalSound(): void {
    console.log('🔔 Playing withdrawal notification sound');
    // Lower frequency ping for withdrawals
    this.createPingSound(600, 0.4);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.saveSettings();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

// Export singleton instance
export const audioNotificationService = new AudioNotificationService();
