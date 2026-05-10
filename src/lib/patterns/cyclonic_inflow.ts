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

import type { Facts, PatternModule, PressureFeature, WindyOverlay } from '../types';

interface Params {
    low: PressureFeature;
    hemisphere: 'N' | 'S';
    pressureChange24h: number | null;
}

function detect(facts: Facts) {
    const { synoptic, past_24h, location } = facts;
    const low = synoptic.nearest_low;
    const high = synoptic.nearest_high;

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

function visual(map: any, facts: Facts, params: Params): () => void {
    // No persistent map glyphs — Windy's wind layer carries the visualization.
    // We add only:
    //   1. A subtle dot at the click point so the user knows where the card refers to.
    //   2. A soft, pulsing "Low" annotation at the low's actual location while the
    //      card is open. Removed when card closes / next click runs.
    const created: any[] = [];

    const clickDot = new L.CircleMarker(
        [facts.location.lat, facts.location.lon],
        {
            radius: 6,
            color: '#2a4a6e',
            weight: 2,
            fillColor: '#ffffff',
            fillOpacity: 1,
            interactive: false,
        },
    ).addTo(map);
    created.push(clickDot);

    const lowMarker = new L.Marker(
        { lat: params.low.lat, lng: params.low.lon },
        {
            icon: new L.DivIcon({
                className: 'ww-low-icon',
                html: '<div class="ww-low"><span class="ww-low-glyph">↻</span><span class="ww-low-label">Low</span></div>',
                iconSize: [56, 28],
                iconAnchor: [28, 14],
            }),
            interactive: false,
        },
    ).addTo(map);
    created.push(lowMarker);

    return () => {
        for (const item of created) item.remove();
    };
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
