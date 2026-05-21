import { describe, expect, it } from 'vitest';

import cyclonic_inflow from '../cyclonic_inflow';
import orographic_rain from '../orographic_rain';
import { getSupportedLayers, pickPattern } from '../index';
import { makeCtx, makeFacts } from './helpers';

describe('pickPattern dispatcher', () => {
    it('returns no module when nothing fires on the active layer', () => {
        const r = pickPattern(makeCtx({ activeLayer: 'wind', level: 'surface' }), makeFacts());
        expect(r.module).toBeNull();
        expect(r.confidence).toBe(0);
    });

    it('picks the highest-confidence pattern when two overlap on a layer', () => {
        // On wind/surface: a weak low fires cyclonic_inflow (~0.8) AND an onshore
        // afternoon coast fires sea_breeze (1.0). Higher confidence must win — and
        // cyclonic_inflow is FIRST in MODULES order, so winning requires ranking by
        // confidence, not iteration order.
        const facts = makeFacts({
            surface: { wind_speed_kmh: 15, wind_direction_deg: 270 },
            geo: { ocean_nearby_compass: 'W', ocean_bearing_deg: 270, ocean_distance_km: 20 },
            synoptic: {
                nearest_low: { pressure_hPa: 1005, distance_km: 1400 },
                nearest_high: { distance_km: 1600 },
            },
        });
        const ctx = makeCtx({ activeLayer: 'wind', level: 'surface' });

        const cyclonic = cyclonic_inflow.detect(facts, ctx);
        expect(cyclonic.active).toBe(true); // the losing pattern genuinely fired too

        const r = pickPattern(ctx, facts);
        expect(r.module?.id).toBe('sea_breeze');
        expect(r.confidence).toBeGreaterThan(cyclonic.confidence);
    });

    it('gates by layer: a surface-low pattern does not leak onto the pressure layer', () => {
        const facts = makeFacts({
            past_24h: { pressure_tendency: 'falling' },
            synoptic: {
                nearest_low: { pressure_hPa: 985, distance_km: 400 },
                nearest_high: { pressure_hPa: 1018, distance_km: 900 },
            },
        });
        expect(
            pickPattern(makeCtx({ activeLayer: 'wind', level: 'surface' }), facts).module?.id,
        ).toBe('cyclonic_inflow');
        // cyclonic_inflow only appliesToLayers wind/gust — on pressure it must not run.
        expect(pickPattern(makeCtx({ activeLayer: 'pressure', level: 'surface' }), facts).module).toBeNull();
    });

    it('gates by level: the jet stream is found only at upper levels', () => {
        const facts = makeFacts({ upper_air: { '250hPa_jet': { wind_speed_kmh: 220 } } });
        expect(pickPattern(makeCtx({ activeLayer: 'wind', level: '250h' }), facts).module?.id).toBe(
            'jet_stream',
        );
        expect(pickPattern(makeCtx({ activeLayer: 'wind', level: 'surface' }), facts).module).toBeNull();
    });

    it('gates by level: the low-level jet is found at 850h', () => {
        const facts = makeFacts({ upper_air: { '850hPa': { wind_speed_kmh: 100 } } });
        expect(pickPattern(makeCtx({ activeLayer: 'wind', level: '850h' }), facts).module?.id).toBe(
            'low_level_jet',
        );
    });

    it('routes air-quality patterns on the live overlay keys (aqi / pm2p5 / dustsm)', () => {
        const facts = makeFacts({ air_quality: { pm2_5: 60 } });
        for (const layer of ['aqi', 'pm2p5', 'dustsm'] as const) {
            expect(pickPattern(makeCtx({ activeLayer: layer }), facts).module?.id).toBe(
                'haze_dust_plume',
            );
        }
    });

    it('exposes the live overlay keys and none of the retired ones', () => {
        // Regression guard for the cAQI/dust/pm10 -> aqi/dustsm overlay-key fix.
        const layers = getSupportedLayers() as string[];
        expect(layers).toEqual(expect.arrayContaining(['aqi', 'pm2p5', 'dustsm']));
        for (const dead of ['cAQI', 'dust', 'pm10']) {
            expect(layers).not.toContain(dead);
        }
    });

    it('routes fog on both the visibility and fog layers', () => {
        const facts = makeFacts({
            surface: { visibility_m: 200, humidity_pct: 97, wind_speed_kmh: 5 },
        });
        for (const layer of ['visibility', 'fog'] as const) {
            expect(pickPattern(makeCtx({ activeLayer: layer }), facts).module?.id).toBe('fog');
        }
    });

    it('wintry_mix outranks orographic_rain in the near-freezing core (tie-break by order)', () => {
        // Snowy 1,600 m pass, 0°C, 6 mm forecast: BOTH detectors reach confidence
        // 1.0. The freezing-rain hazard must win, not "terrain squeezing out rain".
        const facts = makeFacts({
            surface: { elevation_m: 1600, temperature_C: 0 },
            forecast_24h: { precip_total_mm: 6 },
        });
        const ctx = makeCtx({ activeLayer: 'rain' });

        const orographic = orographic_rain.detect(facts, ctx);
        expect(orographic.active).toBe(true); // a genuine overlap, not a walkover

        const r = pickPattern(ctx, facts);
        expect(r.module?.id).toBe('wintry_mix');
        expect(r.confidence).toBeGreaterThanOrEqual(orographic.confidence);
    });
});
