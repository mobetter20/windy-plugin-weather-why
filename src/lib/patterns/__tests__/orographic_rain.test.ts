import { describe, expect, it } from 'vitest';

import orographic_rain from '../orographic_rain';
import { makeCtx, makeFacts } from './helpers';

describe('orographic_rain.detect', () => {
    it('fires for rain at elevation', () => {
        const facts = makeFacts({
            surface: { elevation_m: 1600 },
            forecast_24h: { precip_total_mm: 8 },
        });
        const r = orographic_rain.detect(facts, makeCtx({ activeLayer: 'rain' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet for rain in the lowlands', () => {
        const facts = makeFacts({
            surface: { elevation_m: 100 },
            forecast_24h: { precip_total_mm: 8 },
        });
        const r = orographic_rain.detect(facts, makeCtx({ activeLayer: 'rain' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet on a dry mountain', () => {
        const facts = makeFacts({ surface: { elevation_m: 1600 } });
        const r = orographic_rain.detect(facts, makeCtx({ activeLayer: 'rain' }));
        expect(r.active).toBe(false);
    });
});
