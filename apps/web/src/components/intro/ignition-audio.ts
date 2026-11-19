/**
 * The repulsor clip provided for the intro (public/audio/repulsor.mp3), with a synthesized fallback
 * when the file cannot play. `time()` exposes the clip's own playhead so the visuals can follow it.
 */
export class IgnitionAudio {
  private element: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private synthStart = 0;
  private fadeTimer: number | undefined;

  /** Starts loading early so playback begins on the click, not a beat later. */
  preload() {
    if (this.element || typeof Audio === 'undefined') return;
    this.element = new Audio('/audio/repulsor.mp3');
    this.element.preload = 'auto';
    this.element.load();
  }

  /** Seconds into the clip (or the fallback), or null when nothing is playing. */
  time(): number | null {
    const element = this.element;
    if (element && !element.paused && !element.ended) return element.currentTime;
    if (this.context && this.context.state === 'running') return this.context.currentTime - this.synthStart;
    return null;
  }

  /** Resolves once sound is actually playing (or the fallback has started), so visuals can start in step. */
  async play(): Promise<void> {
    this.preload();
    const element = this.element;
    if (!element) return this.synthesize();
    window.clearInterval(this.fadeTimer);
    element.currentTime = 0;
    element.volume = 0.6;
    try {
      await element.play();
    } catch {
      this.synthesize();
    }
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
      this.synthStart = now;
      // Same beats as the clip: a hum that climbs to 3.0s, the blast at 3.15s, a second boom at 4.05s.
      const hum = context.createOscillator();
      const humGain = context.createGain();
      hum.type = 'sine';
      hum.frequency.setValueAtTime(45, now);
      hum.frequency.exponentialRampToValueAtTime(880, now + 3.0);
      humGain.gain.setValueAtTime(0.01, now);
      humGain.gain.linearRampToValueAtTime(0.18, now + 2.9);
      humGain.gain.linearRampToValueAtTime(0.001, now + 3.1);
      hum.connect(humGain).connect(context.destination);
      hum.start(now);
      hum.stop(now + 3.1);

      const boom = (at: number, gain: number, until: number) => {
        const blast = context.createOscillator();
        const blastGain = context.createGain();
        blast.type = 'sine';
        blast.frequency.setValueAtTime(260, now + at);
        blast.frequency.exponentialRampToValueAtTime(28, now + until);
        blastGain.gain.setValueAtTime(0.0001, now);
        blastGain.gain.setValueAtTime(gain, now + at);
        blastGain.gain.linearRampToValueAtTime(0.0001, now + until);
        blast.connect(blastGain).connect(context.destination);
        blast.start(now + at);
        blast.stop(now + until);
        return blast;
      };
      boom(3.15, 0.3, 3.9);
      boom(4.05, 0.35, 5.2).onended = () => { void context.close().catch(() => undefined); };
    } catch {
      // Sound is decorative; the sequence continues silently.
    }
  }
}
