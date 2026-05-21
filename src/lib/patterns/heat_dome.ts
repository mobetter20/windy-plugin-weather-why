// Pattern: heat dome / blocking high (a persistent ridge building heat).
//
// Visible cue: broad, building warmth on the temperature layer — or a large,
// dominant high on the pressure layer — that sits in place for days. Trigger
// layers: 'temp', 'pressure'.
//
// Mechanism: a strong high-pressure ridge (tall 500 hPa heights) makes air sink
// and compress, warming it; skies clear so the sun bakes the surface, and the
// same subsidence caps convection so there's no thunderstorm relief. Ridges are
// persistent, so heat accumulates day after day until the pattern breaks.
//
// Detection: a dominant, strong nearest-high + warm surface + clear or capped
// (low CAPE). Tall 500 hPa geopotential heights raise confidence. The warmth
// gate keeps it off cold winter highs (a different, non-heat story).

import type { DetectContext, Facts, PatternModule } from '../types';

interface Params {
    highPressureHPa: number;
    tempC: number | null;
    h500m: number | null;
}

function detect(facts: Facts, _ctx: DetectContext) {
    const { synoptic, surface, instability, upper_air } = facts;
    const high = synoptic.nearest_high;
    const low = synoptic.nearest_low;

    if (!Number.isFinite(high.pressure_hPa)) {
        return { active: false, confidence: 0, params: null as any };
    }

    const strongHigh = high.pressure_hPa > 1018;
    const highDominant =
        high.distance_km < low.distance_km || high.pressure_hPa - low.pressure_hPa > 8;
    const temp = surface.temperature_C;
    const warm = temp != null && temp > 24;
    const clear = (surface.cloud_cover_pct ?? 100) < 40;
    const capped = (instability.cape_jkg ?? 0) < 500;
    const h500 = upper_air['500hPa'].geopotential_height_m;
    const ridge = h500 != null && h500 > 5850;

    const active = strongHigh && highDominant && warm && (clear || capped);

    let confidence = 0;
    if (strongHigh) confidence += 0.3;
    if (highDominant) confidence += 0.2;
    if (warm) confidence += 0.2;
    if (temp != null && temp > 30) confidence += 0.1;
    if (clear) confidence += 0.1;
    if (ridge) confidence += 0.1;
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: { highPressureHPa: high.pressure_hPa, tempC: temp, h500m: h500 } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function content(_facts: Facts, p: Params) {
    const tempPhrase = p.tempC != null ? `It's around ${Math.round(p.tempC)}°C here. ` : '';
    const aloft = p.h500m != null ? ', with tall heights aloft' : '';
    return {
        title: 'Why heat is building under this ridge',
        mechanism:
            `${tempPhrase}You're under a blocking high — a strong ridge of high pressure ` +
            `(around ${Math.round(p.highPressureHPa)} hPa at the surface${aloft}). Air sinks under ` +
            `a ridge, compressing and warming as it descends; skies clear so the sun bakes the ` +
            `ground, and that same sinking motion caps convection — no storms to break the heat. ` +
            `Ridges park in place, so the warmth compounds day after day.`,
        checkNext: [
            {
                label: 'Toggle CAPE: confirm convection is capped despite the heat',
                overlay: 'cape' as const,
            },
            {
                label: 'Toggle Wind: ridges bring light winds — little mixing or relief',
                overlay: 'wind' as const,
            },
        ],
        remember:
            'Blocking ridges are stubborn — they can hold for a week or more until a trough ' +
            'finally displaces them. Heat and air quality both tend to worsen until then.',
    };
}

const heat_dome: PatternModule<Params> = {
    id: 'heat_dome',
    appliesToLayers: ['temp', 'pressure'],
    detect,
    visual,
    content,
};

export default heat_dome;
