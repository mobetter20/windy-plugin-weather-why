import { describe, expect, it } from 'vitest';

import radar_satellite_mismatch from '../radar_satellite_mismatch';
import { makeCtx, makeFacts } from './helpers';

describe('radar_satellite_mismatch.detect', () => {
    it('fires for heavy cloud with no rain on the satellite layer', () => {
        const facts = makeFacts({ surface: { cloud_cover_pct: 90 } });
        const r = radar_satellite_mismatch.detect(facts, makeCtx({ activeLayer: 'satellite' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('does not fire on a layer it does not apply to', () => {
        const facts = makeFacts({ surface: { cloud_cover_pct: 90 } });
        const r = radar_satellite_mismatch.detect(facts, makeCtx({ activeLayer: 'wind' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet when rain is present under the clouds', () => {
        const facts = makeFacts({
            surface: { cloud_cover_pct: 90 },
            forecast_24h: { precip_total_mm: 5 },
        });
        const r = radar_satellite_mismatch.detect(facts, makeCtx({ activeLayer: 'radar' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet under a clear sky', () => {
        const facts = makeFacts({ surface: { cloud_cover_pct: 30 } });
        const r = radar_satellite_mismatch.detect(facts, makeCtx({ activeLayer: 'satellite' }));
        expect(r.active).toBe(false);
    });
});
