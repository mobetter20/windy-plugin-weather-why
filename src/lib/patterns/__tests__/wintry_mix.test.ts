import { describe, expect, it } from 'vitest';

import wintry_mix from '../wintry_mix';
import { makeCtx, makeFacts } from './helpers';

describe('wintry_mix.detect', () => {
    it('fires for precipitation right at the freezing line', () => {
        const facts = makeFacts({
            surface: { temperature_C: 0 },
            forecast_24h: { precip_total_mm: 5 },
        });
        const r = wintry_mix.detect(facts, makeCtx({ activeLayer: 'rain' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('fires at the warm edge of the band (lower confidence)', () => {
        const facts = makeFacts({
            surface: { temperature_C: 3 },
            forecast_24h: { precip_total_mm: 1 },
        });
        const r = wintry_mix.detect(facts, makeCtx({ activeLayer: 'temp' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeLessThan(0.8); // edge of the band, not the core
    });

    it('stays quiet when it is clearly warm', () => {
        const facts = makeFacts({
            surface: { temperature_C: 8 },
            forecast_24h: { precip_total_mm: 5 },
        });
        const r = wintry_mix.detect(facts, makeCtx({ activeLayer: 'rain' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet when it is cold but dry', () => {
        const facts = makeFacts({ surface: { temperature_C: 0 } });
        const r = wintry_mix.detect(facts, makeCtx({ activeLayer: 'rain' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet in deep cold (all snow, not a mix)', () => {
        const facts = makeFacts({
            surface: { temperature_C: -10 },
            forecast_24h: { precip_total_mm: 5 },
        });
        const r = wintry_mix.detect(facts, makeCtx({ activeLayer: 'rain' }));
        expect(r.active).toBe(false);
    });
});
