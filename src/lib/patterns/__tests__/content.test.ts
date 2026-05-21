import { describe, expect, it } from 'vitest';

import type { DetectContext, Facts, PatternModule } from '../../types';
import { makeCtx, makeFacts } from './helpers';

import cape_no_storms from '../cape_no_storms';
import cyclonic_inflow from '../cyclonic_inflow';
import haze_dust_plume from '../haze_dust_plume';
import heat_dome from '../heat_dome';
import jet_stream from '../jet_stream';
import low_level_jet from '../low_level_jet';
import orographic_rain from '../orographic_rain';
import radar_satellite_mismatch from '../radar_satellite_mismatch';
import rain_in_a_line from '../rain_in_a_line';
import sea_breeze from '../sea_breeze';
import sharp_temperature_line from '../sharp_temperature_line';
import stagnation_inversion from '../stagnation_inversion';
import swell_vs_wind from '../swell_vs_wind';
import tight_gradient from '../tight_gradient';
import wind_gust_factor from '../wind_gust_factor';

// Every key in the WindyOverlay union (types.ts). A checkNext button pointing
// anywhere outside this set is a dead "Toggle …" CTA — the same class of bug as
// the cAQI/dust/pm10 overlay-key regression, so the card content guards it too.
const VALID_OVERLAYS = new Set([
    'wind', 'gust', 'rain', 'rainAccu', 'radar', 'satellite', 'pressure', 'temp',
    'clouds', 'cloudtop', 'cape', 'waves', 'swell1', 'swell2', 'aqi', 'pm2p5',
    'dustsm', 'visibility',
]);

interface Row {
    name: string;
    mod: PatternModule<any>;
    facts: Facts;
    ctx: DetectContext;
}

// One firing scenario per pattern — content() is rendered from the params a real
// detect() emits, so each fixture must actually fire (asserted below).
const FIRING: Row[] = [
    {
        name: 'cyclonic_inflow',
        mod: cyclonic_inflow,
        facts: makeFacts({
            past_24h: { pressure_tendency: 'falling' },
            synoptic: {
                nearest_low: { pressure_hPa: 985, distance_km: 400 },
                nearest_high: { pressure_hPa: 1018, distance_km: 900 },
            },
        }),
        ctx: makeCtx({ activeLayer: 'wind', level: 'surface' }),
    },
    {
        name: 'cyclonic_inflow (tropical branch)',
        mod: cyclonic_inflow,
        facts: makeFacts({
            location: { lat: 15 },
            synoptic: { nearest_low: { pressure_hPa: 960, distance_km: 300 } },
        }),
        ctx: makeCtx({ activeLayer: 'wind', level: 'surface' }),
    },
    {
        name: 'jet_stream',
        mod: jet_stream,
        facts: makeFacts({ upper_air: { '250hPa_jet': { wind_speed_kmh: 220 } } }),
        ctx: makeCtx({ activeLayer: 'wind', level: '250h' }),
    },
    {
        name: 'low_level_jet',
        mod: low_level_jet,
        facts: makeFacts({ upper_air: { '850hPa': { wind_speed_kmh: 100 } } }),
        ctx: makeCtx({ activeLayer: 'wind', level: '850h' }),
    },
    {
        name: 'tight_gradient',
        mod: tight_gradient,
        facts: makeFacts({
            surface: { wind_speed_kmh: 60 },
            synoptic: {
                grid_msl_pressure_hPa_min_max: [1000, 1025],
                nearest_low: { pressure_hPa: 1015 },
            },
        }),
        ctx: makeCtx({ activeLayer: 'wind', level: 'surface' }),
    },
    {
        name: 'rain_in_a_line',
        mod: rain_in_a_line,
        facts: makeFacts({
            forecast_24h: { precip_total_mm: 8 },
            past_24h: { wind_shift_deg: 90, pressure_tendency: 'falling' },
        }),
        ctx: makeCtx({ activeLayer: 'rain' }),
    },
    {
        name: 'cape_no_storms',
        mod: cape_no_storms,
        facts: makeFacts({ instability: { cape_jkg: 3000 } }),
        ctx: makeCtx({ activeLayer: 'cape' }),
    },
    {
        name: 'radar_satellite_mismatch',
        mod: radar_satellite_mismatch,
        facts: makeFacts({ surface: { cloud_cover_pct: 90 } }),
        ctx: makeCtx({ activeLayer: 'satellite' }),
    },
    {
        name: 'sharp_temperature_line',
        mod: sharp_temperature_line,
        facts: makeFacts({
            past_24h: { temp_change_C: -8, wind_shift_deg: 90, pressure_tendency: 'falling' },
        }),
        ctx: makeCtx({ activeLayer: 'temp' }),
    },
    {
        name: 'heat_dome',
        mod: heat_dome,
        facts: makeFacts({
            surface: { temperature_C: 32, cloud_cover_pct: 20 },
            upper_air: { '500hPa': { geopotential_height_m: 5900 } },
            synoptic: {
                nearest_high: { pressure_hPa: 1025, distance_km: 300 },
                nearest_low: { distance_km: 800 },
            },
        }),
        ctx: makeCtx({ activeLayer: 'temp' }),
    },
    {
        name: 'haze_dust_plume',
        mod: haze_dust_plume,
        facts: makeFacts({ air_quality: { pm2_5: 60 } }),
        ctx: makeCtx({ activeLayer: 'aqi' }),
    },
    {
        name: 'stagnation_inversion',
        mod: stagnation_inversion,
        facts: makeFacts({
            surface: { wind_speed_kmh: 3, pressure_msl_hPa: 1020 },
            air_quality: { pm2_5: 40 },
        }),
        ctx: makeCtx({ activeLayer: 'aqi' }),
    },
    {
        name: 'wind_gust_factor',
        mod: wind_gust_factor,
        facts: makeFacts({ surface: { wind_speed_kmh: 30, wind_gust_kmh: 60 } }),
        ctx: makeCtx({ activeLayer: 'gust' }),
    },
    {
        name: 'orographic_rain',
        mod: orographic_rain,
        facts: makeFacts({
            surface: { elevation_m: 1600 },
            forecast_24h: { precip_total_mm: 8 },
        }),
        ctx: makeCtx({ activeLayer: 'rain' }),
    },
    {
        name: 'swell_vs_wind',
        mod: swell_vs_wind,
        facts: makeFacts({
            surface: { wind_speed_kmh: 8 },
            marine: { swell_wave_height: 3.0 },
        }),
        ctx: makeCtx({ activeLayer: 'waves' }),
    },
    {
        name: 'sea_breeze',
        mod: sea_breeze,
        facts: makeFacts({
            surface: { wind_speed_kmh: 15, wind_direction_deg: 270 },
            geo: { ocean_nearby_compass: 'W', ocean_bearing_deg: 270, ocean_distance_km: 20 },
        }),
        ctx: makeCtx({ activeLayer: 'wind', level: 'surface' }),
    },
];

describe('pattern content() cards', () => {
    it.each(FIRING)('$name renders a well-formed 4-beat card', ({ mod, facts, ctx }) => {
        const r = mod.detect(facts, ctx);
        expect(r.active).toBe(true); // fixture sanity: this scenario must fire

        const card = mod.content(facts, r.params);
        expect(card.title.length).toBeGreaterThan(0);
        expect(card.mechanism.length).toBeGreaterThan(0);
        expect(card.remember.length).toBeGreaterThan(0);
        expect(card.checkNext.length).toBeGreaterThanOrEqual(1);
        for (const cn of card.checkNext) {
            expect(cn.label.length).toBeGreaterThan(0);
            expect(VALID_OVERLAYS.has(cn.overlay)).toBe(true);
        }
    });
});
