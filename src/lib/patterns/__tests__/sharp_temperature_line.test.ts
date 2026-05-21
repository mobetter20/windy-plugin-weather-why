import { describe, expect, it } from 'vitest';

import sharp_temperature_line from '../sharp_temperature_line';
import { makeCtx, makeFacts } from './helpers';

describe('sharp_temperature_line.detect', () => {
    it('fires when both front signatures are present (temp change + wind shift)', () => {
        const facts = makeFacts({
            past_24h: { temp_change_C: -8, wind_shift_deg: 90, pressure_tendency: 'falling' },
        });
        const r = sharp_temperature_line.detect(facts, makeCtx({ activeLayer: 'temp' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet for a temperature change with no wind shift (likely terrain)', () => {
        const facts = makeFacts({ past_24h: { temp_change_C: -8, wind_shift_deg: 10 } });
        const r = sharp_temperature_line.detect(facts, makeCtx({ activeLayer: 'temp' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet with no recent change at all', () => {
        const r = sharp_temperature_line.detect(makeFacts(), makeCtx({ activeLayer: 'temp' }));
        expect(r.active).toBe(false);
    });
});
