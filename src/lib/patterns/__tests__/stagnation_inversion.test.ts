import { describe, expect, it } from 'vitest';

import stagnation_inversion from '../stagnation_inversion';
import { makeCtx, makeFacts } from './helpers';

describe('stagnation_inversion.detect', () => {
    it('fires for calm wind under a high with building pollution', () => {
        const facts = makeFacts({
            surface: { wind_speed_kmh: 3, pressure_msl_hPa: 1020 },
            air_quality: { pm2_5: 40 },
        });
        const r = stagnation_inversion.detect(facts, makeCtx({ activeLayer: 'aqi' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet when the wind is ventilating the air', () => {
        const facts = makeFacts({
            surface: { wind_speed_kmh: 20, pressure_msl_hPa: 1020 },
            air_quality: { pm2_5: 40 },
        });
        const r = stagnation_inversion.detect(facts, makeCtx({ activeLayer: 'aqi' }));
        expect(r.active).toBe(false);
    });
});
