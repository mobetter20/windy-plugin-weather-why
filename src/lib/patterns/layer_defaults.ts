// Layer-default cards — the "always something" baseline.
//
// When a click on a covered layer doesn't match any specific pattern, we
// fall back to a layer-default card: a brief explanation of what the active
// layer shows + the local data point + cross-layer prompts to find the
// specific patterns.
//
// Same four-beat structure as a pattern card (title / mechanism / check-next
// / remember) so the UI doesn't need a special render path. Same tone (B,
// substantive, no folk-philosophy).
//
// Coverage in v1: wind (also gust), pressure, rain, temp, satellite, radar,
// cape, waves, and air-quality layers (cAQI, pm2p5, pm10, dust).
// Other layers (clouds, cloudtop, visibility) fall through to the
// "this layer not yet supported" message.

import type { DetectContext, Facts, PatternCard, WindyOverlay } from '../types';

type DefaultFn = (facts: Facts, ctx: DetectContext) => PatternCard;

const wind_default: DefaultFn = (f, _ctx) => {
    const speed = f.surface.wind_speed_kmh != null ? Math.round(f.surface.wind_speed_kmh) : null;
    const compass = f.surface.wind_compass;
    const speedPhrase =
        speed != null && compass
            ? `Surface wind here is about ${speed} km/h from the ${compass.toLowerCase()}.`
            : 'Surface wind here is light.';
    return {
        title: "What you're seeing",
        mechanism:
            `Wind is air moving from higher pressure toward lower pressure; the arrows show ` +
            `direction and the colors show speed. ${speedPhrase} The pattern around you isn't ` +
            `dominated by a single low-pressure swirl or a sharp pressure squeeze right now — ` +
            `typical of fair-weather flow.`,
        checkNext: [
            {
                label: 'Toggle Pressure: see the pressure pattern that sets this wind',
                overlay: 'pressure',
            },
            {
                label: 'Click somewhere with visibly curling streamlines for the cyclonic-inflow story',
                overlay: 'wind',
            },
        ],
        remember:
            'Surface wind is slowed by friction with land and sea. The same pressure ' +
            'gradient drives ~30% faster wind over open water than over rough terrain.',
    };
};

const pressure_default: DefaultFn = (f, _ctx) => {
    const p = f.surface.pressure_msl_hPa;
    const pressurePhrase =
        p != null
            ? `Pressure here is about ${Math.round(p)} hPa — ${p > 1015 ? 'a touch above' : p < 1010 ? 'a touch below' : 'right around'} the standard atmosphere of 1013 hPa.`
            : 'Local pressure data unavailable.';
    return {
        title: "What you're seeing",
        mechanism:
            `${pressurePhrase} The lines (isobars) trace equal-pressure values; closed loops are ` +
            `highs and lows; tightly-packed lines mean stronger wind. Air flows from higher pressure ` +
            `toward lower, deflected by Earth's rotation as it goes.`,
        checkNext: [
            {
                label: 'Toggle Wind: see how the lines correspond to wind speed and direction',
                overlay: 'wind',
            },
            {
                label: 'Click on a closed contour (H or L) for the pattern card that goes with it',
                overlay: 'pressure',
            },
        ],
        remember:
            'Values shown are reduced to sea level (MSL), not your actual altitude. ' +
            'In mountains the raw pressure is much lower.',
    };
};

const rain_default: DefaultFn = (f, _ctx) => {
    const fc = f.forecast_24h.precip_total_mm ?? 0;
    const expectedPhrase =
        fc > 0.5
            ? `About ${fc.toFixed(1)} mm of rain is forecast here in the next 24 hours.`
            : 'No significant rain forecast here in the next 24 hours.';
    return {
        title: "What you're seeing",
        mechanism:
            `${expectedPhrase} Rain forms where air rises — along fronts, above warm surfaces, ` +
            `against terrain. Where you see a colored band on this layer, there's almost always ` +
            `a front or convergence behind it. Where it's empty, the air is sinking or stable.`,
        checkNext: [
            {
                label: 'Toggle Wind: see the airflow pattern that determines where rain forms',
                overlay: 'wind',
            },
            {
                label: "Toggle Radar: see what's currently observed (vs forecast on this layer)",
                overlay: 'radar',
            },
        ],
        remember:
            'This layer is model forecast. Switch to Radar for actual current precipitation — ' +
            'the two often disagree by a few hours of timing.',
    };
};

const temp_default: DefaultFn = (f, _ctx) => {
    const t = f.surface.temperature_C;
    const tempPhrase =
        t != null
            ? `Surface temperature here is about ${Math.round(t)}°C.`
            : 'Local temperature data unavailable.';
    return {
        title: "What you're seeing",
        mechanism:
            `${tempPhrase} The colors smoothly grade from cold to warm, but real-world ` +
            `boundaries — fronts, coasts, mountains — produce sharper transitions. Near coasts ` +
            `the contrast between land and sea drives sea breezes; over mountains, temperature ` +
            `drops with altitude (~6°C per kilometre).`,
        checkNext: [
            {
                label: 'Toggle Wind: a real front comes with both a temperature change AND a wind shift',
                overlay: 'wind',
            },
            {
                label: 'Click on a sharp temperature transition for the front-or-terrain card',
                overlay: 'temp',
            },
        ],
        remember:
            'Surface temperature on this layer is interpolated model output. ' +
            'Real fronts come with both a temperature change AND a wind shift — both signatures ' +
            'together confirm a front; either alone could be terrain.',
    };
};

const satellite_default: DefaultFn = (f, _ctx) => {
    const c = f.surface.cloud_cover_pct;
    const cloudPhrase =
        c != null
            ? `Local cloud cover is about ${Math.round(c)}%.`
            : 'Local cloud-cover data unavailable.';
    return {
        title: "What you're seeing",
        mechanism:
            `The satellite layer shows actual cloud structure as observed from space — not a ` +
            `forecast. Brighter, whiter areas are thicker or higher clouds; darker patches show ` +
            `fewer clouds or clearer sky. ${cloudPhrase}`,
        checkNext: [
            {
                label: 'Toggle Radar: compare with currently observed rain — clouds without rain are common',
                overlay: 'radar',
            },
            {
                label: "Toggle Rain: compare with the model's forecast",
                overlay: 'rain',
            },
        ],
        remember:
            'Satellite shows cloud TOPS. Radar shows precipitation in the column. They are ' +
            'complementary observations, not the same thing — disagreements are common and informative.',
    };
};

const cape_default: DefaultFn = (f, _ctx) => {
    const cape = f.instability.cape_jkg;
    const capePhrase =
        cape != null
            ? `CAPE here is ${Math.round(cape)} J/kg — ${cape < 300 ? 'very low, indicating a stable atmosphere' : 'low enough that thunderstorm development is unlikely'}.`
            : 'Local CAPE data is unavailable here.';
    return {
        title: "What you're seeing",
        mechanism:
            `${capePhrase} CAPE (Convective Available Potential Energy) is the fuel a storm needs: ` +
            `energy a rising air parcel could tap if pushed high enough to escape its environment. ` +
            `Low CAPE means even a trigger — a front, sea breeze, or terrain — won't produce ` +
            `much lift. The atmosphere just isn't loaded.`,
        checkNext: [
            {
                label: 'Toggle Wind: look for a front or convergence line that could act as a trigger',
                overlay: 'wind',
            },
            {
                label: "Toggle Radar: confirm the sky is quiet",
                overlay: 'radar',
            },
        ],
        remember:
            'CAPE peaks in the afternoon when surface heating is strongest. Re-check later ' +
            'in the day — values can double between morning and early afternoon.',
    };
};

const waves_default: DefaultFn = (_f, _ctx) => {
    return {
        title: "What you're seeing",
        mechanism:
            `This layer shows significant wave height — the average of the highest third of waves at each point. ` +
            `It combines local wind chop with swell arriving from distant storms, sometimes thousands of kilometres away. ` +
            `Wave data isn't available from Open-Meteo's free tier, so no local value is shown here.`,
        checkNext: [
            {
                label: 'Toggle Wind: the wave pattern follows the wind trajectory nearby and upwind',
                overlay: 'wind',
            },
            {
                label: 'Toggle Swell: see the long-period swell component separately',
                overlay: 'swell1',
            },
        ],
        remember:
            'Significant wave height is a statistical average — individual waves can reach roughly ' +
            'twice that value. Wave models are less reliable than wind models.',
    };
};

const air_quality_default: DefaultFn = (f, _ctx) => {
    const pm2 = f.air_quality.pm2_5;
    const pm10 = f.air_quality.pm10;
    const pm2Str = pm2 != null ? `${Math.round(pm2)} µg/m³` : null;
    const pm10Str = pm10 != null ? `${Math.round(pm10)} µg/m³` : null;

    const readingPhrase =
        pm2Str != null
            ? `PM2.5 here is ${pm2Str}${pm10Str != null ? ` and PM10 is ${pm10Str}` : ''} — below the levels that flag a plume.`
            : 'Local particulate data is unavailable here.';

    return {
        title: "What you're seeing",
        mechanism:
            `${readingPhrase} These layers show airborne particulate concentration, ` +
            `modeled from meteorology and emission inventories. PM2.5 is fine particles small ` +
            `enough to penetrate the lungs; PM10 adds coarser dust and pollen. ` +
            `When a plume is present upwind, concentrations spike along the transport path.`,
        checkNext: [
            {
                label: 'Toggle Wind: the air-quality pattern here follows the low-level wind trajectory',
                overlay: 'wind',
            },
        ],
        remember:
            'These layers are model output, not sensor readings. Actual conditions may differ — ' +
            'especially near local sources like wildfires or industrial sites.',
    };
};

const LAYER_DEFAULTS: Partial<Record<WindyOverlay, DefaultFn>> = {
    wind: wind_default,
    gust: wind_default,         // shares the wind explanation
    pressure: pressure_default,
    rain: rain_default,
    rainAccu: rain_default,     // shares the rain explanation
    radar: rain_default,        // close enough for v0.1; radar-specific framing later
    temp: temp_default,
    satellite: satellite_default,
    cape: cape_default,
    waves: waves_default,
    swell1: waves_default,      // same explanation for all swell layers
    swell2: waves_default,
    cAQI: air_quality_default,
    pm2p5: air_quality_default,
    pm10: air_quality_default,
    dust: air_quality_default,
};

export function getLayerDefault(
    layer: WindyOverlay,
    facts: Facts,
    ctx: DetectContext,
): PatternCard | null {
    const fn = LAYER_DEFAULTS[layer];
    return fn ? fn(facts, ctx) : null;
}

export function getDefaultedLayers(): WindyOverlay[] {
    return Object.keys(LAYER_DEFAULTS) as WindyOverlay[];
}
