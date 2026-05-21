import { describe, expect, it } from 'vitest';

import { getSchematic } from '../../schematics';

describe('getSchematic', () => {
    it('returns a theme-inheriting inline SVG for the two shipped schematics', () => {
        for (const id of ['cyclonic_inflow', 'sharp_temperature_line']) {
            const svg = getSchematic(id);
            expect(svg).toBeTypeOf('string');
            expect(svg).toContain('<svg');
            expect(svg).toContain('currentColor'); // inherits Windy's theme, not a hard-coded colour
        }
    });

    it('returns null for patterns without a schematic yet (the 2-then-5 gate)', () => {
        // Abstract patterns are intentionally excluded; the fan-out 5 are not added yet.
        for (const id of ['cape_no_storms', 'wind_gust_factor', 'jet_stream', 'fog', 'layer_default']) {
            expect(getSchematic(id)).toBeNull();
        }
    });
});
