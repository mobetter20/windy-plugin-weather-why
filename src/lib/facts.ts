// Open-Meteo data fetcher. Ports build_facts() from pipeline.py to TypeScript,
// keeping the same JSON schema so detection rules and content templates port.

import { compass8, haversineKm, initialBearingDeg } from './geo';
import type {
    AirQuality,
    Facts,
    ForecastTrend,
    Geo,
    Instability,
    Marine,
    PastTrends,
    PressureFeature,
    SurfaceFacts,
    SynopticFacts,
    UpperAir,
} from './types';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

function clampLat(lat: number): number {
    return Math.max(-90, Math.min(90, lat));
}

function wrapLon(lon: number): number {
    return ((lon + 180) % 360 + 360) % 360 - 180;
}

// Regional MSL pressure grid for synoptic feature detection. ±4.5° box,
// 1.5° spacing → 7×7 = 49 points (~165 km cells, fine for synoptic features).
const GRID_RADIUS_DEG = 4.5;
const GRID_STEP_DEG = 1.5;

async function getJson(url: string, signal?: AbortSignal): Promise<any> {
    const r = await fetch(url, { signal });
    if (!r.ok) {
        // Read the body so the diagnostic detail (often Open-Meteo's reason
        // for the rejection) makes it into the thrown error.
        let detail = '';
        try {
            const body = await r.text();
            if (body) detail = ` — ${body.slice(0, 300)}`;
        } catch {
            // ignore — the status alone is at least informative
        }
        throw new Error(`HTTP ${r.status}${detail}`);
    }
    return r.json();
}

function fetchSurfaceAndHistory(lat: number, lon: number, signal?: AbortSignal): Promise<any> {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: [
            'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
            'weather_code', 'surface_pressure', 'pressure_msl',
            'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
            'precipitation', 'cloud_cover',
        ].join(','),
        hourly: [
            'temperature_2m', 'pressure_msl', 'wind_speed_10m',
            'wind_direction_10m', 'precipitation', 'relative_humidity_2m',
            'cape', 'visibility',
        ].join(','),
        past_hours: '24',
        forecast_hours: '24',
        timezone: 'auto',
    });
    return getJson(`${FORECAST_URL}?${params}`, signal);
}

function fetchUpperAir(lat: number, lon: number, signal?: AbortSignal): Promise<any> {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        hourly: [
            'geopotential_height_500hPa', 'temperature_500hPa',
            'wind_speed_500hPa', 'wind_direction_500hPa',
            'geopotential_height_850hPa', 'temperature_850hPa',
            'wind_speed_850hPa', 'wind_direction_850hPa',
            'wind_speed_250hPa', 'wind_direction_250hPa',
        ].join(','),
        forecast_hours: '1',
        timezone: 'auto',
    });
    return getJson(`${FORECAST_URL}?${params}`, signal);
}

// `signal` stays the 3rd arg so the existing fetchFacts caller is untouched;
// radiusDeg/stepDeg are optional and default to the click-scale grid. Callers
// (viewport_markers) pass a viewport-scaled radius with step held at radius/3
// so the point count stays 7×7=49 — the proven request size — at any zoom.
export function fetchPressureGrid(
    lat: number,
    lon: number,
    signal?: AbortSignal,
    radiusDeg: number = GRID_RADIUS_DEG,
    stepDeg: number = GRID_STEP_DEG,
): Promise<any> {
    const n = Math.floor(radiusDeg / stepDeg); // radius:step ~3:1 → 7×7=49
    const lats: number[] = [];
    const lons: number[] = [];
    for (let di = -n; di <= n; di++) {
        for (let dj = -n; dj <= n; dj++) {
            lats.push(clampLat(Math.round((lat + di * stepDeg) * 1e4) / 1e4));
            lons.push(wrapLon(Math.round((lon + dj * stepDeg) * 1e4) / 1e4));
        }
    }
    const params = new URLSearchParams({
        latitude: lats.join(','),
        longitude: lons.join(','),
        current: 'pressure_msl',
        timezone: 'UTC',
    });
    return getJson(`${FORECAST_URL}?${params}`, signal);
}

function fetchAirQuality(lat: number, lon: number, signal?: AbortSignal): Promise<any> {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: 'pm2_5,pm10,european_aqi',
    });
    return getJson(`${AIR_QUALITY_URL}?${params}`, signal);
}

// 4-point cardinal probe to detect whether an ocean cell lies within ~55 km.
// Requests the top-level `elevation` field from Open-Meteo by batching 4 points.
// Points where elevation === 0 are treated as ocean (also catches large lakes —
// accepted false-positive rate; flag back to user if it fires too often inland).
function fetchOceanProbe(lat: number, lon: number, signal?: AbortSignal): Promise<any> {
    const offset = 0.5; // degrees (~55 km at equator)
    const lats = [lat + offset, lat - offset, lat, lat].map(v => String(clampLat(Math.round(v * 1e4) / 1e4)));
    const lons = [lon, lon, lon + offset, lon - offset].map(v => String(wrapLon(Math.round(v * 1e4) / 1e4)));
    const params = new URLSearchParams({
        latitude: lats.join(','),
        longitude: lons.join(','),
        current: 'temperature_2m',
        timezone: 'UTC',
    });
    return getJson(`${FORECAST_URL}?${params}`, signal);
}

function fetchMarine(lat: number, lon: number, signal?: AbortSignal): Promise<any> {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: 'swell_wave_height,swell_wave_direction,swell_wave_period,wind_wave_height,wind_wave_period',
    });
    return getJson(`${MARINE_URL}?${params}`, signal);
}

function extractSurface(wx: any): SurfaceFacts {
    const c = wx?.current ?? {};
    const wd = c.wind_direction_10m;
    // Visibility is an hourly-only Open-Meteo field; index 24 == "now"
    // (past_hours=24), the same convention extractInstability uses for CAPE.
    const visArr = wx?.hourly?.visibility;
    const visibility_m =
        Array.isArray(visArr) && visArr.length > 24 && typeof visArr[24] === 'number'
            ? visArr[24]
            : null;
    return {
        temperature_C: c.temperature_2m ?? null,
        apparent_temperature_C: c.apparent_temperature ?? null,
        humidity_pct: c.relative_humidity_2m ?? null,
        weather_code: c.weather_code ?? null,
        pressure_msl_hPa: c.pressure_msl ?? null,
        pressure_surface_hPa: c.surface_pressure ?? null,
        wind_speed_kmh: c.wind_speed_10m ?? null,
        wind_gust_kmh: c.wind_gusts_10m ?? null,
        wind_direction_deg: wd ?? null,
        wind_compass: wd != null ? compass8(wd) : null,
        cloud_cover_pct: c.cloud_cover ?? null,
        precipitation_mm: c.precipitation ?? null,
        visibility_m,
        elevation_m: wx?.elevation ?? null,
    };
}

function summarizeHistory(hourly: any): PastTrends {
    const times: string[] = hourly?.time ?? [];
    if (times.length < 25) {
        return {
            pressure_change_hPa: null,
            pressure_tendency: 'steady',
            temp_change_C: null,
            wind_shift_deg: null,
            precip_total_mm: null,
        };
    }
    const nowIdx = 24;
    const pressArr: (number | null)[] = (hourly.pressure_msl ?? []).slice(0, nowIdx + 1);
    const prsValid = pressArr.filter((v): v is number => v != null);
    const pchg =
        prsValid.length >= 2 ? Math.round((prsValid[prsValid.length - 1] - prsValid[0]) * 10) / 10 : null;
    const tNow = hourly.temperature_2m?.[nowIdx];
    const tPast = hourly.temperature_2m?.[0];
    const tchg = tNow != null && tPast != null ? Math.round((tNow - tPast) * 10) / 10 : null;
    const wNow = hourly.wind_direction_10m?.[nowIdx];
    const wPast = hourly.wind_direction_10m?.[0];
    let wShift: number | null = null;
    if (wNow != null && wPast != null) {
        wShift = Math.round(((wNow - wPast + 540) % 360) - 180);
    }
    const precipArr: (number | null)[] = (hourly.precipitation ?? []).slice(0, nowIdx + 1);
    const precipSum = precipArr.reduce<number>((s, v) => s + (v ?? 0), 0);
    let tendency: 'rising' | 'falling' | 'steady' = 'steady';
    if (pchg != null) {
        if (pchg > 1) tendency = 'rising';
        else if (pchg < -1) tendency = 'falling';
    }
    return {
        pressure_change_hPa: pchg,
        pressure_tendency: tendency,
        temp_change_C: tchg,
        wind_shift_deg: wShift,
        precip_total_mm: Math.round(precipSum * 10) / 10,
    };
}

function summarizeForecast(hourly: any): ForecastTrend {
    const times: string[] = hourly?.time ?? [];
    if (times.length < 25) {
        return { temp_change_C: null, pressure_change_hPa: null, precip_total_mm: null };
    }
    const nowIdx = 24;
    const endIdx = Math.min(nowIdx + 24, times.length - 1);
    const tNow = hourly.temperature_2m?.[nowIdx];
    const tEnd = hourly.temperature_2m?.[endIdx];
    const pNow = hourly.pressure_msl?.[nowIdx];
    const pEnd = hourly.pressure_msl?.[endIdx];
    const precipArr: (number | null)[] = (hourly.precipitation ?? []).slice(nowIdx + 1, endIdx + 1);
    const precipSum = precipArr.reduce<number>((s, v) => s + (v ?? 0), 0);
    return {
        temp_change_C: tNow != null && tEnd != null ? Math.round((tEnd - tNow) * 10) / 10 : null,
        pressure_change_hPa: pNow != null && pEnd != null ? Math.round((pEnd - pNow) * 10) / 10 : null,
        precip_total_mm: Math.round(precipSum * 10) / 10,
    };
}

function extractUpperAir(ua: any): UpperAir {
    const h = ua?.hourly ?? {};
    const first = (k: string): number | null => {
        const arr = h[k];
        return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    };
    return {
        '500hPa': {
            geopotential_height_m: first('geopotential_height_500hPa'),
            temperature_C: first('temperature_500hPa'),
            wind_speed_kmh: first('wind_speed_500hPa'),
            wind_direction_deg: first('wind_direction_500hPa'),
        },
        '850hPa': {
            geopotential_height_m: first('geopotential_height_850hPa'),
            temperature_C: first('temperature_850hPa'),
            wind_speed_kmh: first('wind_speed_850hPa'),
            wind_direction_deg: first('wind_direction_850hPa'),
        },
        '250hPa_jet': {
            wind_speed_kmh: first('wind_speed_250hPa'),
            wind_direction_deg: first('wind_direction_250hPa'),
        },
    };
}

export function findSynopticFeatures(grid: any, centerLat: number, centerLon: number): SynopticFacts {
    const points: Array<{ lat: number; lon: number; pressure: number }> = [];
    const arr: any[] = Array.isArray(grid) ? grid : [grid];
    for (const p of arr) {
        const plat = p?.latitude;
        const plon = p?.longitude;
        const pressure = p?.current?.pressure_msl;
        if (plat != null && plon != null && pressure != null) {
            points.push({ lat: plat, lon: plon, pressure });
        }
    }
    if (points.length === 0) {
        // Construct a sentinel so consumers can detect the broken case.
        const sentinel: PressureFeature = {
            pressure_hPa: NaN,
            lat: centerLat,
            lon: centerLon,
            distance_km: 0,
            bearing_deg: 0,
            compass: 'N',
        };
        return {
            nearest_low: sentinel,
            nearest_high: sentinel,
            grid_msl_pressure_hPa_min_max: [NaN, NaN],
            grid_points: 0,
        };
    }
    const low = points.reduce((a, b) => (a.pressure < b.pressure ? a : b));
    const high = points.reduce((a, b) => (a.pressure > b.pressure ? a : b));

    const feature = (pt: typeof low): PressureFeature => {
        const b = initialBearingDeg(centerLat, centerLon, pt.lat, pt.lon);
        return {
            pressure_hPa: Math.round(pt.pressure * 10) / 10,
            lat: pt.lat,
            lon: pt.lon,
            distance_km: Math.round(haversineKm(centerLat, centerLon, pt.lat, pt.lon)),
            bearing_deg: Math.round(b),
            compass: compass8(b),
        };
    };

    return {
        nearest_low: feature(low),
        nearest_high: feature(high),
        grid_msl_pressure_hPa_min_max: [
            Math.round(low.pressure * 10) / 10,
            Math.round(high.pressure * 10) / 10,
        ],
        grid_points: points.length,
    };
}

function extractAirQuality(aq: any): AirQuality {
    const c = aq?.current ?? {};
    return {
        pm2_5: c.pm2_5 ?? null,
        pm10: c.pm10 ?? null,
        european_aqi: c.european_aqi ?? null,
    };
}

function extractMarine(m: any): Marine {
    const c = m?.current ?? {};
    return {
        swell_wave_height: c.swell_wave_height ?? null,
        swell_wave_direction: c.swell_wave_direction ?? null,
        swell_wave_period: c.swell_wave_period ?? null,
        wind_wave_height: c.wind_wave_height ?? null,
        wind_wave_period: c.wind_wave_period ?? null,
    };
}

function angularDiff(a: number, b: number): number {
    return ((a - b + 540) % 360) - 180;
}

function extractGeo(
    probeRaw: any,
    centerLat: number,
    centerLon: number,
    centerElevM: number | null,
    windDirDeg: number | null,
): Geo {
    const empty: Geo = { ocean_nearby_compass: null, ocean_bearing_deg: null, ocean_distance_km: null };
    // Click is itself on ocean — sea breeze isn't the interesting story from here.
    if ((centerElevM ?? 0) <= 0) return empty;
    if (!probeRaw) return empty;

    const arr: any[] = Array.isArray(probeRaw) ? probeRaw : [probeRaw];
    const oceanPoints: Array<{ bearing: number; compass: string; distKm: number }> = [];
    for (const pt of arr) {
        if ((pt?.elevation ?? -1) !== 0) continue;
        const bearing = initialBearingDeg(centerLat, centerLon, pt.latitude ?? pt.lat, pt.longitude ?? pt.lon);
        oceanPoints.push({
            bearing: Math.round(bearing),
            compass: compass8(bearing),
            distKm: Math.round(haversineKm(centerLat, centerLon, pt.latitude ?? pt.lat, pt.longitude ?? pt.lon)),
        });
    }
    if (oceanPoints.length === 0) return empty;

    // Prefer the ocean point closest to the direction the wind is coming FROM
    // (onshore wind: wind_dir ≈ bearing toward ocean).
    let chosen = oceanPoints[0];
    if (windDirDeg != null && oceanPoints.length > 1) {
        let bestDiff = Infinity;
        for (const op of oceanPoints) {
            const diff = Math.abs(angularDiff(windDirDeg, op.bearing));
            if (diff < bestDiff) { bestDiff = diff; chosen = op; }
        }
    }
    return { ocean_nearby_compass: chosen.compass, ocean_bearing_deg: chosen.bearing, ocean_distance_km: chosen.distKm };
}

function extractInstability(wx: any): Instability {
    // CAPE not always available in `current`; pull from hourly[24] (== "now")
    // since past_hours=24 means index 24 corresponds to current hour.
    const arr = wx?.hourly?.cape;
    const value = Array.isArray(arr) && arr.length > 24 ? arr[24] : null;
    return { cape_jkg: typeof value === 'number' ? value : null };
}

export async function fetchFacts(lat: number, lon: number, signal?: AbortSignal): Promise<Facts> {
    const [wx, ua, grid, aq, marineRaw, probeRaw] = await Promise.all([
        fetchSurfaceAndHistory(lat, lon, signal),
        fetchUpperAir(lat, lon, signal),
        fetchPressureGrid(lat, lon, signal),
        fetchAirQuality(lat, lon, signal),
        fetchMarine(lat, lon, signal).catch(() => null),      // null for inland/error
        fetchOceanProbe(lat, lon, signal).catch(() => null),  // null if API fails
    ]);
    const surface = extractSurface(wx);
    return {
        location: { lat, lon },
        generated_at: new Date().toISOString(),
        surface,
        past_24h: summarizeHistory(wx.hourly ?? {}),
        forecast_24h: summarizeForecast(wx.hourly ?? {}),
        upper_air: extractUpperAir(ua),
        synoptic: findSynopticFeatures(grid, lat, lon),
        air_quality: extractAirQuality(aq),
        instability: extractInstability(wx),
        marine: marineRaw != null ? extractMarine(marineRaw) : null,
        geo: extractGeo(probeRaw, lat, lon, surface.elevation_m, surface.wind_direction_deg),
    };
}
