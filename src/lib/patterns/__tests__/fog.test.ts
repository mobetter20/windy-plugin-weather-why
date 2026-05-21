import { describe, expect, it } from 'vitest';

import fog from '../fog';
import { makeCtx, makeFacts } from './helpers';

describe('fog.detect', () => {
    it('fires for low visibility in saturated, calm air', () => {
        const facts = makeFacts({
            surface: { visibility_m: 200, humidity_pct: 97, wind_speed_kmh: 5 },
        });
        const r = fog.detect(facts, makeCtx({ activeLayer: 'visibility' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet in clear air (good visibility)', () => {
        const r = fog.detect(makeFacts(), makeCtx({ activeLayer: 'visibility' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet when low visibility is dry — that is haze/dust, not fog', () => {
        const facts = makeFacts({
            surface: { visibility_m: 500, humidity_pct: 40, wind_speed_kmh: 5 },
        });
        const r = fog.detect(facts, makeCtx({ activeLayer: 'visibility' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet when wind is strong enough to mix fog out', () => {
        const facts = makeFacts({
            surface: { visibility_m: 500, humidity_pct: 95, wind_speed_kmh: 30 },
        });
        const r = fog.detect(facts, makeCtx({ activeLayer: 'fog' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet (no crash) when visibility data is unavailable', () => {
        const facts = makeFacts({ surface: { visibility_m: null } });
        const r = fog.detect(facts, makeCtx({ activeLayer: 'visibility' }));
        expect(r.active).toBe(false);
    });

    it('classifies advection fog when humid air is onshore', () => {
        const facts = makeFacts({
            surface: { visibility_m: 300, humidity_pct: 96, wind_speed_kmh: 10, wind_direction_deg: 270 },
            geo: { ocean_nearby_compass: 'W', ocean_bearing_deg: 270, ocean_distance_km: 15 },
        });
        const r = fog.detect(facts, makeCtx({ activeLayer: 'fog' }));
        expect(r.active).toBe(true);
        expect((r.params as { type: string }).type).toBe('advection');
    });

    it('classifies radiation fog under a clear sky overnight', () => {
        const facts = makeFacts({
            generated_at: '2024-06-15T08:00:00Z', // ~01:20 local at lon -100
            surface: { visibility_m: 300, humidity_pct: 96, wind_speed_kmh: 4, cloud_cover_pct: 10 },
        });
        const r = fog.detect(facts, makeCtx({ activeLayer: 'visibility' }));
        expect(r.active).toBe(true);
        expect((r.params as { type: string }).type).toBe('radiation');
    });
});
