// Pattern: CAPE present but the sky is quiet.
//
// Visible cue: a colored CAPE region on Windy's CAPE layer, with no rain
// echoes or radar returns inside it.
// Trigger layer: 'cape'.
//
// Mechanism: CAPE measures how much energy a rising air parcel could release
// IF something pushes it high enough. It's the *fuel*, not the trigger. Often
// a "cap" of warmer air aloft (CIN) suppresses convection even when fuel is
// abundant.
//
// Detection: layer is 'cape', local CAPE ≥ 1000 J/kg (significant), AND
// no significant current/forecast precipitation here (storms aren't actively
// firing). If storms ARE firing, the story is different (we'd have a separate
// "CAPE being tapped" pattern in v2).

import type { DetectContext, Facts, PatternModule } from '../types';

interface Params {
    capeJkg: number;
    severity: 'moderate' | 'strong' | 'extreme';
}

function detect(facts: Facts, _ctx: DetectContext) {
    const cape = facts.instability.cape_jkg ?? 0;
    const currentPrecip = facts.surface.precipitation_mm ?? 0;
    const forecastPrecip = facts.forecast_24h.precip_total_mm ?? 0;

    const significantCape = cape >= 1000;
    const noStorms = currentPrecip < 0.5 && forecastPrecip < 1.0;

    const active = significantCape && noStorms;

    let confidence = 0;
    if (cape >= 1000) confidence += 0.3;
    if (cape >= 2500) confidence += 0.3;
    if (cape >= 4000) confidence += 0.2;
    if (noStorms) confidence += 0.2;
    confidence = Math.min(confidence, 1);

    const severity: Params['severity'] =
        cape >= 4000 ? 'extreme' : cape >= 2500 ? 'strong' : 'moderate';

    return {
        active,
        confidence,
        params: { capeJkg: cape, severity } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const cape = Math.round(p.capeJkg).toLocaleString();
    const severityWord =
        p.severity === 'extreme'
            ? 'extreme'
            : p.severity === 'strong'
              ? 'strong'
              : 'meaningful';

    return {
        title: "Why this CAPE isn't producing storms",
        mechanism:
            `CAPE is the energy a rising air parcel could release IF something pushed it ` +
            `high enough to break free. A reading of ${cape} J/kg is ${severityWord}: the ` +
            `atmosphere here is unstable. But CAPE is just *fuel* — a storm needs a *trigger*: ` +
            `a front, sea breeze, or terrain lifting. Often a 'cap' of warmer air aloft suppresses ` +
            `the lift even when fuel is plentiful.`,
        checkNext: [
            {
                label: 'Toggle Wind: look for a front or sea-breeze line that could trigger storms',
                overlay: 'wind' as const,
            },
            {
                label: "Toggle Radar: confirm there really aren't storms now",
                overlay: 'radar' as const,
            },
        ],
        remember:
            'CAPE alone forecasts nothing. High CAPE + a trigger = severe weather; ' +
            'high CAPE + a strong cap = a sweltering quiet day.',
    };
}

const cape_no_storms: PatternModule<Params> = {
    id: 'cape_no_storms',
    appliesToLayers: ['cape'],
    detect,
    visual,
    content,
};

export default cape_no_storms;
