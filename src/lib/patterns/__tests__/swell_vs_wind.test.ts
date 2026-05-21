import { describe, expect, it } from 'vitest';

import swell_vs_wind from '../swell_vs_wind';
import { makeCtx, makeFacts } from './helpers';

describe('swell_vs_wind.detect', () => {
    it('fires for big swell under light local wind', () => {
        const facts = makeFacts({
            surface: { wind_speed_kmh: 8 },
            marine: { swell_wave_height: 3.0 },
        });
        const r = swell_vs_wind.detect(facts, makeCtx({ activeLayer: 'waves' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet when strong local wind is driving the sea', () => {
        const facts = makeFacts({
            surface: { wind_speed_kmh: 40 },
            marine: { swell_wave_height: 3.0 },
        });
        const r = swell_vs_wind.detect(facts, makeCtx({ activeLayer: 'waves' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet (and does not throw) when marine data is unavailable', () => {
        const facts = makeFacts({ marine: null });
        const r = swell_vs_wind.detect(facts, makeCtx({ activeLayer: 'waves' }));
        expect(r.active).toBe(false);
    });
});
