/*
 * A tiny chiptune engine on the Web Audio API: pulse-wave lead, triangle bass, noise drums,
 * scheduled a little ahead of time so the beat stays tight while the game loop does its work.
 * Nothing loads over the network; every sound is synthesised. Browser-only: call it from
 * a click or key handler so the AudioContext is allowed to start.
 */

const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

function midi(name: string): number {
  const found = /^([A-G]#?)(\d)$/.exec(name);
  if (!found) throw new Error(`Bad note ${name}`);
  return 12 * (Number(found[2]) + 1) + NOTE[found[1]!]!;
}

const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);

type Step = { note: number; len: number } | null;

/** "E5 - - A5 . ..." per bar: a note, "-" holds the previous one, "." is a rest. 16 steps a bar. */
function parse(bars: string[]): Step[] {
  const steps: Step[] = [];
  let last = -1;
  for (const bar of bars) {
    const tokens = bar.trim().split(/\s+/);
    if (tokens.length !== 16) throw new Error(`Bar needs 16 steps, got ${tokens.length}: ${bar}`);
    for (const token of tokens) {
      if (token === '-') {
        const held = steps[last];
        if (held) held.len += 1;
        steps.push(null);
      } else if (token === '.') {
        steps.push(null);
        last = -1;
      } else {
        steps.push({ note: midi(token), len: 1 });
        last = steps.length - 1;
      }
    }
  }
  return steps;
}

export interface Song {
  bpm: number;
  /** One chord per bar: the bass root and the arpeggio tones. */
  chords: Array<{ root: string; tones: string[] }>;
  lead: string[];
  bass: 'octave' | 'drive';
  drums: { kick: number[]; snare: number[]; hat: number[] };
}

/** Corpus Run: bright, hopeful synthwave in A minor, the long road to retirement. */
export const runSong: Song = {
  bpm: 128,
  chords: [
    { root: 'A2', tones: ['A4', 'C5', 'E5', 'A5'] },
    { root: 'F2', tones: ['F4', 'A4', 'C5', 'F5'] },
    { root: 'C3', tones: ['C4', 'E4', 'G4', 'C5'] },
    { root: 'G2', tones: ['G4', 'B4', 'D5', 'G5'] },
    { root: 'A2', tones: ['A4', 'C5', 'E5', 'A5'] },
    { root: 'F2', tones: ['F4', 'A4', 'C5', 'F5'] },
    { root: 'G2', tones: ['G4', 'B4', 'D5', 'G5'] },
    { root: 'E2', tones: ['E4', 'G#4', 'B4', 'E5'] },
  ],
  lead: [
    'E5 - - A5 - - E5 - D5 - C5 - D5 - E5 -',
    'F5 - - E5 - - C5 - A4 - - - C5 - D5 -',
    'E5 - - G5 - - E5 - D5 - C5 - G4 - - -',
    'B4 - D5 - G5 - - - F5 - E5 - D5 - B4 -',
    'A5 - - G5 - - E5 - A5 - - G5 - E5 D5 -',
    'C5 - - D5 - - F5 - A5 - - - G5 - F5 -',
    'G5 - - F5 - - D5 - B4 - D5 - G5 - - -',
    'G#5 - - - E5 - - - B4 - - - G#4 - B4 -',
  ],
  bass: 'octave',
  drums: { kick: [0, 6, 8], snare: [4, 12], hat: [2, 6, 10, 14] },
};

/** Smog Invaders: a driving E-minor march that speeds up wave by wave. */
export const invadersSong: Song = {
  bpm: 146,
  chords: [
    { root: 'E2', tones: ['E4', 'G4', 'B4', 'E5'] },
    { root: 'C2', tones: ['C4', 'E4', 'G4', 'C5'] },
    { root: 'D2', tones: ['D4', 'F#4', 'A4', 'D5'] },
    { root: 'B1', tones: ['B3', 'D#4', 'F#4', 'B4'] },
    { root: 'E2', tones: ['E4', 'G4', 'B4', 'E5'] },
    { root: 'C2', tones: ['C4', 'E4', 'G4', 'C5'] },
    { root: 'D2', tones: ['D4', 'F#4', 'A4', 'D5'] },
    { root: 'B1', tones: ['B3', 'D#4', 'F#4', 'B4'] },
  ],
  lead: [
    'E5 - E5 - G5 - E5 - B5 - - - A5 - G5 -',
    'E5 - - - C5 - E5 - G5 - - - F#5 - E5 -',
    'D5 - D5 - F#5 - D5 - A5 - - - G5 - F#5 -',
    'D#5 - - - F#5 - - - B5 - A5 - G5 - F#5 -',
    'B5 - - - B5 - A5 G5 A5 - - - G5 - E5 -',
    'G5 - - - G5 - F#5 E5 F#5 - - - E5 - C5 -',
    'D5 - F#5 - A5 - D6 - C6 - B5 - A5 - F#5 -',
    'B5 - - - - - - - D#5 - F#5 - B5 - - -',
  ],
  bass: 'drive',
  drums: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14] },
};

export type Sfx = 'coin' | 'power' | 'jump' | 'clear' | 'hit' | 'shield' | 'kill' | 'wave' | 'win' | 'lose' | 'ping';

type Wave = OscillatorType | 'pulse25' | 'pulse12';

class Chiptune {
  private ctx: AudioContext | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private echo: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private pulses: Partial<Record<'pulse25' | 'pulse12', PeriodicWave>> = {};
  private song: Song | null = null;
  private lead: Step[] = [];
  private step = 0;
  private nextAt = 0;
  private timer: number | null = null;
  private tempo = 1;
  private visibilityBound = false;

  /** Creates (or wakes) the audio graph. Returns null where Web Audio is unavailable. */
  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return null;
      const ctx = new Context();
      const master = ctx.createGain();
      master.gain.value = 0.55;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.ratio.value = 6;
      master.connect(limiter).connect(ctx.destination);

      this.music = ctx.createGain();
      this.music.gain.value = 0;
      this.music.connect(master);
      this.effects = ctx.createGain();
      this.effects.gain.value = 0.8;
      this.effects.connect(master);

      // A dotted-eighth echo on the lead, for that synthwave space.
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.33;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.28;
      const wet = ctx.createGain();
      wet.gain.value = 0.22;
      delay.connect(feedback).connect(delay);
      delay.connect(wet).connect(this.music);
      this.echo = ctx.createGain();
      this.echo.connect(delay);

      const length = Math.floor(ctx.sampleRate * 0.5);
      this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;

      this.pulses.pulse25 = this.pulseWave(ctx, 0.25);
      this.pulses.pulse12 = this.pulseWave(ctx, 0.125);
      this.ctx = ctx;
    }
    if (!this.visibilityBound) {
      this.visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else if (this.song) void this.ctx.resume();
      });
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** A pulse wave of the given duty cycle, the classic 8-bit lead timbre. */
  private pulseWave(ctx: AudioContext, duty: number) {
    const size = 48;
    const real = new Float32Array(size);
    const imag = new Float32Array(size);
    for (let n = 1; n < size; n += 1) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  private tone(wave: Wave, frequency: number, at: number, length: number, gain: number, bus: AudioNode, slideTo?: number, vibrato = false) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    if (wave === 'pulse25' || wave === 'pulse12') osc.setPeriodicWave(this.pulses[wave]!);
    else osc.type = wave;
    osc.frequency.setValueAtTime(frequency, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.006);
    env.gain.setValueAtTime(gain, at + Math.max(0.01, length * 0.7));
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    if (vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.5;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, at);
      depth.gain.linearRampToValueAtTime(14, at + Math.min(0.25, length * 0.5));
      lfo.connect(depth).connect(osc.detune);
      lfo.start(at);
      lfo.stop(at + length + 0.02);
    }
    osc.connect(env).connect(bus);
    osc.start(at);
    osc.stop(at + length + 0.02);
    return env;
  }

  private hiss(at: number, length: number, gain: number, bus: AudioNode, band: number, q = 0.9) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = band;
    filter.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    source.connect(filter).connect(env).connect(bus);
    source.start(at, Math.random() * 0.3);
    source.stop(at + length + 0.02);
  }

  private kick(at: number, bus: AudioNode) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.55, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    osc.connect(env).connect(bus);
    osc.start(at);
    osc.stop(at + 0.2);
  }

  private schedule = () => {
    const ctx = this.ctx;
    const song = this.song;
    if (!ctx || !song) return;
    const stepLength = 60 / (song.bpm * this.tempo) / 4;
    while (this.nextAt < ctx.currentTime + 0.14) {
      this.playStep(song, this.step, this.nextAt, stepLength);
      this.nextAt += stepLength;
      this.step += 1;
    }
  };

  private playStep(song: Song, index: number, at: number, stepLength: number) {
    const bars = song.chords.length;
    const bar = Math.floor(index / 16) % bars;
    const beat = index % 16;
    const chord = song.chords[bar]!;
    const bus = this.music!;
    const root = midi(chord.root);

    // Bass: an octave pump, or a driving sixteenth line that climbs on the last beat.
    if (song.bass === 'octave') {
      if (beat % 2 === 0) this.tone('triangle', hz(root + (beat % 4 === 2 ? 12 : 0)), at, stepLength * 1.8, 0.34, bus);
    } else {
      const climb = beat >= 12 ? [0, 3, 5, 7][beat - 12]! : beat % 4 === 2 ? 12 : 0;
      this.tone('triangle', hz(root + climb), at, stepLength * 0.95, 0.32, bus);
    }

    // Arpeggio: chord tones ticking up in sixteenths, quiet and thin.
    const tone = chord.tones[beat % chord.tones.length]!;
    this.tone('pulse12', hz(midi(tone)), at, stepLength * 0.8, 0.045, bus);

    // Lead melody, with vibrato on held notes and a send to the echo.
    const note = this.lead[(index % (bars * 16))];
    if (note) {
      const length = note.len * stepLength * 0.96;
      const env = this.tone('pulse25', hz(note.note), at, length, 0.13, bus, undefined, note.len >= 3);
      env.connect(this.echo!);
    }

    // Drums from noise and a pitched sine.
    if (song.drums.kick.includes(beat)) this.kick(at, bus);
    if (song.drums.snare.includes(beat)) this.hiss(at, 0.14, 0.22, bus, 1800, 0.6);
    if (song.drums.hat.includes(beat) || (song.bass === 'drive' && beat % 2 === 1)) this.hiss(at, 0.035, 0.07, bus, 8000, 1.2);
  }

  /** Starts a song from its first bar, fading the music bus in. */
  play(song: Song) {
    const ctx = this.ensure();
    if (!ctx || !this.music) return;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.song = song;
    this.lead = parse(song.lead);
    this.step = 0;
    this.tempo = 1;
    this.nextAt = ctx.currentTime + 0.08;
    this.music.gain.cancelScheduledValues(ctx.currentTime);
    this.music.gain.setValueAtTime(this.music.gain.value, ctx.currentTime);
    this.music.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.3);
    this.schedule();
    this.timer = window.setInterval(this.schedule, 25);
  }

  /** Fades the music out. Sound effects still play. */
  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    this.music.gain.cancelScheduledValues(ctx.currentTime);
    this.music.gain.setValueAtTime(this.music.gain.value, ctx.currentTime);
    this.music.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
  }

  get playing() {
    return this.song !== null;
  }

  /** 1 is the written tempo; games nudge it up as the round heats up. */
  setTempo(scale: number) {
    this.tempo = Math.max(0.5, Math.min(1.6, scale));
  }

  sfx(name: Sfx) {
    const ctx = this.ensure();
    if (!ctx || !this.effects) return;
    const at = ctx.currentTime + 0.005;
    const bus = this.effects;
    const seq = (wave: Wave, notes: string[], each: number, gain: number) =>
      notes.forEach((note, index) => this.tone(wave, hz(midi(note)), at + index * each, each * 1.1, gain, bus));
    switch (name) {
      case 'coin': seq('pulse25', ['B5', 'E6'], 0.055, 0.1); break;
      case 'power': seq('pulse25', ['C5', 'E5', 'G5', 'C6', 'E6'], 0.045, 0.1); break;
      case 'jump': this.tone('pulse25', 260, at, 0.16, 0.08, bus, 720); break;
      case 'clear': this.tone('triangle', hz(midi('A5')), at, 0.08, 0.16, bus); break;
      case 'shield': this.tone('triangle', 1250, at, 0.14, 0.14, bus, 1900); break;
      case 'kill':
        this.hiss(at, 0.09, 0.12, bus, 2600, 0.8);
        this.tone('pulse12', 900, at, 0.08, 0.05, bus, 220);
        break;
      case 'hit':
        this.hiss(at, 0.3, 0.3, bus, 700, 0.5);
        this.tone('pulse25', 440, at, 0.32, 0.12, bus, 70);
        break;
      case 'wave': seq('pulse25', ['E5', 'G5', 'B5', 'E6'], 0.09, 0.11); break;
      case 'win': seq('pulse25', ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.11, 0.12); break;
      case 'lose': seq('triangle', ['G4', 'F#4', 'F4', 'E4'], 0.18, 0.2); break;
      case 'ping': this.tone('sine', 880, at, 0.22, 0.08, bus, 1320); break;
    }
  }
}

let engine: Chiptune | null = null;

/** The shared engine; one AudioContext for the whole page. */
export function chiptune(): Chiptune {
  engine ??= new Chiptune();
  return engine;
}
