// Pattern: rain in a line (squall / front / convergence zone).
//
// Visible cue: a linear band of rain on Windy's rain or radar layer.
// Trigger layer: 'rain', 'rainAccu', or 'radar'.
//
// Mechanism: linear precipitation marks a convergence boundary — cold front,
// warm front, prefrontal squall line, or sea-breeze front. Air piles up
// along the line, is forced upward, condenses.
//
// Detection: precipitation present (forecast or recent) AND a wind shift in
// the past 24h OR falling pressure (front-passage signatures). We don't try
// to verify "in a line" geometrically from a single-point fetch; the user
// SEES the line on Windy's layer — we just confirm the rain is real and
// frame it as a frontal/convergence story.

import type { DetectContext, Facts, PatternModule } from '../types';

interface Params {
    precipForecastMm: number;
    precipPastMm: number;
    windShiftDeg: number;
    pressureTendency: 'rising' | 'falling' | 'steady';
}

function detect(facts: Facts, _ctx: DetectContext) {
    const fc = facts.forecast_24h.precip_total_mm ?? 0;
    const pst = facts.past_24h.precip_total_mm ?? 0;
    const wShift = Math.abs(facts.past_24h.wind_shift_deg ?? 0);
    const tendency = facts.past_24h.pressure_tendency;
    const currentRain = facts.surface.precipitation_mm ?? 0;

    const hasRain = fc > 0.5 || pst > 0.5 || currentRain > 0.1;
    const active = hasRain;

    let confidence = 0;
    if (hasRain) confidence += 0.35;
    if (fc > 5) confidence += 0.15;
    if (wShift >= 60) confidence += 0.2;     // wind shift = front signature
    if (tendency === 'falling') confidence += 0.2;
    if (tendency === 'rising' && pst > 0.5) confidence += 0.1; // post-frontal recovery
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            precipForecastMm: fc,
            precipPastMm: pst,
            windShiftDeg: wShift,
            pressureTendency: tendency,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, _p: Params) {
    return {
        title: 'Why rain is forming here',
        mechanism:
            `If the rain on this layer looks like a line or band, it's most likely ` +
            `a front or convergence zone — winds from different directions meeting ` +
            `and pushing air upward. Rising air cools, and any moisture condenses ` +
            `into clouds and rain. Linear rain is rarely random; it tracks a boundary.`,
        checkNext: [
            {
                label: 'Toggle Wind: look for opposing wind directions across the rain line',
                overlay: 'wind' as const,
            },
            {
                label: 'Toggle Pressure: see if the rain follows a pressure boundary',
                overlay: 'pressure' as const,
            },
        ],
        remember:
            'Rain on this layer is model forecast. Switch to Radar to see what is ' +
            'currently observed — they often disagree by a few hours of timing.',
    };
}

const rain_in_a_line: PatternModule<Params> = {
    id: 'rain_in_a_line',
    appliesToLayers: ['rain', 'rainAccu', 'radar'],
    detect,
    visual,
    content,
};

export default rain_in_a_line;
