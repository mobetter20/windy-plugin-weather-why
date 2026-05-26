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

// Regression guard for the PM2.5 health-category fix. EPA AQI 24-h breakpoints:
// PM2.5 USG 35.5–55.4, Unhealthy 55.5–150.4 (a far lower scale than PM10, whose
// USG is 155–254 and Unhealthy ≥255). The old code used PM10-scale numbers for
// PM2.5, so a 45 read as "moderate" and a 70 as "sensitive groups" — both one
// tier too lenient. We assert on the rendered card phrase, not internal state.
describe('haze_dust_plume health category (rendered phrase)', () => {
    const cardPhrase = (pm: { pm2_5?: number; pm10?: number }) => {
        const facts = makeFacts({ air_quality: pm });
        const r = haze_dust_plume.detect(facts, makeCtx({ activeLayer: 'aqi' }));
        expect(r.active).toBe(true); // fixture must fire, else content() params are stale
        return haze_dust_plume.content(facts, r.params).mechanism;
    };

    it('PM2.5 in 35.5–55.4 reads as Unhealthy for Sensitive Groups (was "moderate")', () => {
        expect(cardPhrase({ pm2_5: 45 })).toContain('unhealthy for sensitive groups');
    });

    it('PM2.5 ≥ 55.5 reads as Unhealthy for everyone (was "sensitive groups")', () => {
        expect(cardPhrase({ pm2_5: 70 })).toContain('unhealthy for everyone');
    });

    it('PM10 keeps its own higher scale: 200 is USG, 300 is Unhealthy', () => {
        expect(cardPhrase({ pm2_5: 10, pm10: 200 })).toContain('unhealthy for sensitive groups');
        expect(cardPhrase({ pm2_5: 10, pm10: 300 })).toContain('unhealthy for everyone');
    });

    it('genuinely moderate particulates still read as moderate', () => {
        expect(cardPhrase({ pm2_5: 20, pm10: 100 })).toContain('moderate range');
    });
});
