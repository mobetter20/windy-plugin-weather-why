import { describe, expect, it } from 'vitest';

import tight_gradient from '../tight_gradient';
import { makeCtx, makeFacts } from './helpers';

describe('tight_gradient.detect', () => {
    it('fires for strong wind across a tight regional pressure span', () => {
        const facts = makeFacts({
            surface: { wind_speed_kmh: 60 },
            synoptic: {
                grid_msl_pressure_hPa_min_max: [1000, 1025],
                nearest_low: { pressure_hPa: 1015 }, // no real low → does not defer
            },
        });
        const r = tight_gradient.detect(facts, makeCtx({ level: 'surface' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('yields to cyclonic_inflow when a real low is nearby', () => {
        const facts = makeFacts({
            surface: { wind_speed_kmh: 60 },
            synoptic: {
                grid_msl_pressure_hPa_min_max: [1000, 1025],
                nearest_low: { pressure_hPa: 990, distance_km: 500 },
            },
        });
        const r = tight_gradient.detect(facts, makeCtx({ level: 'surface' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet for light wind and a slack gradient', () => {
        const r = tight_gradient.detect(makeFacts(), makeCtx({ level: 'surface' }));
        expect(r.active).toBe(false);
    });
});
