// Pattern: clouds without rain — radar/satellite mismatch and cloud shield.
//
// Visible cue: cloud cover visible on the satellite, clouds, or cloudtop
// layer (or implied by overcast conditions on radar) where the rain layer
// shows little or nothing.
// Trigger layers: 'radar', 'satellite', 'clouds', 'cloudtop'.
//
// Mechanism: satellite/cloudtop sees cloud TOPS; radar sees hydrometeors
// (raindrops, snowflakes) in the column. They observe different things,
// not the same thing imperfectly. Clouds without rain are common — high
// cirrus too thin to precipitate, OR rain falling but evaporating in dry
// air below cloud base (virga).
//
// Detection: active layer is radar/satellite/clouds/cloudtop, AND cloud
// cover ≥ 60%, AND current/forecast precipitation is negligible.

import type { DetectContext, Facts, PatternModule } from '../types';

interface Params {
    cloudCoverPct: number;
    isOnRadar: boolean;
    isOnSatellite: boolean;
    isOnClouds: boolean;  // true for 'clouds' or 'cloudtop'
}

function detect(facts: Facts, ctx: DetectContext) {
    const layer = ctx.activeLayer;
    const isCloudLayer = layer === 'clouds' || layer === 'cloudtop';
    if (layer !== 'radar' && layer !== 'satellite' && !isCloudLayer) {
        return { active: false, confidence: 0, params: null as any };
    }

    const clouds = facts.surface.cloud_cover_pct ?? 0;
    const currentPrecip = facts.surface.precipitation_mm ?? 0;
    const forecastPrecip = facts.forecast_24h.precip_total_mm ?? 0;

    const lotsOfClouds = clouds >= 60;
    const noRain = currentPrecip < 0.3 && forecastPrecip < 1.0;

    const active = lotsOfClouds && noRain;

    let confidence = 0;
    if (lotsOfClouds) confidence += 0.4;
    if (clouds >= 85) confidence += 0.2;
    if (noRain) confidence += 0.3;
    if (currentPrecip === 0 && forecastPrecip === 0) confidence += 0.1;
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            cloudCoverPct: clouds,
            isOnRadar: layer === 'radar',
            isOnSatellite: layer === 'satellite',
            isOnClouds: isCloudLayer,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const clouds = Math.round(p.cloudCoverPct);

    const mechanism = p.isOnClouds
        ? `Sky cover here is about ${clouds}%. No significant rain is reaching the ground. ` +
          `The most common explanation is virga: rain falls from cloud base and evaporates ` +
          `in dry air before it reaches the surface. ` +
          `High cirrus — too thin or cold to precipitate — is the other main cause.`
        : `Satellite sees cloud TOPS. Radar sees hydrometeors — raindrops, snowflakes — ` +
          `in the column. They observe different things, not the same thing imperfectly. ` +
          `Right here, sky cover is about ${clouds}% but no significant rain is reaching the ground. ` +
          `Likely explanations: high cirrus too thin or cold to precipitate, OR rain falling ` +
          `but evaporating in dry air below cloud base — that's called *virga*.`;

    const checkNext = p.isOnRadar
        ? [
              {
                  label: 'Toggle Satellite: see the cloud structure that radar misses entirely',
                  overlay: 'satellite' as const,
              },
              {
                  label: 'Toggle Rain: see the model forecast — virga shows up there as light or zero',
                  overlay: 'rain' as const,
              },
          ]
        : p.isOnClouds
          ? [
                {
                    label: 'Toggle Radar: confirm no rain is reaching the surface under these clouds',
                    overlay: 'radar' as const,
                },
                {
                    label: 'Toggle Satellite: see the full cloud structure from above',
                    overlay: 'satellite' as const,
                },
            ]
          : [
                {
                    label: 'Toggle Radar: confirm the rain layer is empty under these clouds',
                    overlay: 'radar' as const,
                },
                {
                    label: 'Toggle Rain: compare with the model forecast for here',
                    overlay: 'rain' as const,
                },
            ];

    const remember = p.isOnClouds
        ? 'Virga is common in dry continental air — rain starts but evaporates before landing. ' +
          'Neither the cloud layer nor the radar layer is wrong; they measure different things.'
        : 'Both layers are observations, but of different things — neither is wrong. ' +
          'Disagreements between them often teach you about humidity in the atmosphere.';

    return {
        title: "Why these clouds don't show as rain",
        mechanism,
        checkNext,
        remember,
    };
}

const radar_satellite_mismatch: PatternModule<Params> = {
    id: 'radar_satellite_mismatch',
    appliesToLayers: ['radar', 'satellite', 'clouds', 'cloudtop'],
    detect,
    visual,
    content,
};

export default radar_satellite_mismatch;
