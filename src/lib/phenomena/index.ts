// Phenomenon registry + dispatcher.
//
// Order matters: the first module whose detect() returns active=true with the
// highest confidence wins. Phase 1c ships only high_pressure; phases 2-3 add
// frontal_passage, low_pressure, sea_breeze, convective_afternoon,
// jet_stream_dominant. New phenomena go here.

import type { Facts, PhenomenonModule } from '../types';
import high_pressure from './high_pressure';

const MODULES: PhenomenonModule<any>[] = [high_pressure];

export interface DispatchResult {
    module: PhenomenonModule<any> | null;
    confidence: number;
    params: unknown;
}

export function pickPhenomenon(facts: Facts): DispatchResult {
    let best: DispatchResult = { module: null, confidence: 0, params: null };
    for (const mod of MODULES) {
        const r = mod.detect(facts);
        if (r.active && r.confidence > best.confidence) {
            best = { module: mod, confidence: r.confidence, params: r.params };
        }
    }
    return best;
}

export { MODULES };
