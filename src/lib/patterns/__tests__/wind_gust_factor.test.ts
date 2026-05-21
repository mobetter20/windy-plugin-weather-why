import { describe, expect, it } from 'vitest';

import wind_gust_factor from '../wind_gust_factor';
import { makeCtx, makeFacts } from './helpers';

describe('wind_gust_factor.detect', () => {
    it('fires when gusts far exceed the sustained wind', () => {
        const facts = makeFacts({ surface: { wind_speed_kmh: 30, wind_gust_kmh: 60 } });
        const r = wind_gust_factor.detect(facts, makeCtx({ activeLayer: 'gust' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet when gusts only modestly exceed the mean', () => {
        const facts = makeFacts({ surface: { wind_speed_kmh: 30, wind_gust_kmh: 36 } });
        const r = wind_gust_factor.detect(facts, makeCtx({ activeLayer: 'gust' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet at near-calm speeds where the ratio is unstable', () => {
        const facts = makeFacts({ surface: { wind_speed_kmh: 3, wind_gust_kmh: 16 } });
        const r = wind_gust_factor.detect(facts, makeCtx({ activeLayer: 'gust' }));
        expect(r.active).toBe(false);
    });
});
