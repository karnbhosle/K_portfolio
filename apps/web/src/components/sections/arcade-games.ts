/*
 * The two project games, as plain classes that step and draw onto a canvas. They know nothing about
 * React: the component owns the loop and feeds in input. Scores are game points, not project data.
 * Both share one look: neon synthwave, a striped sun on the horizon, magenta and cyan glow.
 */
import type { Sfx } from '@/lib/chiptune';

export type Hud = Record<string, string | number>;

export interface CanvasGame {
  done: boolean;
  won: boolean;
  step(dt: number, w: number, h: number): void;
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void;
  hud(): Hud;
  /** Sound cues raised since the last frame; the component plays and clears them. */
  sfx: Sfx[];
}

type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Float = { text: string; x: number; y: number; life: number; color: string };

export const NEON = {
  magenta: '#FF2BD6',
  pink: '#FF4F9A',
  cyan: '#3EF6FF',
  violet: '#9D4EDD',
  gold: '#FFD23F',
  red: '#FF3E6C',
};

/** Five-second power-ups across both games. */
export const POWER_SECONDS = 5;
export type PowerKind = 'shield' | 'phase' | 'magnet' | 'spread' | 'purifier';
export const powers: Record<PowerKind, { label: string; color: string }> = {
  shield: { label: 'Shield', color: NEON.cyan },
  phase: { label: 'Phase', color: NEON.magenta },
  magnet: { label: 'Magnet', color: NEON.gold },
  spread: { label: 'Spread shot', color: NEON.gold },
  purifier: { label: 'Purifier', color: NEON.magenta },
};

const MONO = '"JetBrains Mono", ui-monospace, monospace';

function burst(list: Spark[], x: number, y: number, color: string, count = 14) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 160;
    list.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.5 + Math.random() * 0.3, color });
  }
}

function tickEffects(sparks: Spark[], floats: Float[], dt: number) {
  for (const spark of sparks) { spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.vy += 220 * dt; spark.life -= dt; }
  for (const float of floats) { float.y -= 38 * dt; float.life -= dt; }
  return { sparks: sparks.filter((spark) => spark.life > 0), floats: floats.filter((float) => float.life > 0) };
}

function drawEffects(ctx: CanvasRenderingContext2D, sparks: Spark[], floats: Float[]) {
  ctx.save();
  for (const spark of sparks) {
    ctx.globalAlpha = Math.max(0, Math.min(1, spark.life * 2));
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x - 1.5, spark.y - 1.5, 3, 3);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 12px ${MONO}`;
  ctx.shadowBlur = 8;
  for (const float of floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, float.life * 1.6));
    ctx.shadowColor = float.color;
    ctx.fillStyle = float.color;
    ctx.fillText(float.text, float.x, float.y);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- The synthwave set: sky, stars, a striped sun, neon ridges and a skyline --------------------

function synthSky(ctx: CanvasRenderingContext2D, w: number, bottom: number, t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, bottom);
  sky.addColorStop(0, '#05010F');
  sky.addColorStop(0.55, '#1C0536');
  sky.addColorStop(1, '#4A0D57');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, bottom);
  for (let index = 0; index < 70; index += 1) {
    const twinkle = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.7 + index * 1.3));
    ctx.fillStyle = `rgba(255, 236, 255, ${twinkle})`;
    ctx.fillRect((index * 97.3) % w, (index * 53.7) % (bottom * 0.72), index % 9 === 0 ? 2 : 1.3, index % 9 === 0 ? 2 : 1.3);
  }
  return sky;
}

function synthSun(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sky: CanvasGradient) {
  ctx.save();
  ctx.shadowColor = NEON.magenta;
  ctx.shadowBlur = r * 0.7;
  const body = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  body.addColorStop(0, '#FFE45C');
  body.addColorStop(0.5, '#FF8A3D');
  body.addColorStop(1, NEON.magenta);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Stripes cut across the lower half, thicker toward the horizon.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sky;
  for (let index = 0; index < 7; index += 1) {
    ctx.fillRect(cx - r - 2, cy + r * (0.04 + index * 0.135), r * 2 + 4, 1.4 + index * 1.5 * Math.max(0.6, r / 70));
  }
  ctx.restore();
}

const peaks = [0.1, 0.55, 0.3, 0.85, 0.45, 0.7, 0.2, 0.35, 0.15, 0.4, 0.25, 0.65, 0.4, 0.9, 0.5, 0.75, 0.2];
function ridge(ctx: CanvasRenderingContext2D, w: number, base: number, height: number) {
  const last = peaks.length - 1;
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let index = 0; index <= last; index += 1) {
    const x = (index / last) * w;
    const edge = Math.abs(x - w / 2) / (w / 2); // low in the middle, so the sun shows
    ctx.lineTo(x, base - peaks[index]! * height * (0.12 + 0.88 * edge));
  }
  ctx.lineTo(w, base);
  const fill = ctx.createLinearGradient(0, base - height, 0, base);
  fill.addColorStop(0, '#2A0845');
  fill.addColorStop(1, '#0B0220');
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  ctx.shadowColor = NEON.magenta;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = 'rgba(255, 43, 214, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// A fixed skyline, so the city is the same every frame.
const towers = Array.from({ length: 28 }, (_, index) => ({ w: 0.025 + ((index * 37) % 11) / 400, h: 0.04 + ((index * 53) % 17) / 160 }));
function skyline(ctx: CanvasRenderingContext2D, w: number, base: number, scale: number) {
  let x = 0;
  let index = 0;
  while (x < w) {
    const tower = towers[index % towers.length]!;
    const tw = tower.w * w;
    const th = tower.h * scale;
    ctx.fillStyle = '#12052A';
    ctx.fillRect(x, base - th, tw - 2, th);
    ctx.fillStyle = index % 3 === 0 ? 'rgba(255, 43, 214, 0.75)' : 'rgba(62, 246, 255, 0.55)';
    ctx.fillRect(x, base - th, tw - 2, 1.5);
    for (let wy = base - th + 6; wy < base - 4; wy += 9) {
      for (let wx = x + 4; wx < x + tw - 6; wx += 7) if ((wx * 7 + wy * 3 + index) % 5 === 0) ctx.fillRect(wx, wy, 2, 3);
    }
    x += tw;
    index += 1;
  }
}

/** A hexagonal power-up token with its icon. */
export function drawToken(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kind: PowerKind, t: number) {
  const color = powers[kind].color;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2.2) * 0.18);
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  for (let side = 0; side < 6; side += 1) {
    const angle = (Math.PI / 3) * side - Math.PI / 2;
    ctx[side ? 'lineTo' : 'moveTo'](Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(12, 2, 28, 0.88)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.stroke();
  ctx.shadowBlur = 6;
  ctx.lineWidth = Math.max(1.4, r * 0.11);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = r * 0.5;
  ctx.beginPath();
  if (kind === 'shield') {
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.85, -s * 0.6);
    ctx.quadraticCurveTo(s * 0.8, s * 0.55, 0, s);
    ctx.quadraticCurveTo(-s * 0.8, s * 0.55, -s * 0.85, -s * 0.6);
    ctx.closePath();
  } else if (kind === 'phase') {
    ctx.setLineDash([s * 0.35, s * 0.25]);
    ctx.arc(0, -s * 0.45, s * 0.38, 0, Math.PI * 2);
    ctx.moveTo(-s * 0.7, s);
    ctx.quadraticCurveTo(0, -s * 0.2, s * 0.7, s);
  } else if (kind === 'magnet') {
    ctx.arc(0, -s * 0.05, s * 0.6, Math.PI, 0, true);
    ctx.moveTo(-s * 0.6, -s * 0.05);
    ctx.lineTo(-s * 0.6, -s * 0.8);
    ctx.moveTo(s * 0.6, -s * 0.05);
    ctx.lineTo(s * 0.6, -s * 0.8);
  } else if (kind === 'spread') {
    for (const angle of [-0.45, 0, 0.45]) { ctx.moveTo(0, s * 0.8); ctx.lineTo(Math.sin(angle) * s * 1.1, s * 0.8 - Math.cos(angle) * s * 1.6); }
  } else {
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.moveTo(s * 0.85, 0);
    ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
}

// =============================================================================================
// Corpus Run (CorpusAI): Karna runs a three-lane neon highway from age 25 to retirement at 60.
// Coins are investments; the corpus compounds while he runs. Inflation hurdles can be jumped;
// anomaly pillars have to be dodged. Power-ups last five seconds.
// =============================================================================================
type RunPower = 'shield' | 'phase' | 'magnet';
type Thing = { kind: 'coin' | 'hurdle' | 'pillar' | 'power'; lane: number; z: number; hit: boolean; gone: boolean; power?: RunPower };
const JUMP_SECONDS = 0.68;
const runPowerOrder: RunPower[] = ['shield', 'phase', 'magnet'];

const SUIT = '#17131F';
const SUIT_LIGHT = '#2B2538';
const SKIN = '#C9926F';
const HAIR = '#120E10';
const SHIRT = '#F1F1F5';

type RunnerPose = { lift: number; stride: number; phase: boolean; shield: boolean; blink: boolean; t: number };

/** Karna, seen from behind: swept dark hair, a trimmed beard at the jaw, black suit, white shirt. */
function drawRunner(ctx: CanvasRenderingContext2D, cx: number, ground: number, size: number, pose: RunnerPose) {
  const u = size / 100;
  const air = pose.lift > 0.04;
  const p = pose.stride;
  const rise = pose.lift * size * 0.72;
  const bob = air ? 0 : Math.abs(Math.sin(p)) * 2.4 * u;

  // Shadow on the road, smaller while airborne.
  const shrink = 1 - pose.lift * 0.4;
  ctx.fillStyle = `rgba(62, 246, 255, ${0.24 * shrink})`;
  ctx.beginPath();
  ctx.ellipse(cx, ground + 1, 21 * u * shrink, 5 * u * shrink, 0, 0, Math.PI * 2);
  ctx.fill();

  const limb = (points: number[], width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * u;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0]! * u, points[1]! * u);
    for (let index = 2; index < points.length; index += 2) ctx.lineTo(points[index]! * u, points[index + 1]! * u);
    ctx.stroke();
  };
  const blob = (x: number, y: number, rx: number, ry: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x * u, y * u, rx * u, ry * u, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const figure = () => {
    // Legs and shoes
    for (const side of [-1, 1]) {
      const swing = Math.sin(p + (side > 0 ? Math.PI : 0));
      const up = air ? 0.75 : Math.max(0, swing);
      const footX = side * (7 - up * 2);
      const footY = -up * 17;
      limb([side * 6, -46, side * (7.5 + up * 1.5), -24 - up * 10, footX, footY - 3], 9.5, SUIT);
      blob(footX, footY - 2, 5.2, 3.2, '#09080D');
      ctx.fillStyle = up > 0.2 ? NEON.cyan : 'rgba(62, 246, 255, 0.55)';
      ctx.fillRect((footX - 4) * u, (footY + 0.3) * u, 8 * u, 1.3 * u);
    }

    // Jacket with neon rim light: magenta on the left, cyan on the right.
    ctx.save();
    ctx.shadowColor = NEON.magenta;
    ctx.shadowBlur = 12 * u;
    const jacket = ctx.createLinearGradient(-17 * u, 0, 17 * u, 0);
    jacket.addColorStop(0, '#41174F');
    jacket.addColorStop(0.2, SUIT);
    jacket.addColorStop(0.8, SUIT);
    jacket.addColorStop(1, '#123B4C');
    ctx.fillStyle = jacket;
    ctx.beginPath();
    ctx.moveTo(-17 * u, -83 * u);
    ctx.quadraticCurveTo(0, -88 * u, 17 * u, -83 * u);
    ctx.lineTo(13.5 * u, -43 * u);
    ctx.lineTo(-13.5 * u, -43 * u);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    limb([-17, -83, -13.5, -43], 1.4, 'rgba(255, 43, 214, 0.9)');
    limb([17, -83, 13.5, -43], 1.4, 'rgba(62, 246, 255, 0.9)');
    limb([0, -84, 0, -50], 0.8, 'rgba(255, 255, 255, 0.08)');
    limb([0, -50, 0, -43], 0.9, 'rgba(255, 255, 255, 0.16)'); // back vent
    if (size > 56) {
      ctx.save();
      ctx.shadowColor = NEON.cyan;
      ctx.shadowBlur = 6;
      ctx.fillStyle = 'rgba(62, 246, 255, 0.9)';
      ctx.font = `700 ${Math.round(8 * u)}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('K.B', 0, -65 * u);
      ctx.restore();
    }

    // Arms swing against the legs; up and out mid-jump.
    for (const side of [-1, 1]) {
      const swing = Math.sin(p + (side > 0 ? 0 : Math.PI));
      const elbow = air ? [side * 24, -92] : [side * 19.5, -66 + swing * 4];
      const hand = air ? [side * 26, -104] : [side * (17.5 - Math.max(0, swing) * 3), -52 - swing * 12];
      limb([side * 15.5, -81, elbow[0]!, elbow[1]!, hand[0]!, hand[1]!], 7.5, SUIT_LIGHT);
      blob(hand[0]!, hand[1]!, 2.9, 2.9, SKIN);
      blob(hand[0]! * 0.97, hand[1]! + (air ? 3 : -2.4), 3, 1.3, SHIRT);
    }

    // Neck, shirt collar, jacket collar
    ctx.fillStyle = SKIN;
    ctx.fillRect(-4 * u, -92 * u, 8 * u, 7 * u);
    ctx.fillStyle = SHIRT;
    ctx.beginPath();
    ctx.moveTo(-6.5 * u, -85.5 * u);
    ctx.lineTo(6.5 * u, -85.5 * u);
    ctx.lineTo(5.5 * u, -89.5 * u);
    ctx.lineTo(-5.5 * u, -89.5 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = SUIT;
    ctx.beginPath();
    ctx.moveTo(-10 * u, -84.5 * u);
    ctx.quadraticCurveTo(0, -87.5 * u, 10 * u, -84.5 * u);
    ctx.lineTo(9 * u, -82 * u);
    ctx.lineTo(-9 * u, -82 * u);
    ctx.closePath();
    ctx.fill();

    // Head: ears, the back of the head, the beard line at the jaw, swept-up hair.
    blob(-9.6, -101, 2.2, 3.6, SKIN);
    blob(9.6, -101, 2.2, 3.6, SKIN);
    blob(0, -101, 9.6, 11.5, SKIN);
    blob(-7.6, -94, 2.6, 3.6, '#231A16');
    blob(7.6, -94, 2.6, 3.6, '#231A16');
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.moveTo(-9.9 * u, -97 * u);
    ctx.quadraticCurveTo(-12 * u, -110 * u, -6 * u, -115 * u);
    ctx.quadraticCurveTo(0, -120 * u, 7 * u, -116 * u);
    ctx.quadraticCurveTo(12.5 * u, -111 * u, 9.9 * u, -97 * u);
    ctx.quadraticCurveTo(0, -92.5 * u, -9.9 * u, -97 * u);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 43, 214, 0.55)';
    ctx.lineWidth = 1 * u;
    ctx.beginPath();
    ctx.moveTo(-8 * u, -112 * u);
    ctx.quadraticCurveTo(0, -119 * u, 7.5 * u, -114 * u);
    ctx.stroke();
  };

  ctx.save();
  ctx.translate(cx, ground - rise - bob);
  if (pose.phase) {
    // Phase: the runner turns to light, trailing afterimages.
    for (const [dx, alpha] of [[-7, 0.16], [7, 0.16], [0, 0.22]] as const) {
      ctx.save();
      ctx.translate(dx * u, 6 * u);
      ctx.globalAlpha = alpha;
      figure();
      ctx.restore();
    }
    ctx.globalAlpha = 0.5 + 0.18 * Math.sin(pose.t * 22);
  }
  if (pose.blink) ctx.globalAlpha = 0.35;
  figure();
  ctx.globalAlpha = 1;

  if (pose.shield) {
    ctx.save();
    const bubble = ctx.createRadialGradient(0, -58 * u, 10 * u, 0, -58 * u, 70 * u);
    bubble.addColorStop(0, 'rgba(62, 246, 255, 0)');
    bubble.addColorStop(1, 'rgba(62, 246, 255, 0.22)');
    ctx.fillStyle = bubble;
    ctx.beginPath();
    ctx.ellipse(0, -58 * u, 40 * u, 68 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = NEON.cyan;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(62, 246, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10 * u, 6 * u]);
    ctx.lineDashOffset = -pose.t * 40;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

export class CorpusRun implements CanvasGame {
  done = false;
  won = false;
  sfx: Sfx[] = [];
  lane = 0;
  private x = 0;
  private age = 25;
  private invested = 0;
  private corpus = 0;
  private lives = 3;
  private jumped = 0;
  private things: Thing[] = [];
  private sparks: Spark[] = [];
  private floats: Float[] = [];
  private travelled = 0;
  private nextRow = 12;
  private nextPower = 6;
  private powerTurn = 0;
  private speed = 14;
  private time = 0;
  private flash = 0;
  private hurt = 0;
  private jumpT = -1; // seconds into the jump; below zero on the ground
  private power: { kind: RunPower; left: number } | null = null;
  private dims = { w: 0, h: 0 };

  left() { this.lane = Math.max(-1, this.lane - 1); }
  right() { this.lane = Math.min(1, this.lane + 1); }
  jump() { if (this.jumpT < 0 && !this.done) { this.jumpT = 0; this.sfx.push('jump'); } }

  private lift() { return this.jumpT < 0 ? 0 : Math.sin(Math.PI * Math.min(1, this.jumpT / JUMP_SECONDS)); }

  private project(lane: number, z: number) {
    const { w, h } = this.dims;
    const horizon = h * 0.36;
    const s = 5 / (5 + z);
    const y = horizon + (h * 0.97 - horizon) * s;
    const half = w * 0.012 + w * 0.36 * s;
    const laneW = (half * 2) / 3;
    return { x: w / 2 + lane * laneW, y, s, laneW };
  }

  private runnerSize(laneW: number) { return Math.min(laneW * 0.6, this.dims.h * 0.25); }

  /** Rows are sparse: usually one barrier, never all three lanes, always a lane of coins. */
  private spawnRow(z: number) {
    const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
    const blocks = this.time > 20 && Math.random() < 0.2 ? 2 : Math.random() < 0.7 ? 1 : 0;
    for (let index = 0; index < blocks; index += 1) {
      this.things.push({ kind: Math.random() < 0.62 ? 'hurdle' : 'pillar', lane: lanes[index]!, z, hit: false, gone: false });
    }
    const free = lanes[blocks] ?? 0;
    for (let index = 0; index < 4; index += 1) this.things.push({ kind: 'coin', lane: free, z: z + index * 2.2, hit: false, gone: false });
    if (this.nextPower <= 0) {
      this.nextPower = 8 + Math.random() * 3;
      const power = runPowerOrder[this.powerTurn % runPowerOrder.length]!;
      this.powerTurn += 1;
      this.things.push({ kind: 'power', power, lane: lanes[2] ?? free, z: z + 5, hit: false, gone: false });
    }
  }

  step(dt: number, w: number, h: number) {
    this.dims = { w, h };
    if (this.done) return;
    this.time += dt;
    this.age = Math.min(60, 25 + this.time / 0.9);
    this.speed = 14 + this.time * 0.3;
    const move = this.speed * dt;
    this.travelled += move;
    this.x += (this.lane - this.x) * Math.min(1, dt * 14);
    if (this.jumpT >= 0) { this.jumpT += dt; if (this.jumpT >= JUMP_SECONDS) this.jumpT = -1; }
    this.corpus *= 1 + 0.07 * dt; // invested money compounds while you run
    this.flash = Math.max(0, this.flash - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    this.nextPower -= dt;

    const me = this.project(this.x, 0.9);
    const size = this.runnerSize(me.laneW);
    const chest = me.y - this.lift() * size * 0.72 - size * 0.65;
    if (this.power) {
      this.power.left -= dt;
      if (this.power.left <= 0) {
        this.floats.push({ text: `${powers[this.power.kind].label} off`, x: me.x, y: chest - size * 0.3, life: 0.8, color: '#C9B8E8' });
        this.power = null;
      }
    }

    for (const thing of this.things) thing.z -= move;
    // Magnet: coins in the other lanes drift into the runner's.
    if (this.power?.kind === 'magnet') {
      for (const thing of this.things) if (thing.kind === 'coin' && !thing.hit && thing.z < 16) thing.lane += (this.x - thing.lane) * Math.min(1, dt * 7);
    }
    this.nextRow -= move;
    if (this.nextRow <= 0) { this.nextRow = 13 + Math.random() * 4; this.spawnRow(58); }

    const lift = this.lift();
    for (const thing of this.things) {
      if (thing.hit || thing.z > 1.6 || thing.z < 0.2 || Math.abs(thing.lane - this.x) > 0.45) continue;
      thing.hit = true;
      if (thing.kind === 'coin') {
        thing.gone = true;
        this.invested += 1;
        this.corpus += 10;
        burst(this.sparks, me.x, chest, NEON.gold, 8);
        this.sfx.push('coin');
        this.floats.push({ text: '+1 invested', x: me.x, y: chest - size * 0.35, life: 0.7, color: '#FFE9A8' });
      } else if (thing.kind === 'power' && thing.power) {
        thing.gone = true;
        this.power = { kind: thing.power, left: POWER_SECONDS };
        burst(this.sparks, me.x, chest, powers[thing.power].color, 26);
        this.sfx.push('power');
        this.floats.push({ text: `${powers[thing.power].label} · ${POWER_SECONDS}s`, x: me.x, y: chest - size * 0.4, life: 1, color: powers[thing.power].color });
      } else if (thing.kind === 'hurdle' && lift > 0.3) {
        this.jumped += 1;
        this.sfx.push('clear');
        this.floats.push({ text: 'Cleared', x: me.x, y: chest - size * 0.35, life: 0.6, color: NEON.cyan });
      } else if (this.power?.kind === 'shield') {
        thing.gone = true;
        burst(this.sparks, me.x, chest, NEON.cyan, 22);
        this.sfx.push('shield');
        this.floats.push({ text: 'Shield held', x: me.x, y: chest - size * 0.35, life: 0.7, color: NEON.cyan });
      } else if (this.power?.kind === 'phase') {
        this.floats.push({ text: 'Phased through', x: me.x, y: chest - size * 0.35, life: 0.7, color: NEON.magenta });
        this.sfx.push('shield');
      } else if (this.hurt <= 0) {
        const inflation = thing.kind === 'hurdle';
        this.lives -= 1;
        this.corpus *= inflation ? 0.85 : 0.9;
        this.flash = 0.35;
        this.hurt = 1.1;
        burst(this.sparks, me.x, chest, inflation ? NEON.red : NEON.violet, 18);
        this.sfx.push('hit');
        this.floats.push({ text: inflation ? 'Inflation −15%' : 'Anomaly −10%', x: me.x, y: chest - size * 0.4, life: 0.9, color: '#FF8FB1' });
        if (this.lives <= 0) this.done = true;
      }
    }
    this.things = this.things.filter((thing) => thing.z > -1.5 && !thing.gone);
    ({ sparks: this.sparks, floats: this.floats } = tickEffects(this.sparks, this.floats, dt));
    if (this.age >= 60) { this.done = true; this.won = true; }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    this.dims = { w, h };
    const horizon = h * 0.36;
    const sky = synthSky(ctx, w, horizon, t);
    const sunR = Math.min(w * 0.15, h * 0.19);
    synthSun(ctx, w / 2, horizon - sunR * 0.45, sunR, sky);
    ridge(ctx, w, horizon, h * 0.13);

    // The ground: a magenta perspective grid rolling toward you.
    ctx.fillStyle = '#07010F';
    ctx.fillRect(0, horizon, w, h - horizon);
    const glow = ctx.createLinearGradient(0, horizon, 0, horizon + h * 0.16);
    glow.addColorStop(0, 'rgba(255, 43, 214, 0.35)');
    glow.addColorStop(1, 'rgba(255, 43, 214, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon, w, h * 0.16);
    ctx.save();
    ctx.shadowColor = NEON.magenta;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(255, 43, 214, 0.5)';
    ctx.lineWidth = 1;
    for (let lane = -9.5; lane <= 9.5; lane += 1) {
      const a = this.project(lane, 60);
      const b = this.project(lane, -0.6);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    const offset = this.travelled % 3;
    for (let z = -offset; z < 60; z += 3) {
      if (z < -0.6) continue;
      const a = this.project(-9.5, z);
      const b = this.project(9.5, z);
      ctx.globalAlpha = Math.max(0.12, Math.min(1, 1.4 * a.s));
      ctx.lineWidth = Math.max(1, 2 * a.s);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();

    // The highway: three dark lanes with cyan edges and moving dashes.
    const far = this.project(0, 60);
    const near = this.project(0, -0.6);
    ctx.fillStyle = 'rgba(12, 3, 30, 0.9)';
    ctx.beginPath();
    ctx.moveTo(w / 2 - far.laneW * 1.5, far.y);
    ctx.lineTo(w / 2 + far.laneW * 1.5, far.y);
    ctx.lineTo(w / 2 + near.laneW * 1.5, near.y);
    ctx.lineTo(w / 2 - near.laneW * 1.5, near.y);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.shadowColor = NEON.cyan;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = NEON.cyan;
    ctx.lineWidth = 2.5;
    for (const side of [-1.5, 1.5]) {
      const a = this.project(side, 60);
      const b = this.project(side, -0.6);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 79, 154, 0.75)';
    ctx.shadowColor = NEON.pink;
    const dash = this.travelled % 4;
    for (let z = -dash; z < 60; z += 4) {
      for (const side of [-0.5, 0.5]) {
        const a = this.project(side, Math.max(0, z));
        const b = this.project(side, Math.max(0, z + 1.6));
        ctx.lineWidth = Math.max(1, 3 * a.s);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Coins, power-ups and barriers, far to near.
    const sorted = [...this.things].sort((a, b) => b.z - a.z);
    for (const thing of sorted) {
      if (thing.z < -0.5) continue;
      const p = this.project(thing.lane, thing.z);
      if (thing.kind === 'coin') {
        const r = p.laneW * 0.17;
        const spin = Math.abs(Math.cos(t * 4 + thing.z));
        ctx.save();
        ctx.translate(p.x, p.y - r * 2.4);
        ctx.scale(Math.max(0.2, spin), 1);
        const gold = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        gold.addColorStop(0, '#FFF6C9');
        gold.addColorStop(0.6, NEON.gold);
        gold.addColorStop(1, '#B26A00');
        ctx.shadowColor = NEON.gold;
        ctx.shadowBlur = 16 * p.s;
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        if (r > 6) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#4A2A00';
          ctx.font = `700 ${Math.round(r * 1.2)}px "Space Grotesk", system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('₹', 0, r * 0.05);
        }
        ctx.restore();
      } else if (thing.kind === 'power' && thing.power) {
        const r = p.laneW * 0.22;
        drawToken(ctx, p.x, p.y - r * 2 - Math.sin(t * 3) * r * 0.25, r, thing.power, t);
      } else if (thing.kind === 'hurdle') {
        // Inflation: a low neon hurdle you can jump.
        const bw = p.laneW * 0.84;
        const bh = p.laneW * 0.3;
        ctx.save();
        ctx.shadowColor = NEON.red;
        ctx.shadowBlur = 16 * p.s;
        ctx.strokeStyle = NEON.red;
        ctx.lineWidth = Math.max(1.5, 4 * p.s);
        ctx.beginPath();
        ctx.moveTo(p.x - bw / 2, p.y);
        ctx.lineTo(p.x - bw / 2, p.y - bh);
        ctx.moveTo(p.x + bw / 2, p.y);
        ctx.lineTo(p.x + bw / 2, p.y - bh);
        ctx.stroke();
        const bar = ctx.createLinearGradient(0, p.y - bh, 0, p.y - bh * 0.45);
        bar.addColorStop(0, '#FF5C86');
        bar.addColorStop(1, '#8A0F3A');
        ctx.fillStyle = bar;
        roundRect(ctx, p.x - bw / 2, p.y - bh, bw, bh * 0.55, Math.max(2, 5 * p.s));
        ctx.fill();
        ctx.restore();
        if (bh > 12) {
          ctx.fillStyle = '#fff';
          ctx.font = `700 ${Math.max(8, Math.round(bh * 0.3))}px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('↑ INFLATION', p.x, p.y - bh * 0.72);
        }
      } else {
        // Anomaly: a tall glitching pillar you have to dodge.
        const bw = p.laneW * 0.62;
        const bh = p.laneW * 0.95;
        const jitter = Math.sin(t * 31 + thing.z) > 0.82 ? 3 * p.s : 0;
        ctx.save();
        ctx.shadowColor = NEON.violet;
        ctx.shadowBlur = 18 * p.s;
        const fill = ctx.createLinearGradient(0, p.y - bh, 0, p.y);
        fill.addColorStop(0, '#B76CFF');
        fill.addColorStop(1, '#2A0A55');
        ctx.fillStyle = fill;
        roundRect(ctx, p.x - bw / 2 + jitter, p.y - bh, bw, bh, Math.max(2, 6 * p.s));
        ctx.fill();
        ctx.strokeStyle = 'rgba(62, 246, 255, 0.8)';
        ctx.lineWidth = Math.max(1, 2 * p.s);
        ctx.stroke();
        ctx.restore();
        if (bw > 26) {
          ctx.fillStyle = '#fff';
          ctx.font = `700 ${Math.max(8, Math.round(bw * 0.17))}px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ANOMALY', p.x + jitter, p.y - bh * 0.55);
        }
      }
    }

    // Karna
    const me = this.project(this.x, 0.9);
    drawRunner(ctx, me.x, me.y, this.runnerSize(me.laneW), {
      lift: this.lift(),
      stride: t * (8 + this.speed * 0.3),
      phase: this.power?.kind === 'phase',
      shield: this.power?.kind === 'shield',
      blink: this.hurt > 0 && Math.floor(t * 16) % 2 === 0,
      t,
    });

    drawEffects(ctx, this.sparks, this.floats);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 62, 108, ${this.flash * 0.55})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  hud(): Hud {
    return {
      age: Math.floor(this.age),
      invested: this.invested,
      corpus: Math.round(this.corpus),
      lives: this.lives,
      jumped: this.jumped,
      power: this.power?.kind ?? '',
      powerLeft: this.power ? Math.ceil(this.power.left * 10) / 10 : 0,
    };
  }
}

// =============================================================================================
// Smog Invaders (AeroSense): a ship defends the city from pollutant invaders. It fires on its own;
// the player flies it. Three waves; from wave two, invaders break formation and dive. Destroyed
// invaders sometimes drop power-ups. The AQI meter follows how many invaders are left and how low.
// =============================================================================================
export const pollutants: Array<{ name: string; color: string }> = [
  { name: 'PM2.5', color: '#F59E0B' },
  { name: 'PM10', color: '#D97706' },
  { name: 'NOx', color: '#EF4444' },
  { name: 'NH3', color: '#22C55E' },
  { name: 'CO', color: '#94A3B8' },
  { name: 'SO2', color: '#EAB308' },
  { name: 'O3', color: '#38BDF8' },
];
export const cpcb = [
  { name: 'Good', high: 50, color: '#2E9E6A' },
  { name: 'Satisfactory', high: 100, color: '#8DC63F' },
  { name: 'Moderate', high: 200, color: '#E8C547' },
  { name: 'Poor', high: 300, color: '#E8893A' },
  { name: 'Very poor', high: 400, color: '#D9473F' },
  { name: 'Severe', high: 500, color: '#A3303B' },
];
export const bandFor = (aqi: number) => cpcb.find((band) => aqi <= band.high) ?? cpcb[cpcb.length - 1]!;

type AirPower = 'shield' | 'spread' | 'purifier';
type Dive = { t: number; x0: number; y0: number; x: number; y: number };
type Invader = { col: number; row: number; alive: boolean; dive: Dive | null; fade: number };
type Shot = { x: number; y: number; vx: number; vy: number };
type Capsule = { x: number; y: number; kind: AirPower };
type Trail = { x: number; y: number; life: number; hue: string };
const WAVES = 3;
const airPowerOrder: AirPower[] = ['spread', 'shield', 'purifier'];
export type Direction = 'left' | 'right' | 'up' | 'down';

export class SmogInvaders implements CanvasGame {
  done = false;
  won = false;
  sfx: Sfx[] = [];
  private wave = 1;
  private destroyed = 0;
  private lives = 3;
  private aqi = 220;
  private px = 0;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private target: { x: number; y: number } | null = null;
  private keys: Record<Direction, boolean> = { left: false, right: false, up: false, down: false };
  private invaders: Invader[] = [];
  private rows = 2;
  private fx = 0;
  private fy = 0;
  private dir = 1;
  private bullets: Shot[] = [];
  private bombs: Shot[] = [];
  private capsules: Capsule[] = [];
  private trail: Trail[] = [];
  private sparks: Spark[] = [];
  private floats: Float[] = [];
  private power: { kind: AirPower; left: number } | null = null;
  private pulse: { x: number; y: number; r: number } | null = null;
  private powerTurn = 0;
  private waveKills = 0;
  private waveDrops = 0;
  private fireIn = 0.4;
  private bombIn = 1.6;
  private diveIn = 3;
  private flash = 0;
  private hurt = 0;
  private banner = 1.2;
  private ready = false;
  private dims = { w: 0, h: 0 };

  /** Pointer steering: a target as fractions of the canvas. The ship flies there smoothly. */
  steer(fx: number, fy = 1) { this.target = { x: Math.min(1, Math.max(0, fx)), y: Math.min(1, Math.max(0, fy)) }; }
  /** Held keys thrust the ship; releasing lets it glide to a stop. */
  press(direction: Direction, down: boolean) { this.keys[direction] = down; if (down) this.target = null; }

  private zone(h: number) { return { top: h * 0.7, bottom: h - 26, line: h * 0.68 }; }
  private cell(w: number) { const cw = Math.min(74, (w - 40) / 7.6); return { cw, rh: Math.max(34, cw * 0.62) }; }

  private setup(w: number, h: number) {
    this.rows = this.wave === 1 ? 2 : 3;
    this.invaders = [];
    for (let row = 0; row < this.rows; row += 1) for (let col = 0; col < 7; col += 1) this.invaders.push({ col, row, alive: true, dive: null, fade: 1 });
    const { cw } = this.cell(w);
    this.fx = (w - cw * 7) / 2;
    this.fy = 40;
    this.dir = 1;
    this.banner = 1.2;
    this.waveKills = 0;
    this.waveDrops = 0;
    this.diveIn = 3;
    if (!this.ready) { this.px = w / 2; this.py = this.zone(h).bottom - 8; }
  }

  private slot(invader: Invader, w: number) {
    const { cw, rh } = this.cell(w);
    return { x: this.fx + invader.col * cw + cw / 2, y: this.fy + invader.row * rh + rh / 2 };
  }

  private box(invader: Invader, w: number) {
    const { cw, rh } = this.cell(w);
    const at = invader.dive ?? this.slot(invader, w);
    return { x: at.x, y: at.y, hw: cw * 0.4, hh: rh * 0.32 };
  }

  private kill(invader: Invader, w: number, label = '✓') {
    const box = this.box(invader, w);
    invader.alive = false;
    invader.dive = null;
    this.destroyed += 1;
    this.waveKills += 1;
    const pollutant = pollutants[invader.col]!;
    burst(this.sparks, box.x, box.y, pollutant.color, 16);
    this.sfx.push('kill');
    this.floats.push({ text: `${pollutant.name} ${label}`, x: box.x, y: box.y, life: 0.7, color: pollutant.color });
    // A power-up now and then: at most one falling at a time, and at least one a wave.
    const owed = this.waveDrops === 0 && this.waveKills >= 5;
    if (!this.capsules.length && !this.power && (owed || Math.random() < 0.12)) {
      this.capsules.push({ x: box.x, y: box.y, kind: airPowerOrder[this.powerTurn % airPowerOrder.length]! });
      this.powerTurn += 1;
      this.waveDrops += 1;
    }
  }

  private hit(text: string) {
    if (this.hurt > 0) return;
    this.lives -= 1;
    this.flash = 0.35;
    this.hurt = 1.2;
    burst(this.sparks, this.px, this.py, '#B08DFF', 18);
    this.sfx.push('hit');
    this.floats.push({ text, x: this.px, y: this.py - 26, life: 0.9, color: '#FF8FB1' });
    if (this.lives <= 0) this.done = true;
  }

  step(dt: number, w: number, h: number) {
    this.dims = { w, h };
    if (!this.ready) { this.setup(w, h); this.ready = true; }
    if (this.done) return;
    this.flash = Math.max(0, this.flash - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    this.banner = Math.max(0, this.banner - dt);
    const { top, bottom, line } = this.zone(h);

    // Flight: held keys thrust with drag; a pointer target pulls through a damped spring.
    const k = this.keys;
    if (k.left || k.right || k.up || k.down) {
      this.vx += ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * 2900 * dt;
      this.vy += ((k.down ? 1 : 0) - (k.up ? 1 : 0)) * 2400 * dt;
      const drag = Math.exp(-dt * 6);
      this.vx *= drag;
      this.vy *= drag;
    } else if (this.target) {
      const tx = this.target.x * w;
      const ty = Math.min(bottom, Math.max(top, this.target.y * h));
      const stiffness = 90;
      const damping = 2 * Math.sqrt(stiffness) * 0.9;
      this.vx += ((tx - this.px) * stiffness - this.vx * damping) * dt;
      this.vy += ((ty - this.py) * stiffness - this.vy * damping) * dt;
    } else {
      const drag = Math.exp(-dt * 5);
      this.vx *= drag;
      this.vy *= drag;
    }
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 640) { this.vx *= 640 / speed; this.vy *= 640 / speed; }
    this.px += this.vx * dt;
    this.py += this.vy * dt;
    if (this.px < 18 || this.px > w - 18) { this.px = Math.min(w - 18, Math.max(18, this.px)); this.vx = 0; }
    if (this.py < top || this.py > bottom) { this.py = Math.min(bottom, Math.max(top, this.py)); this.vy = 0; }
    this.trail.push({ x: this.px + (Math.random() - 0.5) * 6, y: this.py + 14, life: 0.32, hue: Math.random() < 0.5 ? NEON.cyan : NEON.magenta });
    for (const puff of this.trail) { puff.y += 90 * dt; puff.life -= dt; }
    this.trail = this.trail.filter((puff) => puff.life > 0);

    if (this.power) { this.power.left -= dt; if (this.power.left <= 0) { this.floats.push({ text: `${powers[this.power.kind].label} off`, x: this.px, y: this.py - 30, life: 0.8, color: '#C9B8E8' }); this.power = null; } }

    // The ship fires on its own; Spread shot fans three bolts.
    this.fireIn -= dt;
    if (this.fireIn <= 0) {
      this.fireIn = 0.24;
      const fan = this.power?.kind === 'spread' ? [-150, 0, 150] : [0];
      for (const vx of fan) this.bullets.push({ x: this.px, y: this.py - 18, vx, vy: -600 });
    }
    for (const shot of this.bullets) { shot.x += shot.vx * dt; shot.y += shot.vy * dt; }

    // The formation sweeps side to side and sinks slowly toward the city.
    const alive = this.invaders.filter((invader) => invader.alive);
    const total = this.invaders.length;
    const sweep = (34 + this.wave * 14) * (1 + (1 - alive.length / total) * 1.5);
    this.fx += this.dir * sweep * dt;
    this.fy += (3.5 + this.wave * 1.5) * dt;
    const formation = alive.filter((invader) => !invader.dive).map((invader) => this.box(invader, w));
    if (formation.length) {
      const left = Math.min(...formation.map((box) => box.x - box.hw));
      const right = Math.max(...formation.map((box) => box.x + box.hw));
      if (right > w - 10 && this.dir > 0) { this.dir = -1; this.fy += 8; }
      if (left < 10 && this.dir < 0) { this.dir = 1; this.fy += 8; }
    }

    // From wave two, one invader at a time breaks off and swoops at the ship.
    if (this.wave >= 2) {
      this.diveIn -= dt;
      const resting = alive.filter((invader) => !invader.dive && invader.fade >= 1);
      if (this.diveIn <= 0 && resting.length > 2 && !alive.some((invader) => invader.dive)) {
        this.diveIn = 3.2 + Math.random() * 2.5 - this.wave * 0.4;
        const pick = resting[Math.floor(Math.random() * resting.length)]!;
        const from = this.slot(pick, w);
        pick.dive = { t: 0, x0: from.x, y0: from.y, x: from.x, y: from.y };
      }
    }
    for (const invader of alive) {
      invader.fade = Math.min(1, invader.fade + dt * 1.6);
      const dive = invader.dive;
      if (!dive) continue;
      dive.t += dt;
      dive.y = dive.y0 + dive.t * 165;
      dive.x = dive.x0 + Math.sin(dive.t * 2.6) * w * 0.14 + (this.px - dive.x0) * Math.min(0.7, dive.t * 0.35);
      if (dive.y > h + 30) { invader.dive = null; invader.fade = 0; } // back to its slot, fading in
    }

    // Bolts hit invaders
    const spent = new Set<Shot>();
    for (const invader of alive) {
      if (invader.fade < 0.6) continue;
      const box = this.box(invader, w);
      for (const shot of this.bullets) {
        if (spent.has(shot) || Math.abs(shot.x - box.x) > box.hw || Math.abs(shot.y - box.y) > box.hh) continue;
        spent.add(shot);
        this.kill(invader, w);
        break;
      }
    }
    this.bullets = this.bullets.filter((shot) => !spent.has(shot) && shot.y > -20 && shot.x > -20 && shot.x < w + 20);

    // Invaders that ram the ship
    for (const invader of this.invaders) {
      if (!invader.alive || invader.fade < 0.6) continue;
      const box = this.box(invader, w);
      if (Math.abs(box.x - this.px) > box.hw + 14 || Math.abs(box.y - this.py) > box.hh + 12) continue;
      if (this.power?.kind === 'shield') { this.kill(invader, w, 'shielded'); continue; }
      if (this.hurt <= 0) { this.hit('Rammed'); invader.dive = null; invader.fade = 0; }
    }

    // Smog bombs from the formation
    this.bombIn -= dt;
    const shooters = this.invaders.filter((invader) => invader.alive && invader.fade >= 1);
    if (this.bombIn <= 0 && shooters.length) {
      this.bombIn = (1.6 - this.wave * 0.22) * (0.6 + Math.random() * 0.8);
      const from = this.box(shooters[Math.floor(Math.random() * shooters.length)]!, w);
      this.bombs.push({ x: from.x, y: from.y + from.hh, vx: 0, vy: 135 + this.wave * 28 });
    }
    for (const bomb of this.bombs) bomb.y += bomb.vy * dt;
    const landed = this.bombs.find((bomb) => Math.abs(bomb.x - this.px) < 20 && Math.abs(bomb.y - this.py) < 16);
    if (landed) {
      this.bombs = this.bombs.filter((bomb) => bomb !== landed);
      if (this.power?.kind === 'shield') {
        burst(this.sparks, landed.x, landed.y, NEON.cyan, 10);
        this.sfx.push('shield');
      } else {
        this.hit('Smog hit');
      }
    }
    this.bombs = this.bombs.filter((bomb) => bomb.y < h + 10);

    // Power-up capsules fall; fly into one to take it.
    for (const capsule of this.capsules) capsule.y += 115 * dt;
    const caught = this.capsules.find((capsule) => Math.abs(capsule.x - this.px) < 26 && Math.abs(capsule.y - this.py) < 26);
    if (caught) {
      this.capsules = [];
      const info = powers[caught.kind];
      burst(this.sparks, this.px, this.py, info.color, 26);
      this.sfx.push('power');
      if (caught.kind === 'purifier') {
        this.pulse = { x: this.px, y: this.py, r: 0 };
        this.floats.push({ text: 'Purifier pulse', x: this.px, y: this.py - 32, life: 1, color: info.color });
      } else {
        this.power = { kind: caught.kind, left: POWER_SECONDS };
        this.floats.push({ text: `${info.label} · ${POWER_SECONDS}s`, x: this.px, y: this.py - 32, life: 1, color: info.color });
      }
    }
    this.capsules = this.capsules.filter((capsule) => capsule.y < h + 20);

    // Purifier: an expanding ring that clears smog and invaders it reaches.
    if (this.pulse) {
      this.pulse.r += 560 * dt;
      const { x, y, r } = this.pulse;
      for (const invader of this.invaders) {
        if (!invader.alive) continue;
        const box = this.box(invader, w);
        if (Math.hypot(box.x - x, box.y - y) < r) this.kill(invader, w, 'purified');
      }
      this.bombs = this.bombs.filter((bomb) => Math.hypot(bomb.x - x, bomb.y - y) > r);
      if (r > Math.max(w, h) * 0.55) this.pulse = null;
    }

    // AQI: more invaders, and lower ones, mean worse air.
    const remaining = this.invaders.filter((invader) => invader.alive);
    const lowest = remaining.length ? Math.max(...remaining.map((invader) => this.slot(invader, w).y)) : 0;
    const depth = Math.max(0, Math.min(1, (lowest - 60) / (line - 60)));
    this.aqi = Math.round(Math.min(500, 25 + (remaining.length / total) * 190 + depth * 290));
    if (remaining.length && lowest > line) { this.aqi = 500; this.done = true; }
    if (!remaining.length) {
      this.floats.push({ text: `Wave ${this.wave} cleared`, x: w / 2, y: h * 0.45, life: 1.1, color: NEON.cyan });
      if (this.wave < WAVES) this.sfx.push('wave');
      this.wave += 1;
      this.bombs = [];
      if (this.wave > WAVES) { this.wave = WAVES; this.done = true; this.won = true; this.aqi = 25; }
      else this.setup(w, h);
    }
    ({ sparks: this.sparks, floats: this.floats } = tickEffects(this.sparks, this.floats, dt));
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    this.dims = { w, h };
    if (!this.ready) { this.setup(w, h); this.ready = true; }
    const band = bandFor(this.aqi);
    const base = h - 6;
    const sky = synthSky(ctx, w, base, t);
    synthSun(ctx, w / 2, h * 0.7, Math.min(w * 0.13, h * 0.2), sky);
    // Haze in the band's colour: the worse the air, the thicker it gets.
    const haze = ctx.createLinearGradient(0, h * 0.35, 0, h);
    haze.addColorStop(0, 'rgba(0,0,0,0)');
    haze.addColorStop(1, band.color);
    ctx.globalAlpha = Math.min(0.5, this.aqi / 800);
    ctx.fillStyle = haze;
    ctx.fillRect(0, h * 0.35, w, h * 0.65);
    ctx.globalAlpha = 1;
    skyline(ctx, w, base, h * 0.62);
    ctx.fillStyle = '#07010F';
    ctx.fillRect(0, base, w, h - base);
    ctx.save();
    ctx.shadowColor = NEON.magenta;
    ctx.shadowBlur = 8;
    ctx.fillStyle = NEON.magenta;
    ctx.fillRect(0, base, w, 1.5);
    ctx.restore();

    // The city limit: if the formation sinks past it, the air is lost.
    const { line } = this.zone(h);
    ctx.save();
    ctx.strokeStyle = 'rgba(62, 246, 255, 0.4)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, line);
    ctx.lineTo(w, line);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(62, 246, 255, 0.55)';
    ctx.font = `600 9px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText('CITY LIMIT', 8, line - 5);
    ctx.restore();

    // Invaders: little neon smog creatures carrying their pollutant's name.
    for (const invader of this.invaders) {
      if (!invader.alive) continue;
      const box = this.box(invader, w);
      const pollutant = pollutants[invader.col]!;
      const wobble = invader.dive ? 0 : Math.sin(t * 6 + invader.col + invader.row * 2) * 2;
      const tilt = invader.dive ? Math.cos(invader.dive.t * 2.6) * 0.35 : 0;
      ctx.save();
      ctx.translate(box.x, box.y + wobble);
      ctx.rotate(tilt);
      ctx.globalAlpha = invader.fade;
      ctx.shadowColor = pollutant.color;
      ctx.shadowBlur = invader.dive ? 20 : 12;
      ctx.fillStyle = pollutant.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, box.hw, box.hh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = pollutant.color;
      ctx.lineWidth = 2;
      for (const side of [-0.6, -0.2, 0.2, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(box.hw * side, box.hh * 0.8);
        ctx.lineTo(box.hw * side + Math.sin(t * 8 + side * 4) * 3, box.hh * 1.45);
        ctx.stroke();
      }
      ctx.fillStyle = '#0A0414';
      ctx.font = `700 ${Math.max(9, Math.round(box.hh * 0.62))}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pollutant.name, 0, 1);
      ctx.restore();
    }

    // Bolts, bombs and capsules
    ctx.save();
    ctx.shadowColor = this.power?.kind === 'spread' ? NEON.gold : NEON.cyan;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.power?.kind === 'spread' ? '#FFF3C4' : '#E6FDFF';
    for (const shot of this.bullets) {
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(Math.atan2(shot.vx, -shot.vy));
      ctx.fillRect(-1.5, -9, 3, 12);
      ctx.restore();
    }
    ctx.restore();
    for (const bomb of this.bombs) {
      ctx.fillStyle = 'rgba(150, 120, 170, 0.92)';
      ctx.beginPath();
      ctx.arc(bomb.x, bomb.y, 5, 0, Math.PI * 2);
      ctx.arc(bomb.x + 4, bomb.y - 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const capsule of this.capsules) drawToken(ctx, capsule.x, capsule.y, 13, capsule.kind, t);
    if (this.pulse) {
      ctx.save();
      ctx.shadowColor = NEON.magenta;
      ctx.shadowBlur = 24;
      ctx.strokeStyle = `rgba(255, 43, 214, ${Math.max(0, 1 - this.pulse.r / (Math.max(w, h) * 0.55))})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.pulse.x, this.pulse.y, this.pulse.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Engine trail
    for (const puff of this.trail) {
      ctx.globalAlpha = Math.max(0, puff.life * 2.4);
      ctx.fillStyle = puff.hue;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, 1.5 + puff.life * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The ship: a neon delta that banks into its turns.
    ctx.save();
    ctx.translate(this.px, this.py);
    ctx.rotate(Math.max(-1, Math.min(1, this.vx / 520)) * 0.42);
    if (this.hurt > 0 && Math.floor(t * 16) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.shadowColor = NEON.magenta;
    ctx.shadowBlur = 18;
    const hull = ctx.createLinearGradient(0, -20, 0, 12);
    hull.addColorStop(0, '#F5E9FF');
    hull.addColorStop(1, '#6B2A8C');
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, -21);
    ctx.lineTo(21, 10);
    ctx.lineTo(7, 5);
    ctx.lineTo(0, 12);
    ctx.lineTo(-7, 5);
    ctx.lineTo(-21, 10);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = NEON.magenta;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowColor = NEON.cyan;
    ctx.shadowBlur = 12;
    ctx.fillStyle = NEON.cyan;
    ctx.beginPath();
    ctx.arc(0, -3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 79, 154, ${0.55 + Math.sin(t * 30) * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(-4, 12);
    ctx.lineTo(0, 22 + Math.sin(t * 40) * 3 + Math.max(0, -this.vy / 80));
    ctx.lineTo(4, 12);
    ctx.fill();
    ctx.restore();
    if (this.power?.kind === 'shield') {
      ctx.save();
      ctx.shadowColor = NEON.cyan;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = 'rgba(62, 246, 255, 0.85)';
      ctx.fillStyle = 'rgba(62, 246, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 5]);
      ctx.lineDashOffset = -t * 40;
      ctx.beginPath();
      ctx.arc(this.px, this.py - 2, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    drawEffects(ctx, this.sparks, this.floats);
    if (this.banner > 0 && !this.done) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.banner * 2);
      ctx.shadowColor = NEON.magenta;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#FFE3FA';
      ctx.font = `700 15px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${this.wave} OF ${WAVES}${this.wave >= 2 ? ' · DIVERS INCOMING' : ''}`, w / 2, h * 0.5);
      ctx.restore();
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 62, 108, ${this.flash * 0.5})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  hud(): Hud {
    return {
      wave: this.wave,
      destroyed: this.destroyed,
      aqi: this.aqi,
      lives: this.lives,
      power: this.power?.kind ?? '',
      powerLeft: this.power ? Math.ceil(this.power.left * 10) / 10 : 0,
    };
  }
}
