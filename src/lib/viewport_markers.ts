// Proactive lows/highs markers — the MVP slice of "show me where to click".
//
// While the plugin is open, place clickable L/H chips at the pressure centres
// near the current viewport, so the user can see where the cyclonic-inflow /
// pressure stories are without hunting. One batched pressure-grid request per
// debounced map-idle — far under the 6-request burst a single click fires.
//
// Detection only locates pressure features (the 49-point grid). Fronts, jets,
// rain lines etc. are single-point-proxy by design and have no map location —
// so this is lows/highs only, deliberately.

import { fetchPressureGrid, findSynopticFeatures } from './facts';
import { makeGlyphMarker } from './mapglyph';
import type { LatLon, PressureFeature } from './types';

const DEBOUNCE_MS = 500;

// Only mark genuinely synoptic features — a "low" of 1012 hPa in a flat field
// would mislead. The low threshold mirrors cyclonic_inflow's "is really a low".
const LOW_MAX_HPA = 1010;
const HIGH_MIN_HPA = 1020;

// Viewport-scaled grid: span the visible map but keep the point count fixed at
// 7x7 = 49 (radius:step held at 3:1) so the request stays the proven size at
// any zoom. Radius clamped so whole-globe zoom can't blow up the request.
function gridForBounds(map: any): { radiusDeg: number; stepDeg: number } {
    const b = map.getBounds();
    const latSpan = Math.abs(b.getNorth() - b.getSouth());
    const lonSpan = Math.abs(b.getEast() - b.getWest());
    const radiusDeg = Math.min(Math.max(Math.max(latSpan, lonSpan) / 2, 2), 12);
    return { radiusDeg, stepDeg: radiusDeg / 3 };
}

export function initViewportMarkers(
    map: any,
    onFeatureClick: (loc: LatLon) => void,
): () => void {
    let markers: any[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let inflight: AbortController | null = null;
    let destroyed = false;

    function clearMarkers() {
        for (const m of markers) {
            try {
                m.remove();
            } catch {
                /* map already torn down */
            }
        }
        markers = [];
    }

    async function refresh() {
        if (destroyed) return;
        if (inflight) {
            inflight.abort();
            inflight = null;
        }
        const ac = new AbortController();
        inflight = ac;
        try {
            const center = map.getCenter();
            const { radiusDeg, stepDeg } = gridForBounds(map);
            const grid = await fetchPressureGrid(
                center.lat,
                center.lng,
                ac.signal,
                radiusDeg,
                stepDeg,
            );
            // Mounted-guard: a fetch resolving after unmount (or after a newer
            // moveend aborted this one) must not draw against a dead map.
            if (destroyed || ac.signal.aborted) return;
            const syn = findSynopticFeatures(grid, center.lat, center.lng);
            const bounds = map.getBounds();
            clearMarkers();
            const candidates: Array<{ feat: PressureFeature; kind: 'low' | 'high' }> = [
                { feat: syn.nearest_low, kind: 'low' },
                { feat: syn.nearest_high, kind: 'high' },
            ];
            for (const { feat, kind } of candidates) {
                // NaN sentinel (empty grid), off-map features, and non-synoptic
                // pressures are all skipped — render nothing rather than mislead.
                if (!Number.isFinite(feat.pressure_hPa)) continue;
                if (!Number.isFinite(feat.lat) || !Number.isFinite(feat.lon)) continue;
                if (kind === 'low' && feat.pressure_hPa > LOW_MAX_HPA) continue;
                if (kind === 'high' && feat.pressure_hPa < HIGH_MIN_HPA) continue;
                if (!bounds.contains({ lat: feat.lat, lng: feat.lon })) continue;
                const lat = feat.lat;
                const lon = feat.lon;
                const marker = makeGlyphMarker(
                    lat,
                    lon,
                    kind === 'low' ? 'Low' : 'High',
                    kind,
                    () => onFeatureClick({ lat, lon }),
                );
                marker.addTo(map);
                markers.push(marker);
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return; // expected when a newer moveend aborts
            // Proactive markers are a non-essential enhancement (this also
            // absorbs map APIs being unavailable, e.g. mobile fullscreen) —
            // never surface a viewport-fetch failure; just leave markers as-is.
        } finally {
            if (inflight === ac) inflight = null;
        }
    }

    function onMoveEnd() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            void refresh();
        }, DEBOUNCE_MS);
    }

    try {
        map.on('moveend', onMoveEnd);
    } catch {
        // Map event API unavailable — skip proactive markers entirely.
        return () => {};
    }
    void refresh(); // initial fetch on plugin open

    return () => {
        destroyed = true;
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        if (inflight) {
            inflight.abort();
            inflight = null;
        }
        try {
            map.off('moveend', onMoveEnd);
        } catch {
            /* already torn down */
        }
        clearMarkers();
    };
}
