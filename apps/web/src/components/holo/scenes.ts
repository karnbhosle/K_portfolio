/*
 * Wireframe scenes for the hologram projector. Each scene is pure geometry: given the time,
 * and a click "energy" (1 right after a click, easing to 0), it returns polylines
 * and glowing dots in a unit-sized space. The projector rotates, projects and draws them.
 * Space: x right, y up, z away from the viewer.
 */

import { coastlines } from './coastlines';

export type V3 = [number, number, number];
/** `cull` hides the parts on the far side of a sphere, so a map reads like a solid globe. */
export type Stroke = { pts: V3[]; color: string; alpha?: number; width?: number; cull?: boolean };
export type Dot = { p: V3; color: string; size: number; alpha?: number; cull?: boolean };
export type Tag = { p: V3; text: string; color: string };
export type Frame = { strokes: Stroke[]; dots: Dot[]; tags?: Tag[] };

export const CYAN = '#61E8FF';
export const BLUE = '#218CFF';
export const COPPER = '#C98A45';
export const GOLD = '#FFC940';
export const WHITE = '#E8F0F7';

const TAU = Math.PI * 2;

function circle(radius: number, segments: number, map: (x: number, y: number) => V3, from = 0, to = TAU): V3[] {
  const pts: V3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = from + ((to - from) * index) / segments;
    pts.push(map(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  return pts;
}

/** Rotate a point around the x axis, then the z axis: tilts an orbit out of the flat plane. */
function tilt([x, y, z]: V3, ax: number, az: number): V3 {
  const y1 = y * Math.cos(ax) - z * Math.sin(ax);
  const z1 = y * Math.sin(ax) + z * Math.cos(ax);
  return [x * Math.cos(az) - y1 * Math.sin(az), x * Math.sin(az) + y1 * Math.cos(az), z1];
}

const spinY = ([x, y, z]: V3, angle: number): V3 => [x * Math.cos(angle) + z * Math.sin(angle), y, -x * Math.sin(angle) + z * Math.cos(angle)];
const scale = ([x, y, z]: V3, k: number): V3 => [x * k, y * k, z * k];

// --- The arc core: an icosahedral reactor inside three orbits ---------------------------------

const PHI = (1 + Math.sqrt(5)) / 2;
const icoVerts: V3[] = (
  [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]] as V3[]
).map((v) => scale(v, 1 / Math.hypot(1, PHI)));
const icoEdges: Array<[number, number]> = [];
for (let a = 0; a < icoVerts.length; a += 1) {
  for (let b = a + 1; b < icoVerts.length; b += 1) {
    const [ax, ay, az] = icoVerts[a]!;
    const [bx, by, bz] = icoVerts[b]!;
    if (Math.abs(Math.hypot(ax - bx, ay - by, az - bz) - 1.0515) < 0.01) icoEdges.push([a, b]);
  }
}
const octVerts: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const octEdges: Array<[number, number]> = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];

const orbits = [
  { r: 1.02, ax: 1.2, az: 0.35, speed: 0.9, color: CYAN },
  { r: 1.16, ax: 1.75, az: -0.6, speed: -0.65, color: WHITE },
  { r: 0.9, ax: 0.35, az: 1.1, speed: 1.2, color: BLUE },
];

export function coreScene(t: number, energy: number): Frame {
  const strokes: Stroke[] = [];
  const dots: Dot[] = [];
  const surge = 1 + energy * 0.35;

  const shell = icoVerts.map((v) => spinY(tilt(v, t * 0.21, t * 0.13), t * 0.3)).map((v) => scale(v, 0.56 * (1 + energy * 0.12)));
  for (const [a, b] of icoEdges) strokes.push({ pts: [shell[a]!, shell[b]!], color: CYAN, width: 1.3 });
  for (const v of shell) dots.push({ p: v, color: WHITE, size: 2.2, alpha: 0.8 });

  const inner = octVerts.map((v) => spinY(tilt(v, -t * 0.7, t * 0.4), -t * 0.9)).map((v) => scale(v, 0.27));
  for (const [a, b] of octEdges) strokes.push({ pts: [inner[a]!, inner[b]!], color: WHITE, width: 1.1, alpha: 0.9 });
  dots.push({ p: [0, 0, 0], color: '#FFFFFF', size: 9 + energy * 10, alpha: 0.95 });

  orbits.forEach((orbit, index) => {
    const radius = orbit.r * surge;
    strokes.push({ pts: circle(radius, 72, (x, y) => tilt([x, 0, y], orbit.ax, orbit.az)), color: orbit.color, width: 1, alpha: 0.55 });
    for (let electron = 0; electron < 2; electron += 1) {
      const angle = t * orbit.speed * (1 + energy * 2) + electron * Math.PI + index;
      dots.push({ p: tilt([Math.cos(angle) * radius, 0, Math.sin(angle) * radius], orbit.ax, orbit.az), color: orbit.color, size: 3.6 });
    }
  });

  // The coil ring: ten boxes on a flat outer ring, alternating cyan and copper like the 2D reactor.
  const ring = 1.42 + energy * 0.15;
  strokes.push({ pts: circle(ring, 96, (x, y) => [x, -0.05, y]), color: BLUE, width: 0.9, alpha: 0.45 });
  for (let coil = 0; coil < 10; coil += 1) {
    const angle = (coil / 10) * TAU + t * 0.18;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const box = (u: number, v: number, h: number): V3 => [c * (ring + u) - s * v, h, s * (ring + u) + c * v];
    const [w, d, h] = [0.07, 0.11, 0.07];
    const color = coil % 2 ? COPPER : CYAN;
    strokes.push({ pts: [box(-w, -d, h), box(w, -d, h), box(w, d, h), box(-w, d, h), box(-w, -d, h)], color });
    strokes.push({ pts: [box(-w, -d, -h), box(w, -d, -h), box(w, d, -h), box(-w, d, -h), box(-w, -d, -h)], color, alpha: 0.6 });
    for (const [u, v] of [[-w, -d], [w, -d], [w, d], [-w, d]] as const) strokes.push({ pts: [box(u, v, h), box(u, v, -h)], color, alpha: 0.6 });
  }
  return { strokes, dots };
}

// --- The uplink globe: Mumbai, and signals going out to the world --------------------------------

const MUMBAI = { lat: 19.07, lon: 72.88 };
const destinations = [
  { lat: 51.5, lon: -0.12 },   // London
  { lat: 37.77, lon: -122.42 }, // San Francisco
  { lat: 1.35, lon: 103.82 },  // Singapore
  { lat: 52.52, lon: 13.4 },   // Berlin
  { lat: 25.2, lon: 55.27 },   // Dubai
  { lat: -33.87, lon: 151.21 }, // Sydney
];

/** Latitude and longitude on a sphere, turned so Mumbai faces the viewer when the globe is unrotated. */
function geo(lat: number, lon: number, r = 1): V3 {
  const phi = (lat * Math.PI) / 180;
  const lambda = ((lon - MUMBAI.lon) * Math.PI) / 180;
  return [Math.cos(phi) * Math.sin(lambda) * r, Math.sin(phi) * r, -Math.cos(phi) * Math.cos(lambda) * r];
}

/** A great-circle arc lifted off the surface, drawn up to `progress` of its length. */
function arc(from: V3, to: V3, radius: number, progress: number, segments = 40): V3[] {
  const pts: V3[] = [];
  const end = Math.max(1, Math.round(segments * progress));
  for (let index = 0; index <= end; index += 1) {
    const k = index / segments;
    const p: V3 = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k];
    const length = Math.hypot(...p) || 1;
    const lift = radius * (1 + Math.sin(k * Math.PI) * 0.42);
    pts.push(scale(p, lift / length));
  }
  return pts;
}

const GLOBE_R = 0.92;
// The continents, placed on the sphere once: they never change shape, only the view turns.
const landOutlines: V3[][] = coastlines.map((line) => {
  const pts: V3[] = [];
  for (let index = 0; index < line.length; index += 2) pts.push(geo(line[index + 1]! / 10, line[index]! / 10, GLOBE_R * 1.004));
  return pts;
});

export function globeScene(t: number, energy: number): Frame {
  const strokes: Stroke[] = [];
  const dots: Dot[] = [];
  const R = GLOBE_R;

  // A faint graticule, so the far side still reads as a sphere.
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: V3[] = [];
    for (let lon = -180; lon <= 180; lon += 6) pts.push(geo(lat, lon + MUMBAI.lon, R));
    strokes.push({ pts, color: BLUE, alpha: lat === 0 ? 0.4 : 0.22, width: 0.7 });
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const pts: V3[] = [];
    for (let lat = -90; lat <= 90; lat += 6) pts.push(geo(lat, lon, R));
    strokes.push({ pts, color: BLUE, alpha: 0.2, width: 0.7 });
  }
  // The world map: Natural Earth coastlines, near side only.
  for (const pts of landOutlines) strokes.push({ pts, color: CYAN, alpha: 0.95, width: 1.15, cull: true });

  // Mumbai: a gold pin standing on the coast, with its name.
  const home = geo(MUMBAI.lat, MUMBAI.lon, R);
  const head = scale(home, 1.2);
  strokes.push({ pts: [home, head], color: GOLD, width: 1.6 });
  dots.push({ p: home, color: GOLD, size: 3.2, cull: true });
  dots.push({ p: head, color: GOLD, size: 7 + Math.sin(t * 4) * 1.2 + energy * 6 });
  const tags: Tag[] = [{ p: head, text: 'Mumbai', color: GOLD }];
  // A ping ring spreading out from Mumbai.
  const ring = ((t * 0.6) % 1) * 0.35 + energy * 0.25;
  const [hx, hy, hz] = home;
  const tangentA = (() => { const v: V3 = [hz, 0, -hx]; const l = Math.hypot(...v) || 1; return scale(v, 1 / l); })();
  const tangentB: V3 = [hy * tangentA[2] - hz * tangentA[1], hz * tangentA[0] - hx * tangentA[2], hx * tangentA[1] - hy * tangentA[0]];
  const ringPts = circle(ring, 32, (a, b) => {
    const p: V3 = [hx + tangentA[0] * a + tangentB[0] * b, hy + tangentA[1] * a + tangentB[1] * b, hz + tangentA[2] * a + tangentB[2] * b];
    return scale(p, R / (Math.hypot(...p) || 1));
  });
  strokes.push({ pts: ringPts, color: GOLD, alpha: Math.max(0, 0.9 - ring * 2.2), cull: true });

  destinations.forEach((place, index) => {
    const cycle = 3.2;
    const local = (t + index * 0.55 + energy * 1.2) % cycle;
    const progress = Math.min(1, local / 1.4);
    const target = geo(place.lat, place.lon, R);
    const fade = local > 2.4 ? Math.max(0, 1 - (local - 2.4) / 0.8) : 1;
    const pts = arc(home, target, R, progress);
    strokes.push({ pts, color: index % 2 ? CYAN : WHITE, alpha: 0.6 * fade, width: 0.8 });
    dots.push({ p: pts[pts.length - 1]!, color: CYAN, size: 3, alpha: fade });
    dots.push({ p: target, color: WHITE, size: 2.2, alpha: 0.6, cull: true });
  });

  // A relay satellite on an inclined orbit.
  const orbitR = 1.32;
  strokes.push({ pts: circle(orbitR, 80, (x, y) => tilt([x, 0, y], 0.5, 0.25)), color: WHITE, alpha: 0.25, width: 0.8 });
  const angle = t * 0.5;
  const sat = tilt([Math.cos(angle) * orbitR, 0, Math.sin(angle) * orbitR], 0.5, 0.25);
  dots.push({ p: sat, color: '#FFFFFF', size: 4.2 });
  const panel = (k: number): V3 => [sat[0] + k * 0.09, sat[1], sat[2]];
  strokes.push({ pts: [panel(-1.4), panel(1.4)], color: CYAN, width: 2 });
  return { strokes, dots, tags };
}

export const scenes = { core: coreScene, globe: globeScene } as const;
export type SceneName = keyof typeof scenes;
