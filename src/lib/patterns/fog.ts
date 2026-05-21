// Pattern: fog / dense mist — visibility cut by suspended water droplets.
//
// Visible cue: very low values on Windy's visibility layer, or high coverage on
// the dedicated fog layer. Trigger layers: 'visibility' and 'fog'.
//
// Mechanism: fog is a cloud touching the ground. When near-surface air cools to
// its dew point, water vapour condenses into droplets. Two common routes:
// radiation fog (clear, calm nights radiate heat away, chilling the surface air)
// and advection fog (warm, moist air drifts over a cooler surface — classically
// onshore over cold coastal water). Light wind is essential: calm air lets fog
// form and linger, a stiff breeze mixes it out, strong sun burns it off.
//
// Detection: surface visibility < 1000 m (fog) AND humidity >= 90% (water, not
// dust/haze) AND wind <= 20 km/h (fog doesn't survive strong mixing). Confidence
// scales with how low the visibility and how saturated the air.

import { angularDiff, localHourFromUtc } from '../geo';
import type { DetectContext, Facts, PatternModule, WindyOverlay } from '../types';

type FogType = 'radiation' | 'advection' | 'general';

interface Params {
    visibilityM: number;
    humidityPct: number | null;
    windKmh: number;
    type: FogType;
}

function detect(facts: Facts, _ctx: DetectContext) {
    const vis = facts.surface.visibility_m;
    const humidity = facts.surface.humidity_pct;
    const wind = facts.surface.wind_speed_kmh;

    // visibility_m is genuinely often null inland / on older model runs — without
    // it (or wind) there's no fog story to tell, so stay quiet rather than guess.
    if (vis == null || wind == null) {
        return { active: false, confidence: 0, params: null as any };
    }

    const isFoggy = vis < 1000;
    const humid = humidity != null && humidity >= 90;
    const calm = wind <= 20;
    const active = isFoggy && humid && calm;

    let confidence = 0;
    if (isFoggy) confidence += 0.4;
    if (vis < 400) confidence += 0.2; // dense fog
    if (humid) confidence += 0.2;
    if (humidity != null && humidity >= 95) confidence += 0.1;
    if (calm) confidence += 0.1;
    confidence = Math.min(confidence, 1);

    // Classify the formation route for the copy. Advection wins if the air is
    // coming off the water; otherwise a clear overnight sky points to radiation.
    const { geo, surface, location, generated_at } = facts;
    const oceanBearing = geo.ocean_bearing_deg;
    const onshore =
        geo.ocean_nearby_compass != null &&
        oceanBearing != null &&
        surface.wind_direction_deg != null
            ? Math.abs(angularDiff(surface.wind_direction_deg, oceanBearing)) < 90
            : false;
    const hour = localHourFromUtc(generated_at, location.lon);
    const overnight = hour >= 20 || hour < 9; // forms overnight, burns off mid-morning
    const clear = (surface.cloud_cover_pct ?? 100) < 40;
    const type: FogType = onshore ? 'advection' : clear && overnight ? 'radiation' : 'general';

    return {
        active,
        confidence,
        params: {
            visibilityM: Math.round(vis),
            humidityPct: humidity,
            windKmh: Math.round(wind),
            type,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const visPhrase =
        p.visibilityM < 400
            ? `Visibility here is only about ${p.visibilityM} m — dense fog.`
            : `Visibility here is about ${(p.visibilityM / 1000).toFixed(1)} km — fog.`;

    const routePhrase =
        p.type === 'advection'
            ? `This looks like advection fog: humid air is drifting in off the water onto a cooler ` +
              `surface, chilling until it condenses. It can sit for hours and doesn't need night to form.`
            : p.type === 'radiation'
              ? `This looks like radiation fog: under clear skies overnight the ground radiates its heat ` +
                `away, cooling the air just above it to the dew point. It usually burns off a few hours after sunrise.`
              : `Humid air near the surface has cooled to its dew point, condensing into cloud at ground level.`;

    const windPhrase = p.windKmh <= 5 ? 'nearly calm' : `light (about ${p.windKmh} km/h)`;

    return {
        title: 'Why visibility is dropping here',
        mechanism:
            `${visPhrase} Fog is simply a cloud touching the ground: when near-surface air cools to ` +
            `its dew point, water vapour condenses into droplets. ${routePhrase} Wind here is ` +
            `${windPhrase} — calm air lets fog form and linger; a stiff breeze would mix it out.`,
        checkNext: [
            {
                label: 'Toggle Wind: fog needs light wind — confirm it is calm here',
                overlay: 'wind' as WindyOverlay,
            },
            {
                label: 'Toggle Temperature: fog forms where the air has cooled to its dew point',
                overlay: 'temp' as WindyOverlay,
            },
        ],
        remember:
            'Visibility and fog are model output, and fog is especially hard to model — it forms and ' +
            'burns off on local scales the model can miss. Trust your eyes over the layer here.',
    };
}

const fog: PatternModule<Params> = {
    id: 'fog',
    appliesToLayers: ['visibility', 'fog'],
    detect,
    visual,
    content,
};

export default fog;
