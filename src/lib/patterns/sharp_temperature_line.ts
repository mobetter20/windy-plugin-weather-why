// Pattern: sharp temperature line (front or terrain boundary).
//
// Visible cue: a tight color gradient on Windy's temperature layer over a
// short distance.
// Trigger layer: 'temp'.
//
// Mechanism: sharp temperature lines are usually either fronts (where two
// air masses meet) or terrain effects (coastlines, mountain ridges, urban
// heat edges). Real fronts come with TWO signatures: a temperature change
// AND a wind direction shift across the line. Terrain effects can be sharp
// without a wind shift.
//
// Detection (proxy from single-point fetch): we can't measure the gradient
// directly, but a frontal passage in the past 24h leaves clear traces —
// significant wind shift AND significant temperature change. If both, the
// click is in a frontal zone and the layer's sharp boundary makes sense.

import type { DetectContext, Facts, PatternModule } from '../types';

interface Params {
    tempChangeC: number;
    windShiftDeg: number;
    pressureTendency: 'rising' | 'falling' | 'steady';
}

function detect(facts: Facts, _ctx: DetectContext) {
    const tempChg = facts.past_24h.temp_change_C ?? 0;
    const windShift = Math.abs(facts.past_24h.wind_shift_deg ?? 0);
    const tendency = facts.past_24h.pressure_tendency;

    const significantTempChange = Math.abs(tempChg) >= 4;
    const significantWindShift = windShift >= 60;

    // A front passage has BOTH signatures together.
    const active = significantTempChange && significantWindShift;

    let confidence = 0;
    if (significantTempChange) confidence += 0.35;
    if (Math.abs(tempChg) >= 8) confidence += 0.15;
    if (significantWindShift) confidence += 0.3;
    if (windShift >= 120) confidence += 0.1;
    if (tendency === 'falling' || tendency === 'rising') confidence += 0.1;
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            tempChangeC: tempChg,
            windShiftDeg: windShift,
            pressureTendency: tendency,
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const tempDir = p.tempChangeC > 0 ? 'risen' : 'dropped';
    const tempAbs = Math.abs(p.tempChangeC).toFixed(1);
    const shift = Math.round(p.windShiftDeg);

    return {
        title: 'Why this temperature boundary is here',
        mechanism:
            `Sharp temperature lines on this layer are almost always fronts (where two air ` +
            `masses meet) or terrain effects (coasts, mountains, urban heat edges). Real ` +
            `fronts come with TWO signatures: a temperature change AND a wind direction shift. ` +
            `Both are showing here — temperature has ${tempDir} ${tempAbs}°C in the past day, ` +
            `and the wind has shifted about ${shift}°. That's a front signature.`,
        checkNext: [
            {
                label: 'Toggle Wind: see the wind direction shift across the temperature line',
                overlay: 'wind' as const,
            },
            {
                label: 'Toggle Pressure: fronts usually align with a pressure boundary',
                overlay: 'pressure' as const,
            },
        ],
        remember:
            'Temperature on this layer is interpolated model output — sharpness can be ' +
            'exaggerated near coasts. Confirm a front by looking for the wind-shift signature.',
    };
}

const sharp_temperature_line: PatternModule<Params> = {
    id: 'sharp_temperature_line',
    appliesToLayers: ['temp'],
    detect,
    visual,
    content,
};

export default sharp_temperature_line;
