// Phenomenon module: high pressure dominance.
//
// "A high is in charge here." Quiet, settled regimes — clear sky, gentle wind,
// stable temps. The most common click outcome globally, so we polish this one
// first.
//
// Detection: nearest high within ~1500 km, ≥1015 hPa, and either closer than
// the nearest low OR the local MSL pressure is itself elevated (>1018).
//
// Visual: an "H" symbol drawn at the high's center; a soft dashed line from H
// to the click point hinting at the flow.
//
// Content: hand-written, with a few substitution slots filled from facts.

import type { Facts, PhenomenonModule, PressureFeature } from '../types';

interface Params {
    high: PressureFeature;
    pressureTendency: 'rising' | 'steady' | 'falling';
    pressureChange24h: number | null;
    windSpeedKmh: number | null;
    windCompass: string | null;
    jetSpeedKmh: number | null;
    jetCompass: string | null;
    temp_C: number | null;
    cloudCoverPct: number | null;
}

function detect(facts: Facts) {
    const { synoptic, surface, past_24h, upper_air } = facts;
    const high = synoptic.nearest_high;
    const low = synoptic.nearest_low;

    const highInRange = high.distance_km < 1500;
    const highStrong = high.pressure_hPa >= 1015;
    const localMsl = surface.pressure_msl_hPa ?? 0;
    const highDominant = high.distance_km < low.distance_km || localMsl > 1018;

    const active = highInRange && highStrong && highDominant;

    let confidence = 0;
    if (highInRange) confidence += 0.25;
    if (highStrong) confidence += 0.25;
    if (highDominant) confidence += 0.35;
    if (past_24h.pressure_tendency !== 'falling') confidence += 0.15;
    confidence = Math.min(confidence, 1);

    const jetDirDeg = upper_air['250hPa_jet'].wind_direction_deg;
    const jetCompass =
        jetDirDeg != null
            ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
                  Math.floor((jetDirDeg + 22.5) / 45) % 8
              ]
            : null;

    return {
        active,
        confidence,
        params: {
            high,
            pressureTendency: past_24h.pressure_tendency,
            pressureChange24h: past_24h.pressure_change_hPa,
            windSpeedKmh: surface.wind_speed_kmh,
            windCompass: surface.wind_compass,
            jetSpeedKmh: upper_air['250hPa_jet'].wind_speed_kmh,
            jetCompass,
            temp_C: surface.temperature_C,
            cloudCoverPct: surface.cloud_cover_pct,
        } as Params,
    };
}

function visual(map: any, _facts: Facts, params: Params): () => void {
    // Draws a marker with a stylized "H" symbol at the center of the dominant
    // high, plus a dashed line from the H to the click point that suggests the
    // flow path. Returns a cleanup function the caller invokes before the next
    // click renders new annotations.
    const created: any[] = [];

    const hIcon = new L.DivIcon({
        className: 'ww-h-icon',
        html: '<div class="ww-h">H</div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
    });
    const highMarker = new L.Marker(
        { lat: params.high.lat, lng: params.high.lon },
        { icon: hIcon, interactive: false },
    ).addTo(map);
    created.push(highMarker);

    const line = new L.Polyline(
        [
            [params.high.lat, params.high.lon],
            [_facts.location.lat, _facts.location.lon],
        ],
        {
            color: '#c95a3c',
            weight: 1.6,
            opacity: 0.6,
            dashArray: '6 4',
            interactive: false,
        },
    ).addTo(map);
    created.push(line);

    return () => {
        for (const item of created) item.remove();
    };
}

function content(_facts: Facts, p: Params) {
    const distStr = `${p.high.distance_km.toLocaleString()} km`;
    const compass = compassPhrase(p.high.compass);

    // Body 1 — the high itself + sinking-air mechanism (the load-bearing tidbit)
    const body1 = {
        emoji: '☀️',
        text:
            `A high-pressure system sits ${distStr} ${compass} of you. ` +
            `Air under a high sinks gently — and as it falls, it warms about 1°C ` +
            `per 100 metres. That warming dries the air, burning away clouds before ` +
            `they can form. So the price of clear sky is just slightly cooler ground temperatures.`,
    };

    // Body 2 — the wind, with a "where did this air come from" tidbit
    const windDescriptor =
        p.windSpeedKmh != null && p.windCompass != null
            ? `Your ${Math.round(p.windSpeedKmh)} km/h ${p.windCompass.toLowerCase()} breeze`
            : 'The breeze you feel';
    const body2 = {
        emoji: '🌬️',
        text:
            `${windDescriptor} is the high's clockwise flow brushing past you ` +
            `(in the Northern Hemisphere — flip it south of the equator). ` +
            `From the air's perspective it's a whisper, but the molecules touching ` +
            `your skin right now were maybe 100 km away half a day ago.`,
    };

    // Body 3 — pressure trend, varies by tendency
    let trendText = '';
    let trendEmoji: string;
    if (p.pressureTendency === 'rising') {
        const chg = p.pressureChange24h ?? 0;
        trendEmoji = '⬆️';
        trendText =
            `Local pressure has crept up ${Math.abs(chg).toFixed(1)} hPa in the past day. ` +
            `The high's grip is tightening, not loosening. ` +
            `That gradient, small as it looks, is exactly what's pulling the wind you feel — ` +
            `if pressure were perfectly even across this region, the air wouldn't move at all.`;
    } else if (p.pressureTendency === 'steady') {
        trendEmoji = '⬆️';
        trendText =
            `Local pressure is steady. The high has settled into place; ` +
            `it'll likely stay parked for a while yet. ` +
            `That gradient between this high and whatever's around it — that's the engine ` +
            `pulling the wind. Even gentle flow needs a pressure difference to drive it.`;
    } else {
        trendEmoji = '⬇️';
        trendText =
            `Local pressure is easing. The high is loosening its grip — ` +
            `something else is moving in. Watch the wind direction over the next day; ` +
            `that's where the new system will announce itself first.`;
    }
    const body3 = { emoji: trendEmoji, text: trendText };

    // Body 4 — optional upper-level note (only if jet data is meaningful)
    let body4: { emoji: string; text: string } | null = null;
    if (p.jetSpeedKmh != null && p.jetSpeedKmh > 80 && p.jetCompass) {
        body4 = {
            emoji: '🛰️',
            text:
                `Above your head at about 10 km altitude, the jet stream is racing ` +
                `${p.jetCompass.toLowerCase()}-ward at ${Math.round(p.jetSpeedKmh)} km/h. ` +
                `You won't feel it down here, but it's the conveyor belt deciding which weather ` +
                `system rolls toward you next.`,
        };
    }

    const body = body4 ? [body1, body2, body3, body4] : [body1, body2, body3];

    // Closer varies by tendency — must NOT recap the opener
    const closer =
        p.pressureTendency === 'rising'
            ? '_So basically: this high is muscling in. Enjoy the calm before whatever follows._'
            : p.pressureTendency === 'falling'
              ? "_So basically: the high's days are numbered here. Expect change in the next 24 hours._"
              : '_So basically: the high has parked itself. This is the kind of weather that just... stays._';

    const opener = pickOpener(p);

    return { opener, body, closer };
}

function pickOpener(p: Params): string {
    // Pull a feeling-of-the-day opener from a small bank, biased by trend.
    if (p.pressureTendency === 'rising') {
        return 'A high is muscling in.';
    }
    if (p.pressureTendency === 'falling') {
        return 'A high — but its grip is fading.';
    }
    if ((p.windSpeedKmh ?? 0) < 8) return 'Settled air, settled day.';
    return 'Calm one today.';
}

function compassPhrase(c: string): string {
    const m: Record<string, string> = {
        N: 'to the north',
        NE: 'to the northeast',
        E: 'to the east',
        SE: 'to the southeast',
        S: 'to the south',
        SW: 'to the southwest',
        W: 'to the west',
        NW: 'to the northwest',
    };
    return m[c] ?? `${c}-ward`;
}

const high_pressure: PhenomenonModule<Params> = {
    id: 'high_pressure',
    label: 'High pressure dominance',
    detect,
    visual,
    content,
};

export default high_pressure;
