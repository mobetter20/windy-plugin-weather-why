// Pattern registry + layer-aware dispatcher.
//
// Detection is gated by the currently-active Windy overlay
// (`store.get('overlay')`). Same click on the same lat/lon means different
// things on the wind layer vs the rain layer vs the CAPE layer. The dispatcher
// only considers patterns whose `appliesToLayers` includes the current overlay.
//
// Phase 1d ships with one pattern (cyclonic_inflow). Phase 2+ adds the
// remaining 12 from the locked v1 topic table.

import type { Facts, PatternModule, WindyOverlay } from '../types';
import cyclonic_inflow from './cyclonic_inflow';

const MODULES: PatternModule<any>[] = [cyclonic_inflow];

export interface DispatchResult {
    module: PatternModule<any> | null;
    confidence: number;
    params: unknown;
}

export function pickPattern(activeLayer: WindyOverlay, facts: Facts): DispatchResult {
    let best: DispatchResult = { module: null, confidence: 0, params: null };
    for (const mod of MODULES) {
        if (!mod.appliesToLayers.includes(activeLayer)) continue;
        const r = mod.detect(facts);
        if (r.active && r.confidence > best.confidence) {
            best = { module: mod, confidence: r.confidence, params: r.params };
        }
    }
    return best;
}

// Set of overlays where at least one pattern is currently shipped — used by
// the UI to distinguish "right layer, no pattern matched" from
// "this layer isn't supported yet."
export function getSupportedLayers(): WindyOverlay[] {
    const set = new Set<WindyOverlay>();
    for (const mod of MODULES) {
        for (const layer of mod.appliesToLayers) set.add(layer);
    }
    return Array.from(set);
}

export { MODULES };
