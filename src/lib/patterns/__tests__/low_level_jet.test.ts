import { describe, expect, it } from 'vitest';

import low_level_jet from '../low_level_jet';
import { makeCtx, makeFacts } from './helpers';

describe('low_level_jet.detect', () => {
    it('fires for a fast 850 hPa wind at the low-level (850h)', () => {
        const facts = makeFacts({ upper_air: { '850hPa': { wind_speed_kmh: 100 } } });
        const r = low_level_jet.detect(facts, makeCtx({ level: '850h' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet when the 850 hPa wind is modest', () => {
        const facts = makeFacts({ upper_air: { '850hPa': { wind_speed_kmh: 30 } } });
        const r = low_level_jet.detect(facts, makeCtx({ level: '850h' }));
        expect(r.active).toBe(false);
    });

    it('does not fire at the surface even with a fast 850 hPa wind', () => {
        const facts = makeFacts({ upper_air: { '850hPa': { wind_speed_kmh: 100 } } });
        const r = low_level_jet.detect(facts, makeCtx({ level: 'surface' }));
        expect(r.active).toBe(false);
    });
});
