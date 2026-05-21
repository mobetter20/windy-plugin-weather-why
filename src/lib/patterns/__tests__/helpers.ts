// Test helpers for the pattern detectors.
//
// `makeFacts()` returns a complete, calm fair-weather `Facts` object in which
// NO pattern fires — a Northern-Hemisphere, mid-latitude, inland point with
// light wind, no precip, weak pressure features, clean air, flat seas. Each
// test overrides only the fields it cares about (deep-merged), so a test reads
// as "given this baseline, change X, assert the detector reacts to X".
//
// The baseline date/lon (2024-06-15T18:00Z at lon -100) lands at ~11:20 local,
// which counts as "afternoon" for sea_breeze — so the sea-breeze fire test only
// needs to add an ocean + onshore wind, not also fix the clock.

import type { DetectContext, Facts } from '../../types';

type DeepPartial<T> = T extends (infer _U)[]
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, override: unknown): T {
    if (!isPlainObject(base) || !isPlainObject(override)) {
        return (override === undefined ? base : override) as T;
    }
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
        const o = override[key];
        if (o === undefined) continue;
        out[key] =
            isPlainObject(out[key]) && isPlainObject(o) ? deepMerge(out[key], o) : o;
    }
    return out as T;
}

const DEFAULT_FACTS: Facts = {
    location: { lat: 40, lon: -100 },
    generated_at: '2024-06-15T18:00:00Z',
    surface: {
        temperature_C: 15,
        apparent_temperature_C: 15,
        humidity_pct: 60,
        weather_code: 0,
        pressure_msl_hPa: 1013,
        pressure_surface_hPa: 1013,
        wind_speed_kmh: 12,
        wind_gust_kmh: 16,
        wind_direction_deg: 270,
        wind_compass: 'W',
        cloud_cover_pct: 30,
        precipitation_mm: 0,
        visibility_m: 20000,
        elevation_m: 200,
    },
    past_24h: {
        pressure_change_hPa: 0,
        pressure_tendency: 'steady',
        temp_change_C: 0,
        wind_shift_deg: 0,
        precip_total_mm: 0,
    },
    forecast_24h: {
        temp_change_C: 0,
        pressure_change_hPa: 0,
        precip_total_mm: 0,
    },
    upper_air: {
        '500hPa': {
            geopotential_height_m: 5700,
            temperature_C: -5,
            wind_speed_kmh: 40,
            wind_direction_deg: 270,
        },
        '850hPa': {
            geopotential_height_m: 1500,
            temperature_C: 8,
            wind_speed_kmh: 30,
            wind_direction_deg: 270,
        },
        '250hPa_jet': {
            wind_speed_kmh: 60,
            wind_direction_deg: 270,
        },
    },
    synoptic: {
        nearest_low: {
            pressure_hPa: 1011,
            lat: 45,
            lon: -100,
            distance_km: 600,
            bearing_deg: 0,
            compass: 'N',
        },
        nearest_high: {
            pressure_hPa: 1016,
            lat: 35,
            lon: -100,
            distance_km: 700,
            bearing_deg: 180,
            compass: 'S',
        },
        grid_msl_pressure_hPa_min_max: [1011, 1016],
        grid_points: 25,
    },
    air_quality: {
        pm2_5: 10,
        pm10: 20,
        european_aqi: 30,
    },
    instability: {
        cape_jkg: 100,
    },
    marine: {
        swell_wave_height: 0.3,
        swell_wave_direction: 270,
        swell_wave_period: 8,
        wind_wave_height: 0.4,
        wind_wave_period: 4,
    },
    geo: {
        ocean_nearby_compass: null,
        ocean_bearing_deg: null,
        ocean_distance_km: null,
    },
};

export function makeFacts(overrides: DeepPartial<Facts> = {}): Facts {
    return deepMerge(structuredClone(DEFAULT_FACTS), overrides);
}

export function makeCtx(overrides: Partial<DetectContext> = {}): DetectContext {
    return { activeLayer: 'wind', level: 'surface', ...overrides };
}
