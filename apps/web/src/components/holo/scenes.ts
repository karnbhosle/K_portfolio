/*
 * Wireframe scenes for the hologram projector. Each scene is pure geometry: given the time,
 * a click "energy" (1 right after a click, easing to 0) and a focus index, it returns polylines
 * and glowing dots in a unit-sized space. The projector rotates, projects and draws them.
 * Space: x right, y up, z away from the viewer.
 */

export type V3 = [number, number, number];
export type Stroke = { pts: V3[]; color: string; alpha?: number; width?: number };
export type Dot = { p: V3; color: string; size: number; alpha?: number };
export type Frame = { strokes: Stroke[]; dots: Dot[] };

export const CYAN = '#61E8FF';
export const BLUE = '#218CFF';
export const COPPER = '#C98A45';
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

// --- The full-stack: interface, API and AI core as three stacked platters ------------------------

export const stackLayers = [
  { name: 'Interface', detail: 'React.js, Next.js, Tailwind CSS', color: CYAN },
  { name: 'API', detail: 'Node.js, Express.js, FastAPI, Flask', color: WHITE },
  { name: 'AI core', detail: 'XGBoost, LSTM, Scikit-learn', color: COPPER },
] as const;

export function stackScene(t: number, energy: number, focus: number): Frame {
  const strokes: Stroke[] = [];
  const dots: Dot[] = [];
  const gap = 0.62 + energy * 0.25;
  const half = 0.82;
  const turn = t * 0.25;
  const at = (x: number, y: number, z: number): V3 => spinY([x, y, z], turn);
  const levels = stackLayers.map((layer, index) => {
    const lift = index === focus ? 0.12 : 0;
    return { ...layer, y: (1 - index) * gap + lift, active: index === focus };
  });

  levels.forEach((level, index) => {
    const { y, color, active } = level;
    const alpha = active ? 1 : 0.62;
    const c = half * 0.12;
    // A chamfered square platter, with a thinner underside to give it depth.
    const outline = (k: number, dy: number): V3[] => {
      const h = half * k;
      const ch = c * k;
      return [[-h + ch, -h], [h - ch, -h], [h, -h + ch], [h, h - ch], [h - ch, h], [-h + ch, h], [-h, h - ch], [-h, -h + ch], [-h + ch, -h]].map(([x, z]) => at(x!, y + dy, z!));
    };
    strokes.push({ pts: outline(1, 0), color, width: active ? 1.6 : 1.1, alpha });
    strokes.push({ pts: outline(0.94, -0.06), color, width: 0.8, alpha: alpha * 0.5 });

    if (index === 0) {
      // Interface: two windows and a nav bar.
      const rect = (x0: number, z0: number, x1: number, z1: number) => [at(x0, y, z0), at(x1, y, z0), at(x1, y, z1), at(x0, y, z1), at(x0, y, z0)];
      strokes.push({ pts: rect(-0.6, -0.6, 0.6, -0.42), color, alpha: alpha * 0.8 });
      strokes.push({ pts: rect(-0.6, -0.3, -0.05, 0.6), color, alpha: alpha * 0.8 });
      strokes.push({ pts: rect(0.05, -0.3, 0.6, 0.12), color, alpha: alpha * 0.8 });
      for (let line = 0; line < 3; line += 1) strokes.push({ pts: [at(0.05, y, 0.24 + line * 0.13), at(0.6 - line * 0.12, y, 0.24 + line * 0.13)], color, alpha: alpha * 0.6 });
    } else if (index === 1) {
      // API: routes as a ring of endpoints around a gateway.
      strokes.push({ pts: circle(0.18, 24, (x, z) => at(x, y, z)), color, alpha });
      for (let route = 0; route < 6; route += 1) {
        const angle = (route / 6) * TAU + t * 0.4;
        const end = at(Math.cos(angle) * 0.6, y, Math.sin(angle) * 0.6);
        strokes.push({ pts: [at(Math.cos(angle) * 0.18, y, Math.sin(angle) * 0.18), end], color, alpha: alpha * 0.7 });
        dots.push({ p: end, color: route % 2 ? BLUE : CYAN, size: 3, alpha });
      }
    } else {
      // AI core: a small neural net, three columns of nodes, fully connected.
      const columns = [[-0.45, [-0.4, 0, 0.4]], [0, [-0.55, -0.18, 0.18, 0.55]], [0.45, [-0.25, 0.25]]] as const;
      for (let column = 0; column < columns.length - 1; column += 1) {
        const [xa, as] = columns[column]!;
        const [xb, bs] = columns[column + 1]!;
        for (const za of as) for (const zb of bs) strokes.push({ pts: [at(xa, y, za), at(xb, y, zb)], color, alpha: alpha * 0.35, width: 0.8 });
      }
      columns.forEach(([x, zs], column) => zs.forEach((z, node) => {
        const firing = (Math.sin(t * 3 + column * 1.7 + node) + 1) / 2;
        dots.push({ p: at(x, y, z), color: firing > 0.7 ? '#FFFFFF' : COPPER, size: 2.6 + firing * 2.2, alpha });
      }));
    }
  });

  // Pillars at the corners, with data packets riding between the layers.
  const corners: Array<[number, number]> = [[-half, -half], [half, -half], [half, half], [-half, half]];
  const top = levels[0]!.y;
  const bottom = levels[2]!.y;
  corners.forEach(([x, z], index) => {
    strokes.push({ pts: [at(x, top, z), at(x, bottom, z)], color: BLUE, alpha: 0.35, width: 0.8 });
    for (let packet = 0; packet < 2; packet += 1) {
      const phase = (t * (0.35 + index * 0.05) + packet * 0.5 + index * 0.25) % 1;
      const goingDown = index % 2 === 0;
      const y = goingDown ? top - (top - bottom) * phase : bottom + (top - bottom) * phase;
      dots.push({ p: at(x, y, z), color: goingDown ? CYAN : COPPER, size: 3.2 });
    }
  });
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

export function globeScene(t: number, energy: number): Frame {
  const strokes: Stroke[] = [];
  const dots: Dot[] = [];
  const R = 0.92;

  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: V3[] = [];
    for (let lon = -180; lon <= 180; lon += 6) pts.push(geo(lat, lon + MUMBAI.lon, R));
    strokes.push({ pts, color: lat === 0 ? CYAN : BLUE, alpha: lat === 0 ? 0.7 : 0.45, width: 0.9 });
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const pts: V3[] = [];
    for (let lat = -90; lat <= 90; lat += 6) pts.push(geo(lat, lon, R));
    strokes.push({ pts, color: BLUE, alpha: 0.4, width: 0.9 });
  }

  const home = geo(MUMBAI.lat, MUMBAI.lon, R);
  dots.push({ p: home, color: COPPER, size: 6 + Math.sin(t * 4) * 1.5 + energy * 6 });
  strokes.push({ pts: [home, scale(home, 1.18)], color: COPPER, width: 1.1 });
  // A ping ring spreading out from Mumbai.
  const ring = ((t * 0.6) % 1) * 0.35 + energy * 0.25;
  const [hx, hy, hz] = home;
  const tangentA = (() => { const v: V3 = [hz, 0, -hx]; const l = Math.hypot(...v) || 1; return scale(v, 1 / l); })();
  const tangentB: V3 = [hy * tangentA[2] - hz * tangentA[1], hz * tangentA[0] - hx * tangentA[2], hx * tangentA[1] - hy * tangentA[0]];
  const ringPts = circle(ring, 32, (a, b) => {
    const p: V3 = [hx + tangentA[0] * a + tangentB[0] * b, hy + tangentA[1] * a + tangentB[1] * b, hz + tangentA[2] * a + tangentB[2] * b];
    return scale(p, R / (Math.hypot(...p) || 1));
  });
  strokes.push({ pts: ringPts, color: COPPER, alpha: Math.max(0, 0.9 - ring * 2.2) });

  destinations.forEach((place, index) => {
    const cycle = 3.2;
    const local = (t + index * 0.55 + energy * 1.2) % cycle;
    const progress = Math.min(1, local / 1.4);
    const target = geo(place.lat, place.lon, R);
    const fade = local > 2.4 ? Math.max(0, 1 - (local - 2.4) / 0.8) : 1;
    const pts = arc(home, target, R, progress);
    strokes.push({ pts, color: index % 2 ? CYAN : COPPER, alpha: 0.75 * fade, width: 0.9 });
    dots.push({ p: pts[pts.length - 1]!, color: CYAN, size: 3, alpha: fade });
    dots.push({ p: target, color: WHITE, size: 2.2, alpha: 0.6 });
  });

  // A relay satellite on an inclined orbit.
  const orbitR = 1.32;
  strokes.push({ pts: circle(orbitR, 80, (x, y) => tilt([x, 0, y], 0.5, 0.25)), color: WHITE, alpha: 0.25, width: 0.8 });
  const angle = t * 0.5;
  const sat = tilt([Math.cos(angle) * orbitR, 0, Math.sin(angle) * orbitR], 0.5, 0.25);
  dots.push({ p: sat, color: '#FFFFFF', size: 4.2 });
  const panel = (k: number): V3 => [sat[0] + k * 0.09, sat[1], sat[2]];
  strokes.push({ pts: [panel(-1.4), panel(1.4)], color: CYAN, width: 2 });
  return { strokes, dots };
}

export const scenes = { core: coreScene, stack: stackScene, globe: globeScene } as const;
export type SceneName = keyof typeof scenes;
