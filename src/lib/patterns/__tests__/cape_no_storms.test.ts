import { describe, expect, it } from 'vitest';

import cape_no_storms from '../cape_no_storms';
import { makeCtx, makeFacts } from './helpers';

describe('cape_no_storms.detect', () => {
    it('fires for significant CAPE with a quiet sky', () => {
        const facts = makeFacts({ instability: { cape_jkg: 3000 } });
        const r = cape_no_storms.detect(facts, makeCtx({ activeLayer: 'cape' }));
        expect(r.active).toBe(true);
        expect(r.confidence).toBeGreaterThanOrEqual(0.7);
        expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it('stays quiet when storms are firing despite the CAPE', () => {
        const facts = makeFacts({
            instability: { cape_jkg: 3000 },
            forecast_24h: { precip_total_mm: 5 },
        });
        const r = cape_no_storms.detect(facts, makeCtx({ activeLayer: 'cape' }));
        expect(r.active).toBe(false);
    });

    it('stays quiet when CAPE is low', () => {
        const r = cape_no_storms.detect(makeFacts(), makeCtx({ activeLayer: 'cape' }));
        expect(r.active).toBe(false);
    });
});
