// Pattern: jet stream.
//
// Visible cue: a long, narrow ribbon of very fast wind on Windy's wind layer
// at upper levels (typically 300h or 250h, the tropopause level where the
// polar/subtropical jets sit).
// Trigger layer: 'wind' at level '300h' or '250h'.
//
// Mechanism: jets form along sharp horizontal temperature gradients near the
// tropopause; thermal-wind acceleration means the bigger the contrast, the
// faster the jet. They steer surface storms downstream and decide what
// weather rolls toward you next.
//
// Detection: active wind level is 300h or 250h, AND jet wind speed > 100 km/h.

import type { DetectContext, Facts, PatternModule } from '../types';

interface Params {
    speedKmh: number;
    directionDeg: number | null;
    level: string;
}

function detect(facts: Facts, ctx: DetectContext) {
    const isUpperLevel = ctx.level === '250h' || ctx.level === '300h' || ctx.level === '200h';
    if (!isUpperLevel) {
        return { active: false, confidence: 0, params: null as any };
    }

    const jet = facts.upper_air['250hPa_jet'];
    const speed = jet.wind_speed_kmh ?? 0;

    const active = speed >= 100;

    let confidence = 0;
    if (speed >= 100) confidence += 0.4;
    if (speed >= 150) confidence += 0.3;
    if (speed >= 200) confidence += 0.2;
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            speedKmh: speed,
            directionDeg: jet.wind_direction_deg ?? null,
            level: ctx.level,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const speed = Math.round(p.speedKmh).toLocaleString();
    return {
        title: 'Why this band of fast wind is here',
        mechanism:
            `You're looking at a jet stream — a narrow ribbon of fast wind near the ` +
            `top of the troposphere, around 10 km altitude (about 30,000 ft). Jets form ` +
            `along sharp horizontal temperature contrasts in the upper atmosphere, typically ` +
            `between cold polar air and warmer mid-latitude air. The stronger the contrast, ` +
            `the faster the jet — about ${speed} km/h here. Jets steer surface storms downstream.`,
        checkNext: [
            {
                label: 'Toggle Wind at surface: see what weather is moving along the jet\'s path',
                overlay: 'wind' as const,
            },
            {
                label: 'Toggle Pressure: surface lows often deepen on the south/equatorward side of fast jet streaks',
                overlay: 'pressure' as const,
            },
        ],
        remember:
            'Your surface weather usually arrives from the jet\'s upstream side. ' +
            'Watch what is a day or two upwind to anticipate tomorrow.',
    };
}

const jet_stream: PatternModule<Params> = {
    id: 'jet_stream',
    appliesToLayers: ['wind', 'gust'],
    detect,
    visual,
    content,
};

export default jet_stream;
