// Pattern: cyclonic inflow around a low.
//
// Visible cue: wind arrows on Windy's wind layer curling counterclockwise (NH)
// or clockwise (SH) into a center. Trigger layer: 'wind' (and 'gust', which
// shares the streamline rendering).
//
// Mechanism: pressure-gradient force pushes air toward the low, Coriolis
// deflects it — flow spirals inward around the center. Where rotation lifts
// moist air, clouds and rain follow.
//
// Detection: a low ≤1500 km away with central pressure < 1010 hPa AND lower
// (closer or more pronounced) than the nearest high. Confidence weights
// distance, depth, and dominance.

import type { DetectContext, Facts, PatternModule, PressureFeature, WindyOverlay } from '../types';

interface Params {
    low: PressureFeature;
    hemisphere: 'N' | 'S';
    pressureChange24h: number | null;
}

function detect(facts: Facts, ctx: DetectContext) {
    const { synoptic, past_24h, location } = facts;
    const low = synoptic.nearest_low;
    const high = synoptic.nearest_high;

    // This pattern is about *surface* wind curling around a low. At upper
    // levels (250h, 500h) the user is looking at jets and ridges, not a
    // surface swirl — defer to those patterns.
    const isSurfaceLevel = ctx.level === 'surface' || ctx.level === '950h' || ctx.level === '850h';
    if (!isSurfaceLevel) {
        return { active: false, confidence: 0, params: null as any };
    }

    const inRange = low.distance_km < 1500;
    const isReallyALow = low.pressure_hPa < 1010;
    const dominantOverHigh =
        low.distance_km < high.distance_km ||
        (high.pressure_hPa - low.pressure_hPa) > 8;

    const active = inRange && isReallyALow && dominantOverHigh;

    let confidence = 0;
    if (inRange) confidence += 0.3;
    if (isReallyALow) confidence += 0.3;
    if (dominantOverHigh) confidence += 0.2;
    // Falling pressure locally reinforces "you're feeling the low's influence."
    if (past_24h.pressure_tendency === 'falling') confidence += 0.2;
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            low,
            hemisphere: (location.lat >= 0 ? 'N' : 'S') as 'N' | 'S',
            pressureChange24h: past_24h.pressure_change_hPa,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    // No map glyphs in v0.1. Windy's wind layer already carries the visualization
    // — the streamline pattern IS the visible swirl. Past iterations added click
    // markers and a "Low" badge, but they read as Windy-native UI rather than
    // plugin-specific. Cleaner: nothing on the map; the side-pane card carries
    // the explanation, with location distance/bearing baked into the prose.
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const compass = compassPhrase(p.low.compass);
    const dist = `${p.low.distance_km.toLocaleString()} km`;
    const rotation = p.hemisphere === 'N' ? 'counterclockwise' : 'clockwise';

    return {
        title: 'Why the wind curls here',
        mechanism:
            `You're looking at wind spiraling around a low-pressure system roughly ` +
            `${dist} ${compass} of you. Air flows inward toward low pressure, but ` +
            `Earth's rotation deflects it (${rotation} in the ${p.hemisphere === 'N' ? 'Northern' : 'Southern'} Hemisphere), so it spirals rather than ` +
            `rushing straight in. Where that rotation lifts moist air, clouds and rain often form.`,
        checkNext: [
            {
                label: 'Toggle Pressure: look for closed contours where the swirl is centered',
                overlay: 'pressure' as WindyOverlay,
            },
            {
                label: 'Toggle Rain: look for bands wrapping around the same point',
                overlay: 'rain' as WindyOverlay,
            },
        ],
        remember:
            'This is model output, not a snapshot of right now. Confidence is highest in the next 24 hours.',
    };
}

function compassPhrase(c: string): string {
    const m: Record<string, string> = {
        N: 'to the north',
        NE: 'to the northeast',
        E: 'to the east',
        SE: 'to the southeast',
        S: 'to the south',
        SW: 'to the southwest',
        W: 'to the west',
        NW: 'to the northwest',
    };
    return m[c] ?? `${c}-ward`;
}

const cyclonic_inflow: PatternModule<Params> = {
    id: 'cyclonic_inflow',
    appliesToLayers: ['wind', 'gust'],
    detect,
    visual,
    content,
};

export default cyclonic_inflow;
