// Pattern: wintry mix — precipitation falling with the surface temperature near
// freezing, where the precip type (rain / freezing rain / sleet / snow) hangs in
// the balance. Trigger layers: 'rain', 'rainAccu', 'radar', 'temp'.
//
// Mechanism: which form precipitation takes is decided in the last few hundred
// metres above the ground. Around 0 °C a shallow warm or cold layer aloft —
// invisible at the surface — flips rain to sleet to freezing rain to snow.
// Freezing rain (liquid drops that freeze on contact with a sub-freezing
// surface) is the dangerous one: clear ice on roads, trees, and power lines.
//
// Detection: surface temperature in roughly -2…+3 °C AND precipitation present
// (current or forecast). Confidence is highest right at the 0 °C rain/snow line.
//
// Dispatch note: shares rain/rainAccu/radar with rain_in_a_line + orographic_rain
// and temp with sharp_temperature_line. It is registered BEFORE those in MODULES
// so that in the genuinely-wintry core zone (where confidences can tie at 1.0) it
// wins the highest-confidence tie-break — a snowy mountain pass should read as a
// freezing-rain hazard, not "terrain squeezing out rain". heat_dome can't
// conflict (it needs temp > 24 °C).

import type { DetectContext, Facts, PatternModule, WindyOverlay } from '../types';

interface Params {
    tempC: number;
    currentPrecipMm: number;
    forecastPrecipMm: number;
}

function detect(facts: Facts, _ctx: DetectContext) {
    const temp = facts.surface.temperature_C;
    const current = facts.surface.precipitation_mm ?? 0;
    const forecast = facts.forecast_24h.precip_total_mm ?? 0;

    if (temp == null) {
        return { active: false, confidence: 0, params: null as any };
    }

    const nearFreezing = temp >= -2 && temp <= 3;
    const precipPresent = current > 0.1 || forecast > 0.5;
    const active = nearFreezing && precipPresent;

    let confidence = 0;
    if (nearFreezing) confidence += 0.4;
    if (precipPresent) confidence += 0.3;
    // The core mix zone (right on the 0°C line) is the headline, weighted so a
    // genuinely-wintry click sums *past* 1.0 and clamps to EXACTLY 1.0 below. That
    // matters on rain/radar layers shared with orographic_rain: it also peaks at
    // 1.0 there, and since MODULES order breaks the tie (and wintry_mix is first),
    // wintry must hit a clean 1.0 — not 0.999… from float dust, which would lose.
    if (temp >= -1 && temp <= 2) confidence += 0.3;
    if (forecast > 3) confidence += 0.1;
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            tempC: temp,
            currentPrecipMm: current,
            forecastPrecipMm: forecast,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const tempStr = p.tempC.toFixed(p.tempC % 1 === 0 ? 0 : 1);

    return {
        title: 'Why this could be rain, snow, or ice',
        mechanism:
            `It's about ${tempStr}°C here with precipitation falling — right on the knife-edge between ` +
            `rain and snow. Which one reaches the ground is decided in the last few hundred metres: a ` +
            `shallow warm or cold layer aloft, invisible at the surface, flips rain to sleet to snow. ` +
            `The dangerous case is freezing rain — drops that stay liquid on the way down, then freeze ` +
            `on contact with a sub-freezing surface, glazing roads and power lines with clear ice.`,
        checkNext: [
            {
                label: 'Toggle Temperature: watch the 0°C line — it decides rain vs snow',
                overlay: 'temp' as WindyOverlay,
            },
            {
                label: 'Toggle Radar: see what is actually reaching the ground right now',
                overlay: 'radar' as WindyOverlay,
            },
        ],
        remember:
            'Precip type is acutely sensitive to a degree or two, and to a vertical temperature profile ' +
            'the surface reading cannot show. Near freezing, treat the forecast type as "could be any of ' +
            'rain, sleet, snow, or ice".',
    };
}

const wintry_mix: PatternModule<Params> = {
    id: 'wintry_mix',
    appliesToLayers: ['rain', 'rainAccu', 'radar', 'temp'],
    detect,
    visual,
    content,
};

export default wintry_mix;
