/**
 * A live air-quality reading for Mumbai, from Open-Meteo's free air-quality API (CAMS model data,
 * CC BY 4.0). The AQI is estimated with CPCB's sub-index breakpoints: each pollutant's concentration
 * maps linearly onto its band, and the AQI is the highest sub-index. The official CPCB AQI uses
 * 24-hour (8-hour for some gases) station averages, so this is an indicative, model-based figure.
 */
export const MUMBAI = { latitude: 19.076, longitude: 72.8777 } as const;

export const airQualitySource = 'https://open-meteo.com/en/docs/air-quality-api';

const endpoint = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${MUMBAI.latitude}&longitude=${MUMBAI.longitude}&current=pm2_5,pm10,nitrogen_dioxide&timezone=Asia%2FKolkata`;

// AQI band edges shared by every pollutant, and each pollutant's concentration breakpoints (µg/m³).
const aqiRanges: Array<[number, number]> = [[0, 50], [51, 100], [101, 200], [201, 300], [301, 400], [401, 500]];
const breakpoints = {
  pm2_5: [[0, 30], [31, 60], [61, 90], [91, 120], [121, 250], [251, 380]],
  pm10: [[0, 50], [51, 100], [101, 250], [251, 350], [351, 430], [431, 510]],
  nitrogen_dioxide: [[0, 40], [41, 80], [81, 180], [181, 280], [281, 400], [401, 500]],
} as const;
export type Pollutant = keyof typeof breakpoints;

export const pollutantLabel: Record<Pollutant, string> = { pm2_5: 'PM2.5', pm10: 'PM10', nitrogen_dioxide: 'NO₂' };

export function subIndex(pollutant: Pollutant, value: number): number {
  const table = breakpoints[pollutant];
  for (let index = 0; index < table.length; index += 1) {
    const [low, high] = table[index];
    // Values between one band's top and the next band's bottom (e.g. 30.4) belong to the lower band.
    if (value <= high || (index < table.length - 1 && value < table[index + 1][0])) {
      const [aqiLow, aqiHigh] = aqiRanges[index];
      const clamped = Math.max(low, Math.min(high, value));
      return Math.round(aqiLow + ((clamped - low) * (aqiHigh - aqiLow)) / (high - low));
    }
  }
  return 500;
}

/** The band index (0 Good … 5 Severe) for an AQI value. */
export function bandIndex(aqi: number): number {
  const index = aqiRanges.findIndex(([, high]) => aqi <= high);
  return index === -1 ? aqiRanges.length - 1 : index;
}

export type AirReading = {
  aqi: number;
  band: number;
  dominant: Pollutant;
  values: Record<Pollutant, number>;
  time: string; // local Mumbai time of the model hour, "HH:MM"
};

export async function fetchMumbaiAir(signal?: AbortSignal): Promise<AirReading> {
  const response = await fetch(endpoint, { signal, cache: 'no-store', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`Air-quality feed answered ${response.status}`);
  const data = (await response.json()) as { current?: Partial<Record<Pollutant | 'time', number | string>> };
  const current = data.current ?? {};
  const values = {} as Record<Pollutant, number>;
  for (const pollutant of Object.keys(breakpoints) as Pollutant[]) {
    const value = Number(current[pollutant]);
    if (!Number.isFinite(value)) throw new Error(`No ${pollutant} reading`);
    values[pollutant] = value;
  }
  const scored = (Object.keys(values) as Pollutant[]).map((pollutant) => ({ pollutant, index: subIndex(pollutant, values[pollutant]) }));
  const top = scored.reduce((best, entry) => (entry.index > best.index ? entry : best));
  const time = typeof current.time === 'string' ? current.time.slice(11, 16) : '';
  return { aqi: top.index, band: bandIndex(top.index), dominant: top.pollutant, values, time };
}

// --- Five metros: the cities in AeroSense's dataset -------------------------------------------

export const metroCities = [
  { id: 'delhi', name: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { id: 'mumbai', name: 'Mumbai', latitude: MUMBAI.latitude, longitude: MUMBAI.longitude },
  { id: 'kolkata', name: 'Kolkata', latitude: 22.5726, longitude: 88.3639 },
  { id: 'chennai', name: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
  { id: 'bengaluru', name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 },
] as const;

export type CityPoint = { time: string; aqi: number; dominant: Pollutant; values: Record<Pollutant, number> };
export type CityAir = { id: string; name: string; points: CityPoint[]; now: number };

const metroEndpoint = () => {
  const lat = metroCities.map((city) => city.latitude).join(',');
  const lon = metroCities.map((city) => city.longitude).join(',');
  return `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,nitrogen_dioxide&past_days=1&forecast_days=2&timezone=Asia%2FKolkata`;
};

/** The current hour in India, as Open-Meteo writes it: "2026-11-19T14:00". */
function istHour(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00`;
}

/**
 * Yesterday, today and tomorrow, hourly, for all five cities in one request. Each hour's AQI uses
 * CPCB breakpoints on the trailing 24-hour mean of each pollutant, the averaging CPCB uses for
 * these three. Returns today 00:00 to tomorrow 23:00 (48 hours); `now` indexes the current hour.
 */
export async function fetchMetroAir(signal?: AbortSignal): Promise<CityAir[]> {
  const response = await fetch(metroEndpoint(), { signal, cache: 'no-store', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`Air-quality feed answered ${response.status}`);
  const body = (await response.json()) as unknown;
  const list = (Array.isArray(body) ? body : [body]) as Array<{ hourly?: Partial<Record<Pollutant | 'time', Array<number | string | null>>> }>;
  if (list.length !== metroCities.length) throw new Error('Unexpected air-quality response');
  const current = istHour(new Date());
  const keys = Object.keys(breakpoints) as Pollutant[];

  return list.map((entry, cityIndex) => {
    const hourly = entry.hourly ?? {};
    const times = (hourly.time ?? []) as string[];
    const points: CityPoint[] = [];
    for (let index = 24; index < times.length; index += 1) {
      const values = {} as Record<Pollutant, number>;
      let complete = true;
      for (const key of keys) {
        const window = ((hourly[key] ?? []) as Array<number | null>).slice(index - 23, index + 1).filter((value): value is number => typeof value === 'number');
        if (window.length < 16) { complete = false; break; }
        values[key] = window.reduce((sum, value) => sum + value, 0) / window.length;
      }
      if (!complete) continue;
      const scored = keys.map((key) => ({ key, index: subIndex(key, values[key]) }));
      const top = scored.reduce((best, item) => (item.index > best.index ? item : best));
      points.push({ time: times[index]!, aqi: top.index, dominant: top.key, values });
    }
    if (!points.length) throw new Error('No air-quality hours');
    const exact = points.findIndex((point) => point.time === current);
    const now = exact >= 0 ? exact : Math.max(0, points.filter((point) => point.time < current).length - 1);
    const city = metroCities[cityIndex]!;
    return { id: city.id, name: city.name, points, now };
  });
}
