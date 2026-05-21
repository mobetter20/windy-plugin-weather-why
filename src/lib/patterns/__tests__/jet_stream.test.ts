import { describe, expect, it } from 'vitest';

import jet_stream from '../jet_stream';
import { makeCtx, makeFacts } from './helpers';

describe('jet_stream.detect', () => {
    it('fires for a fast ribbon at an upper level (250h)', () => {
        const facts = makeFacts({ upper_air: { '250hPa_jet': { wind_speed_kmh: 220 } } });
        const r = jet_stream.detect(facts, makeCtx({ level: '250h' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('does not fire at the surface even when the jet aloft is fast', () => {
        const facts = makeFacts({ upper_air: { '250hPa_jet': { wind_speed_kmh: 220 } } });
        const r = jet_stream.detect(facts, makeCtx({ level: 'surface' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet at an upper level when the wind is below jet speed', () => {
        const facts = makeFacts({ upper_air: { '250hPa_jet': { wind_speed_kmh: 60 } } });
        const r = jet_stream.detect(facts, makeCtx({ level: '250h' }));
        expect(r.active).toBe(false);
    });
});
