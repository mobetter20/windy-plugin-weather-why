// Pattern: haze or dust plume visible on an air-quality layer.
//
// Visible cue: colored blobs on Windy's cAQI, pm2p5, pm10, or dust layer.
// Trigger layers: 'cAQI', 'pm2p5', 'pm10', 'dust'.
//
// Mechanism: aerosols are carried downwind from source regions — deserts,
// wildfires, industrial belts. The plume shape on the map IS the lower-
// tropospheric wind trajectory over the past few days.
//
// Detection: PM2.5 ≥ 35 µg/m³ (EPA "moderate" threshold) OR PM10 ≥ 80 µg/m³.
// Confidence scales with concentration: higher PM = clearer plume signal.

import type { DetectContext, Facts, PatternModule, WindyOverlay } from '../types';

interface Params {
    pm2_5: number | null;
    pm10: number | null;
    category: 'moderate' | 'unhealthy_sensitive' | 'unhealthy';
}

function detect(facts: Facts, _ctx: DetectContext) {
    const pm2 = facts.air_quality.pm2_5 ?? 0;
    const pm10 = facts.air_quality.pm10 ?? 0;

    const abovePm2 = pm2 >= 35;
    const abovePm10 = pm10 >= 80;
    const active = abovePm2 || abovePm10;

    let confidence = 0;
    if (active) confidence += 0.4;
    // EPA "unhealthy for sensitive groups": PM2.5 ≥ 55, PM10 ≥ 155
    if (pm2 >= 55 || pm10 >= 155) confidence += 0.3;
    // EPA "unhealthy": PM2.5 ≥ 150, PM10 ≥ 254
    if (pm2 >= 150 || pm10 >= 254) confidence += 0.3;
    confidence = Math.min(confidence, 1);

    const category: Params['category'] =
        pm2 >= 150 || pm10 >= 254
            ? 'unhealthy'
            : pm2 >= 55 || pm10 >= 155
              ? 'unhealthy_sensitive'
              : 'moderate';

    return {
        active,
        confidence,
        params: {
            pm2_5: facts.air_quality.pm2_5,
            pm10: facts.air_quality.pm10,
            category,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const pm2Str = p.pm2_5 != null ? `${Math.round(p.pm2_5)} µg/m³` : null;
    const pm10Str = p.pm10 != null ? `${Math.round(p.pm10)} µg/m³` : null;

    const readingPhrase =
        pm2Str != null
            ? `PM2.5 here is ${pm2Str}${pm10Str != null ? ` (PM10: ${pm10Str})` : ''}.`
            : pm10Str != null
              ? `PM10 here is ${pm10Str}.`
              : 'Particulate levels are elevated here.';

    const categoryPhrase =
        p.category === 'unhealthy'
            ? 'These levels are unhealthy for everyone.'
            : p.category === 'unhealthy_sensitive'
              ? 'These levels are unhealthy for sensitive groups.'
              : 'These levels are in the moderate range — worth noting, not yet alarming.';

    return {
        title: 'Why the air looks hazy here',
        mechanism:
            `${readingPhrase} ${categoryPhrase} ` +
            `Aerosols travel at low altitudes on the prevailing wind — the colored plume on this ` +
            `layer traces the transport path from the source. Sources are typically deserts, ` +
            `wildfires, or industrial belts hundreds to thousands of kilometres upwind.`,
        checkNext: [
            {
                label: 'Toggle Wind: follow the flow upwind to find the source region',
                overlay: 'wind' as WindyOverlay,
            },
        ],
        remember:
            'This layer is model output (CAMS-style reanalysis), coarser than the wind layer. ' +
            'Local air-quality stations are more reliable for ground truth.',
    };
}

const haze_dust_plume: PatternModule<Params> = {
    id: 'haze_dust_plume',
    appliesToLayers: ['cAQI', 'pm2p5', 'pm10', 'dust'],
    detect,
    visual,
    content,
};

export default haze_dust_plume;
