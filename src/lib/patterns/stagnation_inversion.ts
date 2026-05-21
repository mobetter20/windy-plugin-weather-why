// Pattern: stagnation / inversion (local pollution build-up).
//
// Visible cue: elevated particulates on an air-quality layer that sit over an
// area rather than streaming from an upwind source. Trigger layers: aqi,
// PM2.5.
//
// Mechanism: a high parked overhead makes air sink and surface winds go light,
// often with a temperature inversion capping the lowest layer like a lid. With
// nothing to flush or lift it, pollution accumulates day after day.
//
// Detection: light surface wind AND high / non-falling pressure. Elevated PM
// and low CAPE (a stable, capped atmosphere) raise confidence. Complements
// haze_dust_plume, which keys on transport (wind) — opposite wind conditions,
// so the two partition naturally.

import type { DetectContext, Facts, PatternModule } from '../types';

interface Params {
    windSpeedKmh: number;
    pressureHPa: number | null;
    pm25: number | null;
}

function detect(facts: Facts, _ctx: DetectContext) {
    const wind = facts.surface.wind_speed_kmh ?? 999;
    const p = facts.surface.pressure_msl_hPa;
    const cape = facts.instability.cape_jkg ?? 0;
    const pm = facts.air_quality.pm2_5;
    const tendency = facts.past_24h.pressure_tendency;

    const lightWind = wind < 10;
    const highPressure = p != null && p > 1016;
    const notVentilating = tendency !== 'falling'; // a falling high is breaking down

    const active = lightWind && (highPressure || notVentilating);

    let confidence = 0;
    if (lightWind) confidence += 0.4;
    if (wind < 5) confidence += 0.15;
    if (highPressure) confidence += 0.25;
    if (cape < 200) confidence += 0.1; // stable / capped
    if (pm != null && pm > 25) confidence += 0.1; // pollution actually building
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: { windSpeedKmh: Math.round(wind), pressureHPa: p, pm25: pm } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const windPhrase = p.windSpeedKmh < 5 ? 'nearly calm' : `light (about ${p.windSpeedKmh} km/h)`;
    const pmPhrase = p.pm25 != null ? ` PM2.5 here is around ${Math.round(p.pm25)} µg/m³.` : '';
    return {
        title: 'Why the air is stagnating here',
        mechanism:
            `This looks like stagnation, not a plume blown in from somewhere else. A high-pressure ` +
            `system overhead makes air sink and the surface wind go ${windPhrase}, often with a ` +
            `temperature inversion capping the lowest layer like a lid. With nothing to flush it ` +
            `sideways or lift it away, pollution builds up day after day.${pmPhrase}`,
        checkNext: [
            {
                label: "Toggle Wind: confirm it's light — there's nothing to ventilate the air",
                overlay: 'wind' as const,
            },
            {
                label: 'Toggle Pressure: look for the high parked overhead',
                overlay: 'pressure' as const,
            },
        ],
        remember:
            'Stagnation breaks when a front, stronger wind, or strong daytime mixing arrives. ' +
            'Until then concentrations keep climbing — often worst in the calm early morning.',
    };
}

const stagnation_inversion: PatternModule<Params> = {
    id: 'stagnation_inversion',
    appliesToLayers: ['aqi', 'pm2p5'],
    detect,
    visual,
    content,
};

export default stagnation_inversion;
