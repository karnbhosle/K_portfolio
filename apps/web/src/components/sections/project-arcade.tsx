'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { getMotion, getSound, setSound, useSound } from '@/lib/preferences';
import { chiptune, invadersSong, runSong, type Song } from '@/lib/chiptune';
import { Volume, VolumeOff } from '@/components/ui/icons';
import { bandFor, CorpusRun, pollutants, powers, POWER_SECONDS, SmogInvaders, type CanvasGame, type Direction, type Hud, type PowerKind } from './arcade-games';

type Phase = 'ready' | 'playing' | 'over';

// Only one game plays music at a time: whichever started last owns the soundtrack.
let musicOwner: symbol | null = null;

/** Owns the canvas, the frame loop, the HUD state and the soundtrack for one game class. */
function useCanvasGame<G extends CanvasGame>(Game: new () => G, song: Song, tempo: (hud: Hud) => number) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<G | null>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const frame = useRef(0);
  const [me] = useState(() => Symbol('arcade'));
  const [phase, setPhase] = useState<Phase>('ready');
  const [hud, setHud] = useState<Hud | null>(null);
  const [result, setResult] = useState<{ hud: Hud; won: boolean } | null>(null);
  const sound = useSound();

  const startMusic = useCallback(() => {
    if (getSound() !== 'on') return;
    musicOwner = me;
    chiptune().play(song);
  }, [me, song]);

  const stopMusic = useCallback(() => {
    if (musicOwner !== me) return;
    musicOwner = null;
    chiptune().stop();
  }, [me]);

  // The Sound toggle can change mid-round; follow it. Leaving the page stops the music.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (sound === 'on' && musicOwner !== me) startMusic();
    if (sound === 'off') stopMusic();
  }, [sound, phase, me, startMusic, stopMusic]);
  useEffect(() => stopMusic, [stopMusic]);

  const paint = useCallback((round: G, t: number) => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context || !size.current.w) return;
    const { w, h, dpr } = size.current;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, w, h);
    round.draw(context, w, h, t);
  }, []);

  // Fit the canvas to its box (sharp on high-density screens) and draw an idle scene behind the title.
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const preview = new Game();
    const fit = () => {
      const box = element.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: box.width, h: box.height, dpr };
      element.width = Math.round(box.width * dpr);
      element.height = Math.round(box.height * dpr);
      const round = game.current ?? preview;
      if (!game.current) round.step(0, box.width, box.height);
      paint(round, performance.now() / 1000);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame.current); };
  }, [Game, paint]);

  const start = () => {
    window.cancelAnimationFrame(frame.current);
    const round = new Game();
    game.current = round;
    setResult(null);
    setHud(round.hud());
    setPhase('playing');
    startMusic();
    let last = performance.now();
    let shown = '';
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // a hidden tab never jumps ahead
      last = now;
      round.step(dt, size.current.w, size.current.h);
      paint(round, now / 1000);
      if (round.sfx.length) {
        // A purifier pulse can clear a whole row in one frame: play each cue once.
        if (getSound() === 'on') new Set(round.sfx).forEach((cue) => chiptune().sfx(cue));
        round.sfx.length = 0;
      }
      const next = round.hud();
      const key = JSON.stringify(next);
      if (key !== shown) {
        shown = key;
        setHud(next);
        if (musicOwner === me) chiptune().setTempo(tempo(next));
      }
      if (round.done) {
        stopMusic();
        if (getSound() === 'on') chiptune().sfx(round.won ? 'win' : 'lose');
        setResult({ hud: next, won: round.won });
        setPhase('over');
        return;
      }
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
  };

  const stop = () => {
    window.cancelAnimationFrame(frame.current);
    stopMusic();
    if (game.current) setResult({ hud: game.current.hud(), won: false });
    setPhase('over');
  };

  const explain = () => { window.cancelAnimationFrame(frame.current); stopMusic(); setResult(null); setPhase('over'); };

  return { canvas, game, phase, hud, result, start, stop, explain };
}

type Legend = Array<{ icon: ReactNode; game: string; project: string }>;

function ArcadeShell({ id, project, title, subtitle, accent, controls, phase, hud, onStart, onStop, onExplain, result, legend, briefAnchor, avatar, children }: {
  id: string; project: string; title: string; subtitle: string; accent: 'cyan' | 'copper'; controls: string;
  phase: Phase; hud: ReactNode; onStart: () => void; onStop: () => void; onExplain: () => void;
  result: ReactNode; legend: Legend; briefAnchor: string; avatar?: ReactNode; children: ReactNode;
}) {
  const [motionOff, setMotionOff] = useState(false);
  // Motion preference is only known in the browser.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMotionOff(getMotion() !== 'on'); }, [phase]);

  return (
    <section aria-labelledby={`${id}-game-title`} className="arcade blueprint mt-12 sm:mt-16" data-accent={accent} data-phase={phase}>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-4 py-3 sm:px-6">
        <h4 id={`${id}-game-title`} className="label flex items-center gap-2">
          <span className="arcade-led h-1.5 w-1.5 rounded-full bg-[#ff4fd8]" aria-hidden="true" />
          {project} arcade · {title}
        </h4>
        <div className="flex min-h-6 flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">
          {hud}
          <MusicToggle />
        </div>
      </div>

      <div className="relative z-10">
        {children}

        {phase === 'ready' ? (
          <div className="arcade-overlay is-title absolute inset-0 z-20 flex items-center justify-center overflow-y-auto p-4">
            <div className="arcade-card text-center">
              {avatar}
              <p className="arcade-kicker font-mono text-[0.6875rem] uppercase tracking-[0.18em]">{project} · arcade</p>
              <p className="arcade-title mt-3 font-display font-bold uppercase leading-[0.9] tracking-[-0.02em]">{title}</p>
              <p className="arcade-sub mt-2 font-display text-lg font-medium">{subtitle}</p>
              <button type="button" className="arcade-play btn btn-primary mt-7" onClick={onStart}>
                <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1v8l7-4-7-4Z" fill="currentColor" /></svg>
                Play now
              </button>
              <p className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">{controls}</p>
              {motionOff ? <p className="mx-auto mt-2 max-w-xs text-xs text-ink-subtle">Motion is paused on this site; the game moves, so play only if that suits you.</p> : null}
              <button type="button" className="mt-3 text-xs text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-ink" onClick={onExplain}>Just tell me about {project}</button>
            </div>
          </div>
        ) : null}

        {phase === 'over' ? (
          <div className="arcade-overlay absolute inset-0 z-20 overflow-y-auto p-4 sm:p-6">
            <div className="arcade-card mx-auto max-w-2xl">
              <div role="status">{result}</div>
              <h5 className="label mt-5">What you just played</h5>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {legend.map((item, index) => (
                  <li key={item.game} className="arcade-legend flex gap-3 rounded-md border border-line bg-black/50 p-3" style={{ '--i': index } as CSSProperties}>
                    <span className="mt-0.5 shrink-0" aria-hidden="true">{item.icon}</span>
                    <span className="text-sm">
                      <span className="block font-medium text-ink">{item.game}</span>
                      <span className="mt-0.5 block text-ink-muted">{item.project}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-secondary" onClick={onStart}>Play again</button>
                <a href={`#${briefAnchor}`} className="btn btn-quiet">Read the full case study</a>
              </div>
            </div>
          </div>
        ) : null}

        {phase === 'playing' ? (
          <button type="button" className="btn btn-quiet absolute right-2 top-2 z-20 text-xs" onClick={onStop}>End</button>
        ) : null}
      </div>
    </section>
  );
}

/** Chiptune soundtrack and effects on or off; shares the site-wide Sound choice. */
function MusicToggle() {
  const on = useSound() === 'on';
  return (
    <button
      type="button"
      className="arcade-music -my-1 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-[#ff4fd8] hover:text-ink"
      aria-pressed={on}
      title={on ? 'Mute the chiptune soundtrack' : 'Play the chiptune soundtrack'}
      onClick={() => setSound(on ? 'off' : 'on')}
    >
      {on ? <Volume size={14} /> : <VolumeOff size={14} />}
      Music
    </button>
  );
}

const Lives = ({ count }: { count: number }) => (
  <span className="flex items-center gap-1" role="img" aria-label={`${count} ${count === 1 ? 'life' : 'lives'} left`}>
    {[0, 1, 2].map((index) => <span key={index} className={`h-2 w-2 rotate-45 ${index < count ? 'bg-[#ff4fd8] shadow-[0_0_6px_#ff2bd6]' : 'bg-white/15'}`} />)}
  </span>
);

/** The active five-second power-up, with the time it has left. */
function PowerPill({ hud }: { hud: Hud | null }) {
  const kind = hud?.power as PowerKind | '' | undefined;
  if (!kind) return null;
  const info = powers[kind];
  const left = Number(hud?.powerLeft ?? 0);
  return (
    <span className="arcade-power flex items-center gap-2 rounded-full border px-2.5 py-0.5 normal-case tracking-normal text-ink" style={{ '--power': info.color } as CSSProperties}>
      <span className="font-medium">{info.label}</span>
      <span className="tabular-nums text-ink-muted">{left.toFixed(1)}s</span>
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <span className="arcade-power-bar absolute inset-y-0 left-0 w-full" style={{ transform: `scaleX(${Math.max(0, left / POWER_SECONDS)})` }} />
      </span>
    </span>
  );
}

/** Karna as the player character: swept dark hair, a trimmed beard, black suit and white shirt. */
function KarnaAvatar() {
  return (
    <svg className="arcade-avatar mx-auto mb-3 h-20 w-20 sm:h-24 sm:w-24" viewBox="0 0 120 120" role="img" aria-label="Player: Karna, drawn as a neon game character">
      <defs>
        <linearGradient id="avatar-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE45C" />
          <stop offset="0.5" stopColor="#FF8A3D" />
          <stop offset="1" stopColor="#FF2BD6" />
        </linearGradient>
        <clipPath id="avatar-clip"><circle cx="60" cy="60" r="56" /></clipPath>
      </defs>
      <circle cx="60" cy="60" r="56" fill="#140330" />
      <g clipPath="url(#avatar-clip)">
        <circle cx="60" cy="54" r="36" fill="url(#avatar-sun)" opacity="0.9" />
        {[0, 1, 2, 3].map((index) => <rect key={index} x="18" y={60 + index * 7} width="84" height={1.6 + index * 1.2} fill="#140330" />)}
        {/* suit, shirt and lapels */}
        <path d="M14 120 C16 96 33 88 60 86 C87 88 104 96 106 120 Z" fill="#17131F" />
        <path d="M50 86 L60 104 L70 86 Z" fill="#F1F1F5" />
        <path d="M44 88 L56 106 L50 120 L39 96 Z M76 88 L64 106 L70 120 L81 96 Z" fill="#241D31" />
        <path d="M14 120 C16 96 33 88 60 86" fill="none" stroke="#FF2BD6" strokeWidth="1.6" />
        <path d="M106 120 C104 96 87 88 60 86" fill="none" stroke="#3EF6FF" strokeWidth="1.6" />
        {/* neck and face */}
        <rect x="53" y="73" width="14" height="15" rx="4" fill="#B97F5E" />
        <ellipse cx="42.6" cy="59" rx="3" ry="5" fill="#C08665" />
        <ellipse cx="77.4" cy="59" rx="3" ry="5" fill="#C08665" />
        <ellipse cx="60" cy="58" rx="17" ry="21" fill="#C9926F" />
        {/* trimmed beard and moustache */}
        <path d="M44.5 61 C45.5 76 53 81.5 60 81.5 C67 81.5 74.5 76 75.5 61 C72.5 70 67 73.5 60 73.5 C53 73.5 47.5 70 44.5 61 Z" fill="#2A1F1A" opacity="0.92" />
        <path d="M53 66.5 C56 65 64 65 67 66.5 C64 67.8 56 67.8 53 66.5 Z" fill="#2A1F1A" />
        <path d="M55.5 70.4 C58 71.8 62 71.8 64.5 70.4" fill="none" stroke="#7A3F35" strokeWidth="1.4" strokeLinecap="round" />
        {/* eyes and brows */}
        <ellipse cx="53" cy="56.5" rx="2.2" ry="1.6" fill="#120E10" />
        <ellipse cx="67" cy="56.5" rx="2.2" ry="1.6" fill="#120E10" />
        <path d="M48 51.8 C51 50 55 50 57 51.3 M63 51.3 C65 50 69 50 72 51.8" fill="none" stroke="#120E10" strokeWidth="2.2" strokeLinecap="round" />
        {/* swept-up hair */}
        <path d="M42.5 56 C40.5 40 46 30 58 28.5 C66 27 76.5 30 79 38 C81 44 79 50 77.5 56 C76 47 72 42.5 64 41.5 C58 40.5 52 41.5 48 44 C45 47 43.5 51 42.5 56 Z" fill="#120E10" />
        <path d="M48 35.5 C55 29.5 67 28.5 76 34.5" fill="none" stroke="#FF2BD6" strokeWidth="1.2" opacity="0.8" />
      </g>
      <circle cx="60" cy="60" r="56" fill="none" stroke="#FF2BD6" strokeWidth="1.5" opacity="0.85" />
    </svg>
  );
}

/** Keyboard play while a round is on, without scrolling the page. */
function useGameKeys(active: boolean, handle: (key: string, down: boolean, repeat: boolean) => boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return;
      if (handle(event.key, event.type === 'keydown', event.repeat)) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, [active, handle]);
}

// The soundtrack picks up as the round heats up: with age on the road, with each wave in the sky.
const runTempo = (hud: Hud) => 1 + Math.max(0, Number(hud.age ?? 25) - 25) / 35 * 0.18;
const invadersTempo = (hud: Hud) => 1 + (Number(hud.wave ?? 1) - 1) * 0.08;

const directionFor: Record<string, Direction> = {
  ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
};

// ---------------------------------------------------------------------------------------------

export function CorpusRunGame({ id, name, briefAnchor }: { id: string; name: string; briefAnchor: string }) {
  const { canvas, game, phase, hud, result, start, stop, explain } = useCanvasGame(CorpusRun, runSong, runTempo);
  const playing = phase === 'playing';
  const onKey = useCallback((key: string, down: boolean, repeat: boolean) => {
    const direction = directionFor[key];
    const jump = direction === 'up' || key === ' ';
    if (!direction && !jump) return false;
    if (down && !repeat) {
      if (jump) game.current?.jump();
      else if (direction === 'left') game.current?.left();
      else if (direction === 'right') game.current?.right();
    }
    return true;
  }, [game]);
  useGameKeys(playing, onKey);

  // Touch and mouse: tap the sides to switch lanes and the middle to jump; swipes work too.
  const swipe = useRef<{ x: number; y: number } | null>(null);

  return (
    <ArcadeShell
      id={id}
      project={name}
      title="Corpus Run"
      subtitle="Race to retirement"
      accent="copper"
      controls="Lanes ← → · jump ↑ or Space · tap the sides, tap the middle or swipe up · chiptune soundtrack"
      phase={phase}
      avatar={<KarnaAvatar />}
      hud={<>
        <span>Age <span className="tabular-nums text-ink">{hud?.age ?? 25}</span></span>
        <span>Invested <span className="tabular-nums text-ink">{hud?.invested ?? 0}</span></span>
        <span>Corpus <span className="tabular-nums text-[#FFD23F]">{hud?.corpus ?? 0}</span></span>
        <PowerPill hud={hud} />
        <Lives count={Number(hud?.lives ?? 3)} />
      </>}
      onStart={start}
      onStop={stop}
      onExplain={explain}
      briefAnchor={briefAnchor}
      result={result ? (
        <>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[#ff7ae3]">{result.won ? 'Retired at 60' : `Run ended at age ${result.hud.age}`}</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">Corpus {result.hud.corpus} <span className="text-base font-medium text-ink-muted">game points</span></p>
          <p className="mt-1 text-sm text-ink-muted">{result.hud.invested} investments made and {result.hud.jumped} inflation {Number(result.hud.jumped) === 1 ? 'hurdle' : 'hurdles'} jumped, compounding all the way.</p>
        </>
      ) : (
        <p className="font-display text-2xl font-semibold tracking-tight text-ink">How {name} plans a financial life</p>
      )}
      legend={[
        { icon: <span className="block h-6 w-6 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff6c9,#ffd23f_60%,#b26a00)]" />, game: 'Coins: investments made', project: 'The corpus they build compounds as you run. CorpusAI forecasts that net-worth trajectory with a dual-head LSTM.' },
        { icon: <span className="mt-1.5 block h-3 w-6 rounded-sm bg-[#FF3E6C]" />, game: 'Inflation hurdles: jump them', project: 'Inflation impact is one of the six stages in its ML pipeline, so the plan clears it instead of crashing into it.' },
        { icon: <span className="block h-6 w-4 rounded-sm bg-[#9D4EDD]" />, game: 'Anomaly pillars: dodge them', project: 'Isolation Forest identifies anomalies, and K-Means groups peers.' },
        { icon: <span className="block h-6 w-6 rounded-full border-2 border-[#3EF6FF] shadow-[0_0_8px_#3ef6ff]" />, game: 'Shield, Phase, Magnet: 5 s each', project: 'Game extras. The nearest thing in a real plan is the cushion that bucket-strategy allocation and systematic withdrawal planning give.' },
        { icon: <span className="block h-6 w-6 rounded-full bg-[linear-gradient(180deg,#ffe45c,#ff2bd6)]" />, game: 'The finish at 60', project: 'Retirement sustainability, with SWP, LTCG impact and bucket-strategy allocation planned in.' },
      ]}
    >
      <canvas
        ref={canvas}
        className="arcade-canvas block h-[22rem] w-full touch-none select-none sm:h-[28rem]"
        role="img"
        aria-label="Corpus Run: Karna runs a three-lane neon highway. Coins are investments; red hurdles are inflation, purple pillars are anomalies, hexagons are power-ups."
        onPointerDown={(event) => { if (playing) swipe.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={(event) => {
          if (!playing || !swipe.current) return;
          const dx = event.clientX - swipe.current.x;
          const dy = event.clientY - swipe.current.y;
          swipe.current = null;
          if (dy < -30 && Math.abs(dy) > Math.abs(dx)) { game.current?.jump(); return; }
          if (Math.abs(dx) > 30) { if (dx < 0) game.current?.left(); else game.current?.right(); return; }
          const box = event.currentTarget.getBoundingClientRect();
          const at = (event.clientX - box.left) / box.width;
          if (at < 1 / 3) game.current?.left();
          else if (at > 2 / 3) game.current?.right();
          else game.current?.jump();
        }}
      />
    </ArcadeShell>
  );
}

export function SmogInvadersGame({ id, name, briefAnchor }: { id: string; name: string; briefAnchor: string }) {
  const { canvas, game, phase, hud, result, start, stop, explain } = useCanvasGame(SmogInvaders, invadersSong, invadersTempo);
  const playing = phase === 'playing';
  const onKey = useCallback((key: string, down: boolean) => {
    const direction = directionFor[key];
    if (direction) { game.current?.press(direction, down); return true; }
    return key === ' ';
  }, [game]);
  useGameKeys(playing, onKey);

  const aim = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!playing) return;
    const box = event.currentTarget.getBoundingClientRect();
    game.current?.steer((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
  };

  const aqi = Number(hud?.aqi ?? 220);
  const band = bandFor(aqi);
  const finalBand = result ? bandFor(Number(result.hud.aqi)) : band;

  return (
    <ArcadeShell
      id={id}
      project={name}
      title="Smog Invaders"
      subtitle="Defend the city’s air"
      accent="cyan"
      controls="Fly: mouse, touch or arrow keys · your ship fires on its own · chiptune soundtrack"
      phase={phase}
      hud={<>
        <span>Wave <span className="tabular-nums text-ink">{hud?.wave ?? 1}/3</span></span>
        <span>Cleared <span className="tabular-nums text-ink">{hud?.destroyed ?? 0}</span></span>
        <span>AQI <span className="tabular-nums" style={{ color: band.color }}>{aqi}</span> <span className="hidden sm:inline" style={{ color: band.color }}>{band.name}</span></span>
        <PowerPill hud={hud} />
        <Lives count={Number(hud?.lives ?? 3)} />
      </>}
      onStart={start}
      onStop={stop}
      onExplain={explain}
      briefAnchor={briefAnchor}
      result={result ? (
        <>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-cyan">{result.won ? 'Air cleared' : 'Round over'}</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">{result.hud.destroyed} {Number(result.hud.destroyed) === 1 ? 'pollutant' : 'pollutants'} destroyed</p>
          <p className="mt-1 text-sm text-ink-muted">Final AQI <span style={{ color: finalBand.color }}>{result.hud.aqi} · {finalBand.name}</span> · wave {result.hud.wave} of 3</p>
        </>
      ) : (
        <p className="font-display text-2xl font-semibold tracking-tight text-ink">How {name} reads the air</p>
      )}
      legend={[
        { icon: <span className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-[0.5rem] font-bold text-black" style={{ background: pollutants[0]!.color }}>PM</span>, game: 'The invaders', project: 'The seven inputs to its Random Forest Regressor: PM2.5, PM10, NOx, NH3, CO, SO2 and O3.' },
        { icon: <span className="block h-6 w-6 rounded-sm bg-[linear-gradient(90deg,#2E9E6A,#E8C547,#D9473F)]" />, game: 'The AQI meter', project: 'Every predicted AQI maps onto a CPCB band, with a generated health advisory.' },
        { icon: <span className="block h-6 w-6 border-b-2 border-cyan" />, game: 'The city', project: 'Predictions and trends for Delhi, Mumbai, Kolkata, Chennai and Bengaluru, in Recharts dashboards.' },
        { icon: <span className="block h-5 w-6 bg-[linear-gradient(180deg,#f5e9ff,#6b2a8c)] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />, game: 'Your ship', project: 'The Flask ML service: Express forwards the pollutant inputs to it, and MongoDB keeps the prediction history.' },
        { icon: <span className="block h-6 w-6 rounded-full border-2 border-[#FF2BD6] shadow-[0_0_8px_#ff2bd6]" />, game: 'Spread shot, Shield, Purifier', project: 'Game extras dropped by destroyed invaders, there to make the round fun. AeroSense itself predicts the AQI and issues the advisory.' },
      ]}
    >
      <canvas
        ref={canvas}
        className="arcade-canvas block h-[22rem] w-full touch-none select-none sm:h-[28rem]"
        role="img"
        aria-label="Smog Invaders: a ship defends a neon city skyline from invaders named after pollutants."
        onPointerMove={aim}
        onPointerDown={aim}
      />
    </ArcadeShell>
  );
}
