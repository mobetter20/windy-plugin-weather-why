import { describe, expect, it } from 'vitest';

import heat_dome from '../heat_dome';
import { makeCtx, makeFacts } from './helpers';

describe('heat_dome.detect', () => {
    it('fires for a strong, dominant, warm ridge', () => {
        const facts = makeFacts({
            surface: { temperature_C: 32, cloud_cover_pct: 20 },
            upper_air: { '500hPa': { geopotential_height_m: 5900 } },
            synoptic: {
                nearest_high: { pressure_hPa: 1025, distance_km: 300 },
                nearest_low: { distance_km: 800 },
            },
        });
        const r = heat_dome.detect(facts, makeCtx({ activeLayer: 'temp' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet for a strong but COLD high (winter, not a heat dome)', () => {
        const facts = makeFacts({
            surface: { temperature_C: 5, cloud_cover_pct: 20 },
            synoptic: {
                nearest_high: { pressure_hPa: 1025, distance_km: 300 },
                nearest_low: { distance_km: 800 },
            },
        });
        const r = heat_dome.detect(facts, makeCtx({ activeLayer: 'temp' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet when the high is unremarkable', () => {
        const r = heat_dome.detect(makeFacts(), makeCtx({ activeLayer: 'pressure' }));
        expect(r.active).toBe(false);
    });
});
