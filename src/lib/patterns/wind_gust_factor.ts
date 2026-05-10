// Pattern: gust factor — gusts significantly exceed sustained wind.
//
// Visible cue: the gust layer shows notably higher values than the sustained
// wind layer across the same area.
// Trigger layer: 'gust'.
//
// Mechanism: sustained wind is a ~10-minute average; gusts are short peaks
// punching through that mean. Gust factors ~1.5 are typical at moderate speeds,
// ~1.2 in strong winds. Mountains and rough terrain amplify the factor.
//
// Detection: gust > sustained × 1.4 AND sustained ≥ 5 km/h (ratio is
// unstable at near-calm speeds). Confidence scales with the gust ratio.

import type { DetectContext, Facts, PatternModule, WindyOverlay } from '../types';

interface Params {
    sustainedKmh: number;
    gustKmh: number;
    gustFactor: number;
    roughTerrain: boolean; // inferred: factor > 1.6 suggests rough surface or turbulent BL
}

function detect(facts: Facts, _ctx: DetectContext) {
    const sustained = facts.surface.wind_speed_kmh;
    const gust = facts.surface.wind_gust_kmh;

    if (sustained == null || gust == null || sustained < 5) {
        return { active: false, confidence: 0, params: null as any };
    }

    const ratio = gust / sustained;
    const active = ratio > 1.4;

    let confidence = 0;
    if (ratio > 1.4) confidence += 0.4;
    if (ratio > 1.5) confidence += 0.3;
    if (ratio > 1.7) confidence += 0.3;
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            sustainedKmh: Math.round(sustained),
            gustKmh: Math.round(gust),
            gustFactor: Math.round(ratio * 10) / 10,
            roughTerrain: ratio > 1.6,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const terrainNote = p.roughTerrain
        ? ` A factor of ${p.gustFactor} suggests rough terrain or a turbulent boundary layer is inflating the peaks.`
        : '';

    return {
        title: 'Why gusts are so much stronger than the sustained wind',
        mechanism:
            `Sustained wind is a ~10-minute average; gusts are short bursts punching through that mean. ` +
            `Here, sustained is ${p.sustainedKmh} km/h and gusts reach ${p.gustKmh} km/h — ` +
            `a gust factor of ${p.gustFactor}.${terrainNote} ` +
            `Eddies, surface friction, and convective mixing all feed the peaks.`,
        checkNext: [
            {
                label: 'Toggle Wind: compare the sustained speed across the same area',
                overlay: 'wind' as WindyOverlay,
            },
        ],
        remember:
            'Gust forecasts are noisier than mean wind. Exact peak values are model estimates, not sensor readings.',
    };
}

const wind_gust_factor: PatternModule<Params> = {
    id: 'wind_gust_factor',
    appliesToLayers: ['gust'],
    detect,
    visual,
    content,
};

export default wind_gust_factor;
