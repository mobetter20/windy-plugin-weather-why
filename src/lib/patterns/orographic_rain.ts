// Pattern: orographic rain — terrain-forced lift wringing out precipitation.
//
// Visible cue: precipitation on the rain / rainAccu / radar layer at a
// location with significant elevation — typically the windward slope of a
// mountain range.
// Trigger layers: 'rain', 'rainAccu', 'radar'.
//
// Mechanism: as wind-driven air hits rising terrain it rises and cools
// adiabatically (~9.8°C/km dry, ~5°C/km once saturated). When it cools to the dew
// point, moisture condenses and falls on the windward slope. The leeward
// side gets the rain shadow — descending air warms and dries.
//
// Detection: elevation > 500m AND precipitation present (forecast > 0.5mm
// OR current > 0.1mm). Confidence steps: 500m → 0.4, 1000m → +0.2,
// 1500m → +0.2, forecast > 5mm → +0.2.

import type { DetectContext, Facts, PatternModule, WindyOverlay } from '../types';

interface Params {
    elevationM: number;
    forecastPrecipMm: number;
    windCompass: string | null;
}

function detect(facts: Facts, _ctx: DetectContext) {
    const elev = facts.surface.elevation_m ?? 0;
    const currentPrecip = facts.surface.precipitation_mm ?? 0;
    const forecastPrecip = facts.forecast_24h.precip_total_mm ?? 0;

    const highEnough = elev > 500;
    const precipPresent = forecastPrecip > 0.5 || currentPrecip > 0.1;

    const active = highEnough && precipPresent;

    let confidence = 0;
    if (elev > 500)  confidence += 0.4;
    if (elev > 1000) confidence += 0.2;
    if (elev > 1500) confidence += 0.2;
    if (forecastPrecip > 5) confidence += 0.2;
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            elevationM: Math.round(elev),
            forecastPrecipMm: forecastPrecip,
            windCompass: facts.surface.wind_compass,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const elev = p.elevationM.toLocaleString();
    const fromPhrase = p.windCompass ? ` from the ${p.windCompass.toLowerCase()}` : '';

    return {
        title: 'Why terrain is squeezing out this rain',
        mechanism:
            `You're at about ${elev}m — high enough for orographic lift. ` +
            `Wind-driven air${fromPhrase} hits the slope, rises, and cools at roughly 6°C per kilometre. ` +
            `When it cools to the dew point, moisture condenses and falls on the windward side. ` +
            `The leeward slope gets the rain shadow: descending air warms back up and clouds thin out.`,
        checkNext: [
            {
                label: 'Toggle Wind: perpendicular flow across the ridge drives the strongest enhancement',
                overlay: 'wind' as WindyOverlay,
            },
        ],
        remember:
            'This effect is strongest with sustained moist onshore flow. ' +
            'Parallel or dry wind produces little orographic rain even at these elevations.',
    };
}

const orographic_rain: PatternModule<Params> = {
    id: 'orographic_rain',
    appliesToLayers: ['rain', 'rainAccu', 'radar'],
    detect,
    visual,
    content,
};

export default orographic_rain;
