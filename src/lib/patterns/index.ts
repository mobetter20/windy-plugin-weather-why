// Pattern registry + layer-aware dispatcher.
//
// Detection is gated by:
//   1. The currently-active Windy overlay (`store.get('overlay')`)
//   2. The active wind level (`store.get('level')`) for wind-layer patterns
// Same click means different things on different layer + level combinations.
// The dispatcher only considers patterns whose appliesToLayers includes the
// current overlay; each pattern's detect() additionally gates on the level
// where relevant.

import type { DetectContext, Facts, PatternModule, WindyOverlay } from '../types';
import cyclonic_inflow from './cyclonic_inflow';
import jet_stream from './jet_stream';
import rain_in_a_line from './rain_in_a_line';
import tight_gradient from './tight_gradient';

// Order doesn't matter for correctness — pickPattern returns the highest-
// confidence active match. Listed roughly by specificity (more specific first
// makes log output easier to read when debugging).
const MODULES: PatternModule<any>[] = [
    cyclonic_inflow,
    jet_stream,
    tight_gradient,
    rain_in_a_line,
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
    layerHint: string;   // human-readable for the intro hint
}

// For displaying "what patterns I currently recognise" in the intro state.
// Order shown to user.
export const CATALOG: PatternCatalogEntry[] = [
    { id: 'cyclonic_inflow', title: 'Wind curling around a low', layerHint: 'Wind layer (surface)' },
    { id: 'tight_gradient',  title: 'Strong wind in a tight pressure gradient', layerHint: 'Wind layer (surface)' },
    { id: 'rain_in_a_line',  title: 'Rain in a line (front / squall)', layerHint: 'Rain or Radar layer' },
    { id: 'jet_stream',      title: 'Jet stream', layerHint: 'Wind layer at 250h or 300h' },
];

export { MODULES };
