import { describe, expect, it } from 'vitest';

import rain_in_a_line from '../rain_in_a_line';
import { makeCtx, makeFacts } from './helpers';

describe('rain_in_a_line.detect', () => {
    it('fires for forecast rain with a wind shift and falling pressure', () => {
        const facts = makeFacts({
            forecast_24h: { precip_total_mm: 8 },
            past_24h: { wind_shift_deg: 90, pressure_tendency: 'falling' },
        });
        const r = rain_in_a_line.detect(facts, makeCtx({ activeLayer: 'rain' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet when there is no rain in any window', () => {
        const r = rain_in_a_line.detect(makeFacts(), makeCtx({ activeLayer: 'rain' }));
        expect(r.active).toBe(false);
    });
});
