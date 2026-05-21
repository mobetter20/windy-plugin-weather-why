import { describe, expect, it } from 'vitest';

import cyclonic_inflow from '../cyclonic_inflow';
import { makeCtx, makeFacts } from './helpers';

describe('cyclonic_inflow.detect', () => {
    it('fires for a deep, close, dominant low at the surface', () => {
        const facts = makeFacts({
            past_24h: { pressure_tendency: 'falling' },
            synoptic: {
                nearest_low: { pressure_hPa: 985, distance_km: 400 },
                nearest_high: { pressure_hPa: 1018, distance_km: 900 },
            },
        });
        const r = cyclonic_inflow.detect(facts, makeCtx({ level: 'surface' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet when the nearest low is shallow and far', () => {
        const facts = makeFacts({
            synoptic: {
                nearest_low: { pressure_hPa: 1015, distance_km: 2000 },
                nearest_high: { pressure_hPa: 1016, distance_km: 700 },
            },
        });
        const r = cyclonic_inflow.detect(facts, makeCtx({ level: 'surface' }));
        expect(r.active).toBe(false);
    });

    it('does not fire at upper levels even with a deep low (defers to jet/ridge)', () => {
        const facts = makeFacts({
            synoptic: { nearest_low: { pressure_hPa: 985, distance_km: 400 } },
        });
        const r = cyclonic_inflow.detect(facts, makeCtx({ level: '250h' }));
        expect(r.active).toBe(false);
    });
});
