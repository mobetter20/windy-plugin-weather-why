// Pattern: strong wind in a tight pressure gradient.
//
// Visible cue: a region of fast/saturated wind streamlines on Windy's wind
// layer, often along coasts or between adjacent high and low systems.
// Trigger layer: 'wind' (and 'gust', which shares streamlines).
//
// Mechanism: wind speed scales with the pressure gradient — how quickly
// pressure changes across distance. Where isobars pack together, air rushes
// faster from high toward low.
//
// Detection: surface wind ≥ 30 km/h AND regional MSL pressure span ≥ 12 hPa
// across the ±4.5° box. Yields to cyclonic_inflow if a real low (<1010 hPa)
// is within 1500 km — that's a more specific story.

import type { DetectContext, Facts, PatternModule } from '../types';

interface Params {
    windSpeedKmh: number;
    gustKmh: number | null;
    pressureSpanHPa: number;
    boxSizeKm: number; // approximate side of the regional grid box at this latitude
}

function detect(facts: Facts, ctx: DetectContext) {
    const isSurfaceLevel = ctx.level === 'surface' || ctx.level === '950h' || ctx.level === '850h';
    if (!isSurfaceLevel) {
        return { active: false, confidence: 0, params: null as any };
    }

    const wind = facts.surface.wind_speed_kmh ?? 0;
    const [pmin, pmax] = facts.synoptic.grid_msl_pressure_hPa_min_max;
    const span = isFinite(pmax - pmin) ? pmax - pmin : 0;

    // If a real low is nearby, defer to cyclonic_inflow — that's the better story.
    const lowDominant =
        facts.synoptic.nearest_low.distance_km < 1500 &&
        facts.synoptic.nearest_low.pressure_hPa < 1010;
    if (lowDominant) {
        return { active: false, confidence: 0, params: null as any };
    }

    const isStrong = wind >= 30;
    const isTight = span >= 12;
    const active = isStrong && isTight;

    let confidence = 0;
    if (wind >= 30) confidence += 0.25;
    if (wind >= 50) confidence += 0.15;
    if (span >= 12) confidence += 0.3;
    if (span >= 20) confidence += 0.2;
    confidence = Math.min(confidence, 1);

    // The grid box is ~9° (±4.5°) at the equator → ~1000 km. Shrinks toward
    // the poles by cos(lat). Rough is fine; the explanation rounds anyway.
    const cosLat = Math.cos((facts.location.lat * Math.PI) / 180);
    const boxSizeKm = Math.round(9 * 111 * Math.max(cosLat, 0.3));

    return {
        active,
        confidence,
        params: {
            windSpeedKmh: wind,
            gustKmh: facts.surface.wind_gust_kmh,
            pressureSpanHPa: Math.round(span * 10) / 10,
            boxSizeKm,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const span = p.pressureSpanHPa.toLocaleString();
    const speed = Math.round(p.windSpeedKmh).toLocaleString();
    const boxKm = p.boxSizeKm.toLocaleString();

    return {
        title: 'Why the wind is so strong here',
        mechanism:
            `Wind speed scales with the pressure gradient — how quickly pressure changes ` +
            `across distance. The pressure across this region varies by about ${span} hPa ` +
            `over roughly ${boxKm} km, which is a tight squeeze. Where isobars pack ` +
            `together, air rushes faster from high pressure toward low. ` +
            `That's why surface wind here is around ${speed} km/h.`,
        checkNext: [
            {
                label: 'Toggle Pressure: look for closely-spaced contours where the wind is strongest',
                overlay: 'pressure' as const,
            },
            {
                label: 'Toggle Gust: peak gusts run 30–50% higher than sustained wind',
                overlay: 'gust' as const,
            },
        ],
        remember:
            'Sustained wind is averaged over ~10 minutes; gusts are short peaks. ' +
            'Mountains and rough terrain inflate gusts further.',
    };
}

const tight_gradient: PatternModule<Params> = {
    id: 'tight_gradient',
    appliesToLayers: ['wind', 'gust'],
    detect,
    visual,
    content,
};

export default tight_gradient;
