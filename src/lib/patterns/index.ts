// Pattern registry + layer-aware dispatcher + layer defaults.
//
// Detection is gated by:
//   1. The currently-active Windy overlay (`store.get('overlay')`)
//   2. The active wind level (`store.get('level')`) for wind-layer patterns
//
// Resolution order at click time:
//   1. Run all patterns whose appliesToLayers matches the active overlay.
//      Each detect() additionally gates on level / sub-conditions.
//      Highest-confidence active match wins.
//   2. If no pattern fired but the active layer has a default, render the
//      default card ("Wind right here", "Pressure right here", etc.).
//   3. Otherwise show the "layer not yet supported" fallback in the UI.

import type { DetectContext, Facts, PatternModule, WindyOverlay } from '../types';

import cape_no_storms from './cape_no_storms';
import cyclonic_inflow from './cyclonic_inflow';
import fog from './fog';
import haze_dust_plume from './haze_dust_plume';
import heat_dome from './heat_dome';
import jet_stream from './jet_stream';
import low_level_jet from './low_level_jet';
import orographic_rain from './orographic_rain';
import radar_satellite_mismatch from './radar_satellite_mismatch';
import rain_in_a_line from './rain_in_a_line';
import sea_breeze from './sea_breeze';
import sharp_temperature_line from './sharp_temperature_line';
import stagnation_inversion from './stagnation_inversion';
import swell_vs_wind from './swell_vs_wind';
import tight_gradient from './tight_gradient';
import wind_gust_factor from './wind_gust_factor';
import wintry_mix from './wintry_mix';

const MODULES: PatternModule<any>[] = [
    cyclonic_inflow,
    jet_stream,
    low_level_jet,
    tight_gradient,
    // wintry_mix before rain_in_a_line + orographic_rain: in the near-freezing
    // core zone confidences can tie at 1.0, and pickPattern's strict-> tie-break
    // goes to MODULES order — the freezing-rain hazard should win, not "rain".
    wintry_mix,
    rain_in_a_line,
    cape_no_storms,
    radar_satellite_mismatch,
    sharp_temperature_line,
    heat_dome,
    haze_dust_plume,
    stagnation_inversion,
    wind_gust_factor,
    orographic_rain,
    swell_vs_wind,
    sea_breeze,
    fog,
];

export interface DispatchResult {
    module: PatternModule<any> | null;
    confidence: number;
    params: unknown;
}

export function pickPattern(ctx: DetectContext, facts: Facts): DispatchResult {
    let best: DispatchResult = { module: null, confidence: 0, params: null };
    for (const mod of MODULES) {
        if (!mod.appliesToLayers.includes(ctx.activeLayer)) continue;
        const r = mod.detect(facts, ctx);
        if (r.active && r.confidence > best.confidence) {
            best = { module: mod, confidence: r.confidence, params: r.params };
        }
    }
    return best;
}

// Set of overlays where at least one pattern is currently shipped.
export function getSupportedLayers(): WindyOverlay[] {
    const set = new Set<WindyOverlay>();
    for (const mod of MODULES) {
        for (const layer of mod.appliesToLayers) set.add(layer);
    }
    return Array.from(set);
}

export interface PatternCatalogEntry {
    id: string;
    title: string;
    layerHint: string;
    // --- map-tour fields (catalogue → map tour) ---
    // Overlay the tour switches to. MUST be in this pattern's appliesToLayers,
    // else a post-switch click would dead-end — the catalog test enforces it.
    overlay: WindyOverlay;
    // Wind level to set alongside the overlay; only the wind-level patterns
    // need it (jet 250h, low-level jet 850h, surface flows 'surface').
    level?: string;
    // Tier 1: fly to + mark a live pressure feature. Absent => tier 2, which
    // only switches the layer and guides the eye.
    locate?: 'low' | 'high' | 'gradient';
    // Eye-guide caption for tier 2, and the fallback shown for a tier-1 pattern
    // when no qualifying feature is in view.
    tourHint: string;
}

// Order shown in the catalogue (the map tour). `locate` entries fly to + mark
// a live pressure feature; the rest switch the layer and guide the eye.
export const CATALOG: PatternCatalogEntry[] = [
    {
        id: 'cyclonic_inflow', title: 'Wind curling around a low', layerHint: 'Wind layer (surface)',
        overlay: 'wind', level: 'surface', locate: 'low',
        tourHint: "No clear low is in view — pan to where the wind streamlines curl into a centre, then click there.",
    },
    {
        id: 'tight_gradient', title: 'Strong wind in a tight pressure gradient', layerHint: 'Wind layer (surface)',
        overlay: 'wind', level: 'surface', locate: 'gradient',
        tourHint: "No strong high-and-low squeeze is in view — pan between two pressure systems where the isobars pack tight, then click.",
    },
    {
        id: 'jet_stream', title: 'Jet stream', layerHint: 'Wind layer at 250h or 300h',
        overlay: 'wind', level: '250h',
        tourHint: "Look for a fast ribbon of wind threading across the map — that's the jet. Click along it.",
    },
    {
        id: 'low_level_jet', title: 'Low-level jet (fast nocturnal wind aloft)', layerHint: 'Wind layer at 850h',
        overlay: 'wind', level: '850h',
        tourHint: "Look for a fast low-level core, often strongest overnight, then click the core.",
    },
    {
        id: 'rain_in_a_line', title: 'Rain in a line (front / squall)', layerHint: 'Rain or Radar layer',
        overlay: 'rain',
        tourHint: "Look for a sharp coloured band — a front or a squall line — then click it.",
    },
    {
        id: 'wintry_mix', title: 'Wintry mix (rain, snow, or ice near 0°C)', layerHint: 'Rain, Radar, or Temperature layer',
        overlay: 'temp',
        tourHint: "Find where temperature sits near 0 °C with precipitation falling, then click that zone.",
    },
    {
        id: 'cape_no_storms', title: 'CAPE without storms (capped instability)', layerHint: 'CAPE layer',
        overlay: 'cape',
        tourHint: "Find a warm colour sitting under a quiet, storm-free sky, then click it.",
    },
    {
        id: 'radar_satellite_mismatch', title: 'Clouds without rain (virga, cirrus, cloud shield)', layerHint: 'Radar, Satellite, or Cloud layer',
        overlay: 'satellite',
        tourHint: "Find cloud with no matching echo on the Radar layer, then click the cloud.",
    },
    {
        id: 'sharp_temperature_line', title: 'Sharp temperature boundary (front)', layerHint: 'Temperature layer',
        overlay: 'temp',
        tourHint: "Find a sharp colour change over a short distance, then click across it.",
    },
    {
        id: 'heat_dome', title: 'Heat building under a blocking ridge', layerHint: 'Temperature or Pressure layer',
        overlay: 'temp', locate: 'high',
        tourHint: "No dominant high is in view — pan to a large warm ridge, then click beneath it.",
    },
    {
        id: 'haze_dust_plume', title: 'Haze or dust plume', layerHint: 'Air Quality or Dust layer',
        overlay: 'dustsm',
        tourHint: "Find a coloured plume streaming downwind of a source, then click the plume.",
    },
    {
        id: 'stagnation_inversion', title: 'Air stagnation under a high (inversion)', layerHint: 'Air Quality layer',
        overlay: 'aqi',
        tourHint: "Find haze built up under calm high pressure, then click it.",
    },
    {
        id: 'wind_gust_factor', title: 'High gust factor (gusts >> sustained)', layerHint: 'Gust layer',
        overlay: 'gust',
        tourHint: "Compare with the Wind layer — the gap is widest over rough terrain. Click a gusty spot.",
    },
    {
        id: 'orographic_rain', title: 'Orographic rain & rain shadow', layerHint: 'Rain layer (elevated terrain)',
        overlay: 'rain',
        tourHint: "Find rain piled on a mountain's windward side (dry in its lee), then click the wet side.",
    },
    {
        id: 'swell_vs_wind', title: 'Swell vs wind waves (distant storm energy)', layerHint: 'Waves or Swell layer',
        overlay: 'waves',
        tourHint: "Find big swell far from any local wind, then click open water.",
    },
    {
        id: 'sea_breeze', title: 'Sea breeze (afternoon onshore flow)', layerHint: 'Wind or Gust layer (coastal, afternoon)',
        overlay: 'wind', level: 'surface',
        tourHint: "Find afternoon flow blowing onshore at a coast, then click the shoreline.",
    },
    {
        id: 'fog', title: 'Fog (radiation or advection)', layerHint: 'Visibility or Fog layer',
        overlay: 'visibility',
        tourHint: "Find low visibility settled in a valley or along a coast, then click it.",
    },
];

export { MODULES };
export { getLayerDefault, getDefaultedLayers } from './layer_defaults';
