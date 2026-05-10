// Pattern: sea breeze — daytime onshore flow driven by land-sea temperature contrast.
//
// Visible cue: moderate wind on the wind/gust layer at a coastal location during
// afternoon hours, blowing from the ocean toward land.
//
// Mechanism: sunlight heats land faster than water. Warm land air rises; cool
// marine air flows in to replace it. The sea-breeze front can trigger afternoon
// convection as it pushes inland.
//
// Detection: ocean within ~55 km (elevation probe), onshore wind direction,
// moderate speed (5–25 km/h), and afternoon local time (11–19 h).
// Confidence weights all four signals.

import { compass8, initialBearingDeg } from '../geo';
import type { DetectContext, Facts, PatternModule, WindyOverlay } from '../types';

interface Params {
    oceanCompass: string;
    oceanDistanceKm: number;
    windSpeedKmh: number;
    localHour: number;
}

function angularDiff(a: number, b: number): number {
    return ((a - b + 540) % 360) - 180;
}

function localHourFromUtc(isoString: string, lonDeg: number): number {
    const utcHour = new Date(isoString).getUTCHours();
    const offsetH = lonDeg / 15;
    return ((utcHour + offsetH) % 24 + 24) % 24;
}

function detect(facts: Facts, ctx: DetectContext) {
    const { geo, surface, location, generated_at } = facts;

    // Surface wind only — sea breezes don't show up at upper pressure levels.
    const isSurface = ctx.level === 'surface' || ctx.level === '950h';
    if (!isSurface) return { active: false, confidence: 0, params: null as any };

    const oceanBearing = geo.ocean_bearing_deg;
    const windDir = surface.wind_direction_deg;
    const windSpeed = surface.wind_speed_kmh ?? 0;

    const hasOcean = geo.ocean_nearby_compass != null && oceanBearing != null;
    const speedOk = windSpeed >= 5 && windSpeed <= 25;

    // Onshore: wind comes FROM the ocean (wind_direction ≈ bearing to ocean).
    const isOnshore = hasOcean && windDir != null
        ? Math.abs(angularDiff(windDir, oceanBearing!)) < 90
        : false;

    const localHour = localHourFromUtc(generated_at, location.lon);
    const isAfternoon = localHour >= 11 && localHour < 19;

    const active = hasOcean && speedOk && isOnshore && isAfternoon;

    let confidence = 0;
    if (hasOcean)    confidence += 0.35;
    if (speedOk)     confidence += 0.2;
    if (isOnshore)   confidence += 0.3;
    if (isAfternoon) confidence += 0.15;
    confidence = Math.min(confidence, 1);

    return {
        active,
        confidence,
        params: {
            oceanCompass: geo.ocean_nearby_compass ?? '',
            oceanDistanceKm: geo.ocean_distance_km ?? 0,
            windSpeedKmh: Math.round(windSpeed),
            localHour: Math.round(localHour),
        } satisfies Params,
    };
}

function visual(_map: any, _facts: Facts, _params: Params): () => void {
    return () => {};
}

function compassPhrase(c: string): string {
    const m: Record<string, string> = {
        N: 'to the north', NE: 'to the northeast', E: 'to the east',
        SE: 'to the southeast', S: 'to the south', SW: 'to the southwest',
        W: 'to the west', NW: 'to the northwest',
    };
    return m[c] ?? `${c}-ward`;
}

function content(_facts: Facts, p: Params) {
    const oceanDir = compassPhrase(p.oceanCompass);

    return {
        title: 'Why an onshore breeze develops here',
        mechanism:
            `Daytime sun heats land faster than water. The warm land air rises and cool marine air flows in to ` +
            `replace it — a sea breeze. There's ocean ${oceanDir} (~${p.oceanDistanceKm} km), and the wind ` +
            `is currently blowing onshore at ${p.windSpeedKmh} km/h. The leading edge (the "sea-breeze front") ` +
            `often triggers afternoon clouds and showers as it pushes inland. Strongest mid-afternoon; ` +
            `reverses to a weaker land breeze overnight.`,
        checkNext: [
            {
                label: 'Toggle Temperature: confirm the land–sea contrast (warmer land, cooler ocean)',
                overlay: 'temp' as WindyOverlay,
            },
            {
                label: 'Toggle Clouds: sea-breeze fronts can trigger afternoon convection inland',
                overlay: 'clouds' as WindyOverlay,
            },
        ],
        remember:
            'This is a diurnal pattern — strongest mid-afternoon, dies after sunset. ' +
            'Reverses overnight (land breeze, weaker) when land cools faster than the sea.',
    };
}

const sea_breeze: PatternModule<Params> = {
    id: 'sea_breeze',
    appliesToLayers: ['wind', 'gust'],
    detect,
    visual,
    content,
};

export default sea_breeze;
