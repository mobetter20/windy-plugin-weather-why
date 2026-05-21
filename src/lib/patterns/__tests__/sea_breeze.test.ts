import { describe, expect, it } from 'vitest';

import sea_breeze from '../sea_breeze';
import { makeCtx, makeFacts } from './helpers';

// Baseline date/lon lands at ~11:20 local — already "afternoon" — so the fire
// case only needs to add an ocean + onshore wind. Ocean to the west (bearing
// 270) + wind from the west (direction 270) = onshore.
const ONSHORE_COAST = {
    surface: { wind_speed_kmh: 15, wind_direction_deg: 270 },
    geo: { ocean_nearby_compass: 'W', ocean_bearing_deg: 270, ocean_distance_km: 20 },
};

describe('sea_breeze.detect', () => {
    it('fires for an onshore afternoon breeze at a coast', () => {
        const r = sea_breeze.detect(makeFacts(ONSHORE_COAST), makeCtx({ level: 'surface' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet inland (no ocean nearby)', () => {
        const facts = makeFacts({ surface: { wind_speed_kmh: 15, wind_direction_deg: 270 } });
        const r = sea_breeze.detect(facts, makeCtx({ level: 'surface' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet when the wind is offshore', () => {
        const facts = makeFacts({
            ...ONSHORE_COAST,
            surface: { wind_speed_kmh: 15, wind_direction_deg: 90 }, // from the east, off the land
        });
        const r = sea_breeze.detect(facts, makeCtx({ level: 'surface' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet overnight', () => {
        const facts = makeFacts({
            ...ONSHORE_COAST,
            generated_at: '2024-06-15T08:00:00Z', // ~01:20 local at lon -100
        });
        const r = sea_breeze.detect(facts, makeCtx({ level: 'surface' }));
        expect(r.active).toBe(false);
    });

    it('does not fire above the surface', () => {
        const r = sea_breeze.detect(makeFacts(ONSHORE_COAST), makeCtx({ level: '850h' }));
        expect(r.active).toBe(false);
    });
});
