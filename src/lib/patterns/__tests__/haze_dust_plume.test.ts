import { describe, expect, it } from 'vitest';

import haze_dust_plume from '../haze_dust_plume';
import { makeCtx, makeFacts } from './helpers';

describe('haze_dust_plume.detect', () => {
    it('fires when PM2.5 is elevated', () => {
        const facts = makeFacts({ air_quality: { pm2_5: 60 } });
        const r = haze_dust_plume.detect(facts, makeCtx({ activeLayer: 'aqi' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.6);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('fires on coarse dust (PM10) even when PM2.5 is clean', () => {
        const facts = makeFacts({ air_quality: { pm2_5: 10, pm10: 120 } });
        const r = haze_dust_plume.detect(facts, makeCtx({ activeLayer: 'dustsm' }));
        expect(r.active).toBe(true);
    });

    it('stays quiet at background particulate levels', () => {
        const r = haze_dust_plume.detect(makeFacts(), makeCtx({ activeLayer: 'aqi' }));
        expect(r.active).toBe(false);
    });
});
