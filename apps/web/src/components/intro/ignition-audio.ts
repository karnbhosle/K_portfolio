/** The repulsor charge sound, with a synthesized fallback when the file cannot play. */
export class IgnitionAudio {
  private element: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private fadeTimer: number | undefined;

  /** Starts loading early so playback begins on the click, not a beat later. */
  preload() {
    if (this.element || typeof Audio === 'undefined') return;
    this.element = new Audio('/audio/repulsor.mp3');
    this.element.preload = 'auto';
  }

  play() {
    this.preload();
    const element = this.element;
    if (!element) return this.synthesize();
    window.clearInterval(this.fadeTimer);
    element.currentTime = 0;
    element.volume = 0.6;
    element.play().catch(() => this.synthesize());
  }

  /** Fades out over ~300ms instead of cutting off mid-sound. */
  stop() {
    const element = this.element;
    if (element && !element.paused) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = window.setInterval(() => {
        element.volume = Math.max(0, element.volume - 0.1);
        if (element.volume <= 0.01) {
          window.clearInterval(this.fadeTimer);
          element.pause();
        }
      }, 30);
    }
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

  dispose() {
    window.clearInterval(this.fadeTimer);
    this.element?.pause();
    this.element = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

  private synthesize() {
    const AudioContextClass = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      const context = new AudioContextClass();
      this.context = context;
      const now = context.currentTime;
      // A charging hum that climbs for 4.6s, then a falling discharge.
      const hum = context.createOscillator();
      const humGain = context.createGain();
      hum.type = 'sine';
      hum.frequency.setValueAtTime(45, now);
      hum.frequency.exponentialRampToValueAtTime(880, now + 4.5);
      humGain.gain.setValueAtTime(0.01, now);
      humGain.gain.linearRampToValueAtTime(0.18, now + 3.8);
      humGain.gain.linearRampToValueAtTime(0.001, now + 4.8);
      hum.connect(humGain).connect(context.destination);
      hum.start(now);
      hum.stop(now + 4.8);

      const blast = context.createOscillator();
      const blastGain = context.createGain();
      blast.type = 'sine';
      blast.frequency.setValueAtTime(260, now + 4.6);
      blast.frequency.exponentialRampToValueAtTime(28, now + 5.8);
      blastGain.gain.setValueAtTime(0.0001, now);
      blastGain.gain.setValueAtTime(0.35, now + 4.6);
      blastGain.gain.linearRampToValueAtTime(0.0001, now + 5.8);
      blast.connect(blastGain).connect(context.destination);
      blast.start(now + 4.6);
      blast.stop(now + 5.8);
      blast.onended = () => { void context.close().catch(() => undefined); };
    } catch {
      // Sound is decorative; the sequence continues silently.
    }
  }
}
