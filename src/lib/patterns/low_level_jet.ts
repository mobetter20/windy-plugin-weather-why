// Pattern: low-level jet (LLJ).
//
// Visible cue: a fast ribbon of wind at ~850 hPa (~1.5 km) — much faster than
// the surface wind beneath it, often strongest overnight. Common over plains.
// Trigger layer: 'wind' at level '850h' (or '925h').
//
// Mechanism: after sunset the surface layer cools and decouples from the flow
// above as friction drops; the 850 hPa wind accelerates into a nocturnal jet
// that transports warm, moist air poleward and can feed overnight storms.
//
// Detection: active wind level is 850h/925h AND 850 hPa wind > ~55 km/h.

import { localHourFromUtc } from '../geo';
import type { DetectContext, Facts, PatternModule } from '../types';

interface Params {
    speedKmh: number;
    directionDeg: number | null;
    nocturnal: boolean;
}

function detect(facts: Facts, ctx: DetectContext) {
    const isLowLevel = ctx.level === '850h' || ctx.level === '925h';
    if (!isLowLevel) {
        return { active: false, confidence: 0, params: null as any };
    }

    const w = facts.upper_air['850hPa'].wind_speed_kmh ?? 0;
    const active = w >= 55;

    const hour = localHourFromUtc(facts.generated_at, facts.location.lon);
    const nocturnal = hour >= 20 || hour < 6;

    let confidence = 0;
    if (w >= 55) confidence += 0.4;
    if (w >= 75) confidence += 0.3;
    if (w >= 95) confidence += 0.2;
    if (nocturnal) confidence += 0.1; // LLJs classically peak overnight
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            speedKmh: w,
            directionDeg: facts.upper_air['850hPa'].wind_direction_deg ?? null,
            nocturnal,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const speed = Math.round(p.speedKmh).toLocaleString();
    return {
        title: 'Why this low-level wind is so fast',
        mechanism:
            `You're looking at a low-level jet — a ribbon of fast wind only about 1.5 km up ` +
            `(the 850 hPa level), moving around ${speed} km/h here. ` +
            `${p.nocturnal ? 'Overnight, as' : 'As'} the surface layer cools and decouples from ` +
            `the flow above, friction lets go and this level accelerates. The jet pumps warm, ` +
            `moist air poleward — fuel that often feeds thunderstorms downwind after dark.`,
        checkNext: [
            {
                label: 'Toggle CAPE: low-level jets feed moisture into overnight storm fuel',
                overlay: 'cape' as const,
            },
            {
                label: 'Toggle Wind at the surface: it is usually much calmer than this level',
                overlay: 'wind' as const,
            },
        ],
        remember:
            'Low-level jets peak overnight and ease after sunrise as the surface re-couples. ' +
            'The surface below can be nearly calm while this level races.',
    };
}

const low_level_jet: PatternModule<Params> = {
    id: 'low_level_jet',
    appliesToLayers: ['wind', 'gust'],
    detect,
    visual,
    content,
};

export default low_level_jet;
