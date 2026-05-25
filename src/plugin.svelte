<div class="plugin__mobile-header">
    {title}
</div>

<section class="plugin__content ww-content">
    <div
        class="plugin__title plugin__title--chevron-back ww-header"
        on:click={() => (showCatalog ? bcast.emit('rqstOpen', 'menu') : backToHome())}
    >
        <span class="ww-header-mark">WEATHER <span class="ww-accent-dot">·</span> WHY</span>
    </div>
    <div class="ww-header-rule"></div>

    {#if showCatalog}
        <div class="ww-state ww-state--catalog">
            <div class="ww-cat-sublabel">Tap a pattern · the map explains it</div>

            <div class="ww-cat-group">
                <span class="ww-cat-group-pin">📍</span>
                <span>Weather Why flies you to a live one</span>
            </div>
            {#each locatableCatalog as p}
                <button
                    class="ww-cat-row ww-cat-row--locatable"
                    type="button"
                    on:click={() => runTour(p)}
                >
                    <span class="ww-cat-row-body">
                        <span class="ww-cat-row-title">{p.title}</span>
                        <span class="ww-cat-row-layer">{tourLayerLabel(p)}</span>
                    </span>
                    <span class="ww-cat-pin">📍</span>
                    <span class="ww-cat-arrow">→</span>
                </button>
            {/each}

            <div class="ww-cat-group">
                <span>These switch the layer — you pan to find one</span>
            </div>
            {#each switchCatalog as p}
                <button class="ww-cat-row" type="button" on:click={() => runTour(p)}>
                    <span class="ww-cat-row-body">
                        <span class="ww-cat-row-title">{p.title}</span>
                        <span class="ww-cat-row-layer">{tourLayerLabel(p)}</span>
                    </span>
                    <span class="ww-cat-arrow">→</span>
                </button>
            {/each}
        </div>
    {:else if tour}
        <div class="ww-state ww-state--tour">
            <button class="ww-back-link" type="button" on:click={exitTour}>← all patterns</button>
            {#if tour.patternTitle}
                <!-- Tier-2: pattern-intro card — title + what to look for -->
                <h2 class="ww-tour-title">{tour.patternTitle}</h2>
                <p class="ww-tour-caption">{stripClickHint(tour.caption)}</p>
                <p class="ww-tour-cta">Tap the map where you see it for a live reading.</p>
            {:else}
                <!-- Tier-1: flew to a live feature -->
                <span class="ww-tour-tier ww-tour-tier--fly">📍 Flew here</span>
                <p class="ww-tour-caption">{tour.caption}</p>
                {#if tour.nudge}
                    <div class="ww-tour-nudge">
                        <span class="ww-tour-nudge-arrow">↳</span>
                        <span>{tour.nudge}</span>
                    </div>
                {/if}
            {/if}
        </div>
    {:else if error}
        <div class="ww-state ww-state--error">
            <button class="ww-back-link" type="button" on:click={backToHome}>← all patterns</button>
            <p>Couldn't load weather data.</p>
            <p class="ww-error-help">
                The data source may be temporarily slow or unavailable. Try again in a moment,
                or click somewhere else on the map.
            </p>
            <details class="ww-error-details">
                <summary>technical detail</summary>
                <pre>{error}</pre>
            </details>
        </div>
    {:else if isLoading}
        <div class="ww-state ww-state--loading">
            <p>Reading the sky…</p>
        </div>
    {:else if pattern && facts}
        <div class="ww-card">
            <div class="ww-card-topbar">
                <button class="ww-back-link" type="button" on:click={backToHome}>← all patterns</button>
                <span
                    class="ww-badge {pattern.id === 'layer_default'
                        ? 'ww-badge--default'
                        : 'ww-badge--pattern'}"
                >{pattern.id === 'layer_default' ? 'Layer basics' : '✓ Pattern'}</span>
            </div>

            <div class="ww-meta">
                {fmtCoords(pattern.location)}
                <span class="ww-meta-sep">·</span>
                <span class="ww-meta-layer">{layerLabel(pattern.layer)} layer</span>
            </div>

            <h2 class="ww-card-title">{pattern.card.title}</h2>

            <p class="ww-card-lead">{mechLead}</p>
            {#if mechDetail}
                <p class="ww-card-mechanism">{mechDetail}</p>
            {/if}

            <div class="ww-card-section">
                <div class="ww-section-label">
                    Check next <span class="ww-section-hint">— switches the map layer</span>
                </div>
                {#each pattern.card.checkNext as cn}
                    <button
                        class="ww-toggle-button"
                        on:click={() => switchLayer(cn.overlay)}
                        type="button"
                    >
                        <span class="ww-toggle-arrow">→</span>
                        <span class="ww-toggle-text">{cn.label}</span>
                    </button>
                {/each}
            </div>

            <div class="ww-card-section ww-card-remember">
                <div class="ww-section-label">Remember</div>
                <p>{pattern.card.remember}</p>
            </div>
        </div>
    {:else if facts && !pattern}
        <div class="ww-state ww-state--fallback">
            <button class="ww-back-link" type="button" on:click={backToHome}>← all patterns</button>
            <div class="ww-coords">{fmtCoords(facts.location)}</div>
            {#if currentLayerSupported}
                <p>
                    No matching pattern at this click on the {layerLabel(currentLayer)} layer.
                </p>
                <p class="ww-fallback-detail">
                    Try a region with a visible swirl in the wind streamlines — that's where the
                    "wind curling around a low" pattern fires.
                </p>
            {:else}
                <p>
                    The {layerLabel(currentLayer)} layer isn't one Weather Why covers.
                </p>
                <p class="ww-fallback-detail">
                    Weather Why reads {coveredLayerLabels.length} layers — switch to any of
                    these and try again: {coveredLayerLabels.join(', ')}.
                </p>
            {/if}
        </div>
    {/if}
</section>

<script lang="ts">
    import bcast from '@windy/broadcast';
    import { map } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import { setUrl } from '@windy/location';
    import store from '@windy/store';
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';
    import { fetchFacts, fetchPressureGrid, findSynopticFeatures } from './lib/facts';
    import { initViewportMarkers, gridForBounds } from './lib/viewport_markers';
    import { makeGlyphMarker } from './lib/mapglyph';
    import {
        pickPattern,
        getSupportedLayers,
        getLayerDefault,
        getDefaultedLayers,
        CATALOG,
    } from './lib/patterns';
    import type { PatternCatalogEntry } from './lib/patterns';
    import type { DetectContext, Facts, LatLon, PatternCard, WindyOverlay } from './lib/types';

    const { name, title } = config;
    const supportedLayers = getSupportedLayers();
    const defaultedLayers = getDefaultedLayers();
    const coveredLayers = new Set<WindyOverlay>([...supportedLayers, ...defaultedLayers]);
    // Human-readable labels for every covered layer — derived so the fallback
    // copy below can't go stale when a pattern or layer-default is added.
    const coveredLayerLabels = [...coveredLayers].map(layerLabel).sort();

    // Catalogue split into the two tour tiers (see CATALOG `locate`): the few
    // patterns that fly to a live pressure feature, vs. the rest that just
    // switch the layer and guide the eye.
    const locatableCatalog = CATALOG.filter((p) => p.locate);
    const switchCatalog = CATALOG.filter((p) => !p.locate);

    let isLoading = false;
    let facts: Facts | null = null;
    let error: string | null = null;
    let currentLayer: WindyOverlay = 'wind';
    let currentLayerSupported = true;
    let pattern:
        | { id: string; location: LatLon; layer: WindyOverlay; card: PatternCard }
        | null = null;
    let visualCleanup: (() => void) | null = null;
    let viewportCleanup: (() => void) | null = null;
    let inflight: AbortController | null = null;

    let showCatalog = true; // catalogue is the home screen

    // Map-tour state. `flew` = tier-1 (flew to a feature). `patternTitle` set for
    // tier-2 entries: pane shows a pattern-intro card instead of a generic hint.
    let tour: { caption: string; nudge: string; flew: boolean; patternTitle?: string } | null = null;
    let tourCleanup: (() => void) | null = null;
    let tourInflight: AbortController | null = null;

    // Split the mechanism into a punchy lead sentence + the rest, so the card
    // reads as lead-then-detail instead of one dense block.
    function splitMechanism(m: string): [string, string] {
        const i = m.indexOf('. ');
        return i > 0 && i < m.length - 2 ? [m.slice(0, i + 1), m.slice(i + 2)] : [m, ''];
    }
    $: [mechLead, mechDetail] = pattern ? splitMechanism(pattern.card.mechanism) : ['', ''];

    async function runFlow(loc: LatLon) {
        // Abort any prior in-flight fetch — rapid clicks shouldn't pile up
        // (and can otherwise spike Open-Meteo's free-tier rate limit).
        if (inflight) {
            inflight.abort();
            inflight = null;
        }
        if (visualCleanup) {
            visualCleanup();
            visualCleanup = null;
        }
        showCatalog = false;
        // A real click ends any active map tour — clear its caption + marker so
        // the card (and the pattern's own visual) take over cleanly.
        tour = null;
        if (tourCleanup) {
            tourCleanup();
            tourCleanup = null;
        }
        if (tourInflight) {
            tourInflight.abort();
            tourInflight = null;
        }

        isLoading = true;
        error = null;
        facts = null;
        pattern = null;

        currentLayer = (store.get('overlay') as WindyOverlay) ?? 'wind';
        currentLayerSupported = coveredLayers.has(currentLayer);
        const level = (store.get('level') as string) ?? 'surface';
        const ctx: DetectContext = { activeLayer: currentLayer, level };

        const ac = new AbortController();
        inflight = ac;

        try {
            const f = await fetchFacts(loc.lat, loc.lon, ac.signal);
            facts = f;

            // 1. Try a specific pattern.
            const result = pickPattern(ctx, f);
            if (result.module) {
                const card = result.module.content(f, result.params);
                const cleanup = result.module.visual(map, f, result.params);
                pattern = {
                    id: result.module.id,
                    location: f.location,
                    layer: currentLayer,
                    card,
                };
                visualCleanup = cleanup;
            } else {
                // 2. Fall back to a layer-default card if this layer has one.
                const defaultCard = getLayerDefault(currentLayer, f, ctx);
                if (defaultCard) {
                    pattern = {
                        id: 'layer_default',
                        location: f.location,
                        layer: currentLayer,
                        card: defaultCard,
                    };
                    // No visual cleanup needed — defaults don't draw.
                }
                // 3. Otherwise: render the "layer not yet supported" UI fallback.
            }
            setUrl(name, { lat: loc.lat, lon: loc.lon });
        } catch (e: any) {
            // Aborts (from a newer click) are expected — silently swallow them.
            if (e?.name === 'AbortError') return;
            error = e?.message ?? String(e);
        } finally {
            if (inflight === ac) inflight = null;
            isLoading = false;
        }
    }

    function switchLayer(overlay: WindyOverlay) {
        // Trigger the cross-layer toggle in Windy. The user immediately sees
        // the suggested layer; the card stays put so they can keep reading.
        store.set('overlay', overlay);
    }

    // ---- Catalogue map tour ----
    // Clicking a catalogue row switches the map to the pattern's layer; the few
    // "locatable" pressure patterns additionally fly to + mark a live feature.
    // The pane shrinks to a one-line caption — the map does the teaching.

    // Thresholds mirror the detectors / viewport markers so the flown-to feature
    // is the same "real" low/high they use (cyclonic_inflow < 1010; heat_dome's
    // strong high > 1018; gradient needs a genuine high–low span).
    const TOUR_LOW_MAX_HPA = 1010;
    const TOUR_HIGH_MIN_HPA = 1018;
    const TOUR_GRADIENT_MIN_SPAN_HPA = 8;
    const FLY_OPTS = { duration: 1.6, easeLinearity: 0.25 };

    function mapReady(): boolean {
        return (
            !!map &&
            typeof (map as any).flyTo === 'function' &&
            typeof (map as any).getCenter === 'function'
        );
    }

    function tourLayerLabel(entry: PatternCatalogEntry): string {
        const base = layerLabel(entry.overlay);
        if (entry.level && entry.level !== 'surface') {
            return `${base} at ${entry.level.replace('h', ' hPa')}`;
        }
        return entry.level === 'surface' ? `${base} · surface` : base;
    }

    async function runTour(entry: PatternCatalogEntry) {
        showCatalog = false;

        // Switch the layer (and wind level, for the level-gated patterns).
        store.set('overlay', entry.overlay);
        if (entry.level) store.set('level', entry.level);

        // Reset any prior tour marker / in-flight grid fetch.
        if (tourCleanup) {
            tourCleanup();
            tourCleanup = null;
        }
        if (tourInflight) {
            tourInflight.abort();
            tourInflight = null;
        }

        const label = tourLayerLabel(entry);

        // Tier 2 — switch the layer and show a pattern-intro card so the user
        // knows what to look for. Tap the map anywhere to get a live reading.
        if (!entry.locate) {
            tour = { caption: entry.tourHint, nudge: '', flew: false, patternTitle: entry.title };
            return;
        }

        // Tier 1 — flyTo; degrade to hint if map API unavailable.
        if (!mapReady()) {
            tour = { caption: `Switched to ${label}. ${entry.tourHint}`, nudge: '', flew: false };
            return;
        }

        // Tier 1 — try to fly to + mark a live pressure feature near the view.
        tour = { caption: 'Looking for a live one near you…', nudge: '', flew: false };
        const ac = new AbortController();
        tourInflight = ac;
        try {
            const center = (map as any).getCenter();
            const { radiusDeg, stepDeg } = gridForBounds(map);
            const grid = await fetchPressureGrid(center.lat, center.lng, ac.signal, radiusDeg, stepDeg);
            if (ac.signal.aborted) return;
            const syn = findSynopticFeatures(grid, center.lat, center.lng);
            if (!placeTourFeature(entry, syn)) {
                // Nothing qualifying in view — degrade to the eye-guide fallback.
                tour = { caption: `Switched to ${label}. ${entry.tourHint}`, nudge: '', flew: false };
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            // A tour must never hard-error; fall back to guidance.
            tour = { caption: `Switched to ${label}. ${entry.tourHint}`, nudge: '', flew: false };
        } finally {
            if (tourInflight === ac) tourInflight = null;
        }
    }

    function placeTourFeature(entry: PatternCatalogEntry, syn: Facts['synoptic']): boolean {
        const lo = syn.nearest_low;
        const hi = syn.nearest_high;

        if (entry.locate === 'low') {
            if (!Number.isFinite(lo.pressure_hPa) || lo.pressure_hPa > TOUR_LOW_MAX_HPA) return false;
            if (!Number.isFinite(lo.lat) || !Number.isFinite(lo.lon)) return false;
            const loc = { lat: lo.lat, lon: lo.lon };
            const m = makeGlyphMarker(lo.lat, lo.lon, 'Low', 'low', undefined, true).addTo(map);
            let tid: ReturnType<typeof setTimeout> | null = null;
            tourCleanup = () => { m.remove(); if (tid) clearTimeout(tid); };
            (map as any).flyTo([lo.lat, lo.lon], 5, FLY_OPTS);
            tour = {
                caption: `Flew to a low about ${lo.distance_km.toLocaleString()} km to the ${lo.compass}. Loading why…`,
                nudge: '',
                flew: true,
            };
            // Auto-explain: start the card flow after the fly animation completes.
            tid = setTimeout(() => void runFlow(loc), 1700);
            return true;
        }

        if (entry.locate === 'high') {
            if (!Number.isFinite(hi.pressure_hPa) || hi.pressure_hPa < TOUR_HIGH_MIN_HPA) return false;
            if (!Number.isFinite(hi.lat) || !Number.isFinite(hi.lon)) return false;
            const loc = { lat: hi.lat, lon: hi.lon };
            const m = makeGlyphMarker(hi.lat, hi.lon, 'High', 'high', undefined, true).addTo(map);
            let tid: ReturnType<typeof setTimeout> | null = null;
            tourCleanup = () => { m.remove(); if (tid) clearTimeout(tid); };
            (map as any).flyTo([hi.lat, hi.lon], 5, FLY_OPTS);
            tour = {
                caption: `Flew to a high about ${hi.distance_km.toLocaleString()} km to the ${hi.compass}. Loading why…`,
                nudge: '',
                flew: true,
            };
            tid = setTimeout(() => void runFlow(loc), 1700);
            return true;
        }

        // gradient — need a genuine high AND low to frame the squeeze between them.
        const haveBoth =
            Number.isFinite(lo.lat) &&
            Number.isFinite(hi.lat) &&
            Number.isFinite(lo.pressure_hPa) &&
            Number.isFinite(hi.pressure_hPa) &&
            hi.pressure_hPa - lo.pressure_hPa >= TOUR_GRADIENT_MIN_SPAN_HPA;
        if (!haveBoth) return false;
        // Passive markers — the gradient lives BETWEEN them, so the nudge sends
        // the click into the gap (clicking a centre would tell the L/H story).
        const mLo = makeGlyphMarker(lo.lat, lo.lon, 'Low', 'low', undefined, true).addTo(map);
        const mHi = makeGlyphMarker(hi.lat, hi.lon, 'High', 'high', undefined, true).addTo(map);
        tourCleanup = () => {
            mLo.remove();
            mHi.remove();
        };
        if (typeof (map as any).flyToBounds === 'function') {
            (map as any).flyToBounds(
                [
                    [lo.lat, lo.lon],
                    [hi.lat, hi.lon],
                ],
                { ...FLY_OPTS, maxZoom: 5, padding: [40, 40] },
            );
        } else {
            (map as any).flyTo([(lo.lat + hi.lat) / 2, (lo.lon + hi.lon) / 2], 4, FLY_OPTS);
        }
        tour = {
            caption:
                'Framed the squeeze between the nearest high and low — wind accelerates through the packed isobars between them.',
            nudge: 'Click into the gap between them to read why.',
            flew: true,
        };
        return true;
    }

    function exitTour() {
        if (tourInflight) {
            tourInflight.abort();
            tourInflight = null;
        }
        if (tourCleanup) {
            tourCleanup();
            tourCleanup = null;
        }
        tour = null;
        showCatalog = true; // back to the catalogue; leave the map where it is
    }

    function backToHome() {
        if (inflight) { inflight.abort(); inflight = null; }
        if (visualCleanup) { visualCleanup(); visualCleanup = null; }
        pattern = null;
        facts = null;
        error = null;
        isLoading = false;
        showCatalog = true;
    }

    // Remove trailing "then click X" instructions from tourHints — clicking is
    // implicit when the map is active; no need to direct the user explicitly.
    function stripClickHint(s: string): string {
        return s.replace(/[,.]?\s*(then click\b[^.]*|click\b[^.]*)\.$/, '.').trimEnd();
    }

    function fmtCoords(loc: LatLon): string {
        return `${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°`;
    }

    function layerLabel(o: WindyOverlay | null | undefined): string {
        if (!o) return '';
        const labels: Record<string, string> = {
            wind: 'Wind',
            gust: 'Gust',
            rain: 'Rain',
            rainAccu: 'Rain Accum.',
            radar: 'Radar',
            satellite: 'Satellite',
            pressure: 'Pressure',
            temp: 'Temperature',
            clouds: 'Clouds',
            cloudtop: 'Cloud Tops',
            cape: 'CAPE',
            waves: 'Waves',
            swell1: 'Swell 1',
            swell2: 'Swell 2',
            aqi: 'Air Quality',
            pm2p5: 'PM2.5',
            dustsm: 'Dust',
            visibility: 'Visibility',
            fog: 'Fog',
        };
        return labels[o] ?? o;
    }

    export const onopen = (params?: LatLon) => {
        if (params && typeof params.lat === 'number' && typeof params.lon === 'number') {
            runFlow(params);
        }
    };

    onMount(() => {
        singleclick.on(name, runFlow);
        // Proactive lows/highs markers — clickable hints for where the pressure
        // stories are. A marker click reuses the normal click flow (runFlow).
        viewportCleanup = initViewportMarkers(map, runFlow);
    });

    onDestroy(() => {
        if (inflight) {
            inflight.abort();
            inflight = null;
        }
        if (visualCleanup) {
            visualCleanup();
            visualCleanup = null;
        }
        if (viewportCleanup) {
            viewportCleanup();
            viewportCleanup = null;
        }
        if (tourCleanup) {
            tourCleanup();
            tourCleanup = null;
        }
        if (tourInflight) {
            tourInflight.abort();
            tourInflight = null;
        }
        singleclick.off(name, runFlow);
    });
</script>

<style lang="less">
    // All colors/spacing chosen to inherit from Windy's theme. We never set
    // explicit foreground colors — text inherits Windy's primary color (works
    // in light AND dark mode). For muting we use `opacity`. Backgrounds use
    // `rgba(127,127,127,X)` so they show as a faint tint over either theme.

    // ---------- Header (replaces default plugin__title styling) ----------

    // Single accent — one mid-tone blue that stays legible on Windy's light AND
    // dark backgrounds. Used ONLY on interactive / status bits, never body text.
    // Tune here if it reads weak in either theme.
    @accent: #2e7dc4;

    .ww-header {
        // Selector specificity beats Windy's own .plugin__title rules
        // without using !important.
        &.plugin__title {
            display: flex;
            align-items: center;
        }
    }

    .ww-header-mark {
        font-size: 0.98em;
        font-weight: 500;
        letter-spacing: 0.22em;       // wide tracking for the small-caps feel
        text-transform: uppercase;     // belt-and-braces in case the title
                                       // string ever changes case
        opacity: 0.92;
    }

    .ww-accent-dot {
        color: @accent;
        font-weight: 700;
        opacity: 1;
    }

    .ww-header-rule {
        height: 1px;
        margin: 0.55em 0 1.1em;
        background: rgba(127, 127, 127, 0.22);
    }

    // ---------- Shared building blocks ----------

    .ww-state, .ww-card {
        padding: 0.25em 0 1.25em;     // tighter top now that the rule provides spacing
    }

    .ww-state p, .ww-card-mechanism {
        line-height: 1.6;
        margin: 0 0 0.7em;
    }

    .ww-state p {
        font-size: 0.95em;
    }

    // ---------- Meta strip + section labels (faint uppercase) ----------

    .ww-meta, .ww-coords, .ww-section-label {
        font-size: 0.7em;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-feature-settings: 'tnum';
        opacity: 0.55;
    }

    .ww-meta {
        margin-bottom: 0.7em;

        .ww-meta-sep { margin: 0 0.35em; opacity: 0.5; }
        .ww-meta-layer { opacity: 1; }   // already faded via parent
    }

    .ww-coords {
        margin-bottom: 0.5em;
    }

    .ww-section-label {
        margin-bottom: 0.55em;
        font-weight: 600;
        opacity: 0.6;
    }

    // ---------- Card: the four-beat structure ----------

    .ww-card {
        animation: ww-fade-in 0.3s ease-out;
    }

    .ww-card-title {
        margin: 0 0 0.85em;
        font-size: 1.35em;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
    }

    .ww-card-lead {
        margin: 0 0 0.85em;
        font-size: 1.02em;
        line-height: 1.6;
        font-weight: 500;
    }

    .ww-card-mechanism {
        margin: 0 0 1.4em;
        font-size: 0.92em;
        line-height: 1.72;
    }

    .ww-card-section {
        margin-bottom: 1.4em;
    }

    // ---------- Clickable layer-toggle buttons ----------

    .ww-toggle-button {
        display: flex;
        align-items: flex-start;
        gap: 0.55em;
        width: 100%;
        margin: 0 0 0.45em;
        padding: 0.75em 0.95em;
        background: rgba(127, 127, 127, 0.1);
        border: 1px solid rgba(127, 127, 127, 0.18);
        border-radius: 0.55em;
        font-family: inherit;
        font-size: 0.92em;
        color: inherit;
        text-align: left;
        cursor: pointer;
        line-height: 1.45;
        transition: background 0.15s, border-color 0.15s, transform 0.05s;

        &:hover {
            background: rgba(127, 127, 127, 0.18);
            border-color: rgba(127, 127, 127, 0.32);
        }

        &:active {
            background: rgba(127, 127, 127, 0.25);
            transform: translateY(0.5px);
        }

        .ww-toggle-arrow {
            flex-shrink: 0;
            font-weight: 700;
            opacity: 0.5;
        }

        .ww-toggle-text { flex: 1; }
    }

    // ---------- Closer: italic, small, muted ----------

    .ww-card-remember p {
        margin: 0;
        font-size: 0.86em;
        line-height: 1.55;
        font-style: italic;
        opacity: 0.65;
    }

    // ---------- Catalogue: clickable map-tour rows ----------

    .ww-cat-sublabel {
        font-size: 0.7em;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;
        opacity: 0.55;
        margin: 0 0 1.1em;
    }

    .ww-cat-group {
        display: flex;
        align-items: baseline;
        gap: 0.4em;
        margin: 1.15em 0 0.6em;
        font-size: 0.82em;
        line-height: 1.4;
        opacity: 0.78;

        &:first-of-type { margin-top: 0; }

        .ww-cat-group-pin { font-size: 1.05em; }
    }

    .ww-cat-row {
        display: flex;
        align-items: center;
        gap: 0.5em;
        width: 100%;
        margin: 0 0 0.4em;
        padding: 0.62em 0.7em 0.62em 0.85em;
        background: rgba(127, 127, 127, 0.1);
        border: 1px solid rgba(127, 127, 127, 0.18);
        border-radius: 0.55em;
        font-family: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, transform 0.05s;

        &:hover {
            background: rgba(127, 127, 127, 0.18);
            border-color: rgba(127, 127, 127, 0.34);
        }

        &:active { transform: translateY(0.5px); }

        .ww-cat-row-body { flex: 1; min-width: 0; }

        .ww-cat-row-title {
            display: block;
            font-size: 0.92em;
            font-weight: 600;
            line-height: 1.3;
        }

        .ww-cat-row-layer {
            display: block;
            margin-top: 0.2em;
            font-size: 0.72em;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            opacity: 0.55;
        }

        .ww-cat-pin { flex-shrink: 0; font-size: 0.95em; }

        .ww-cat-arrow { flex-shrink: 0; font-weight: 700; opacity: 0.45; }
    }

    // The locatable few get the single accent — a quiet hint that these behave
    // differently (they fly to a live feature), without shouting.
    .ww-cat-row--locatable {
        border-color: fade(@accent, 38%);
        background: fade(@accent, 8%);

        &:hover {
            border-color: fade(@accent, 55%);
            background: fade(@accent, 14%);
        }
    }

    // ---------- Map-tour caption (the shrunk pane) ----------

    .ww-state--tour { animation: ww-fade-in 0.3s ease-out; }

    .ww-tour-tier {
        display: inline-block;
        margin-bottom: 0.85em;
        padding: 0.2em 0.62em;
        border-radius: 0.4em;
        font-size: 0.64em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        border: 1px solid rgba(127, 127, 127, 0.3);
    }

    .ww-tour-tier--fly {
        color: @accent;
        border-color: fade(@accent, 45%);
        background: fade(@accent, 12%);
    }

    // Tier-2 intro: pattern name as the headline
    .ww-tour-title {
        margin: 0 0 0.75em;
        font-size: 1.3em;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
    }

    .ww-tour-caption {
        margin: 0 0 0.9em;
        font-size: 1.08em;
        line-height: 1.55;
        font-weight: 500;
    }

    .ww-tour-cta {
        margin: 0.6em 0 0;
        font-size: 0.85em;
        line-height: 1.5;
        opacity: 0.55;
        font-style: italic;
    }

    .ww-tour-nudge {
        display: flex;
        gap: 0.5em;
        font-size: 0.92em;
        line-height: 1.5;
        opacity: 0.72;

        .ww-tour-nudge-arrow { opacity: 0.6; }
    }

    // ---------- Loading / error / fallback subtleties ----------

    .ww-state--loading p { font-style: italic; opacity: 0.65; }

    .ww-state--error {
        .ww-error-help {
            font-size: 0.92em;
            margin-bottom: 0.85em;
            opacity: 0.8;
        }

        .ww-error-details {
            margin-top: 0.4em;
            font-size: 0.8em;
            opacity: 0.55;

            summary {
                cursor: pointer;
                user-select: none;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                font-size: 0.85em;
            }

            pre {
                margin: 0.55em 0 0;
                padding: 0.5em 0.7em;
                background: rgba(127, 127, 127, 0.1);
                border-radius: 0.35em;
                font-family: ui-monospace, 'SF Mono', Menlo, monospace;
                font-size: 0.85em;
                line-height: 1.45;
                white-space: pre-wrap;
                word-break: break-all;
                overflow-x: auto;
            }
        }
    }

    .ww-state--fallback .ww-fallback-detail {
        margin-top: 0.6em;
        font-size: 0.88em;
        line-height: 1.55;
        opacity: 0.7;
    }

    // ---------- Phase 3: badge / schematic / discoverability / catalogue ----------

    // Status label (not a box) — sits beside the back link in the card top bar.
    .ww-badge {
        display: inline-block;
        font-size: 0.64em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.12em;
    }

    .ww-badge--pattern {
        color: @accent;
    }

    .ww-badge--default {
        opacity: 0.5;
        font-style: italic;
        letter-spacing: 0.08em;
    }

    .ww-section-hint {
        text-transform: none;
        letter-spacing: 0;
        font-weight: 400;
        opacity: 0.8;
    }

    // Give the "Remember" caveat a touch more presence — a hairline, not volume.
    .ww-card-remember {
        border-top: 1px solid rgba(127, 127, 127, 0.18);
        padding-top: 1.05em;
    }

    // Card top bar: back nav + status label on one compact row (no vertical bulk,
    // no clashing boxes — the badge is a plain label, only the back link is boxed).
    .ww-card-topbar {
        display: flex;
        align-items: center;
        gap: 0.7em;
        margin-bottom: 0.85em;

        .ww-back-link { margin: 0; }
        .ww-badge { margin: 0; }
    }

    .ww-back-link {
        display: inline-flex;
        align-items: center;
        margin: 0 0 1em;
        padding: 0.38em 0.75em;
        background: rgba(127, 127, 127, 0.12);
        border: 1px solid rgba(127, 127, 127, 0.28);
        border-radius: 0.45em;
        color: inherit;
        font-family: inherit;
        font-size: 0.82em;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;

        &:hover {
            background: rgba(127, 127, 127, 0.22);
            border-color: rgba(127, 127, 127, 0.44);
        }
    }

    @keyframes ww-fade-in {
        from { opacity: 0; transform: translateY(2px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    // ---------- Map glyphs (plugin annotations drawn onto Windy's map) ----------
    // Injected into Leaflet's DOM outside the Svelte component tree, so styled
    // via :global. Text inherits Windy's theme color; the tint + hairline match
    // the card system so the glyph reads as plugin UI — never as a Windy-native
    // control. (The v0.1 "Low" badge was dropped for exactly that failure mode.)

    :global(.ww-map-glyph-icon) {
        background: transparent;   // reset Leaflet's default white DivIcon box
        border: 0;
    }

    :global(.ww-map-glyph) {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 0 0.5em;
        background: rgba(127, 127, 127, 0.2);
        border: 1px solid rgba(127, 127, 127, 0.36);
        border-radius: 0.5em;
        color: inherit;            // inherit Windy's theme primary — light + dark
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        white-space: nowrap;
        opacity: 0.9;
    }

    :global(.ww-map-glyph--clickable) {
        position: relative;        // anchor the enlarged hit-area pseudo-element
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
    }

    // Expand the touch/click target to >=44px tall (WCAG 2.5.5) WITHOUT changing
    // the 44x18 visual or the Leaflet anchor — a transparent pseudo-element does it.
    :global(.ww-map-glyph--clickable::before) {
        content: '';
        position: absolute;
        inset: -13px 0;            // 18px visual + 2x13px = 44px touch height
    }

    :global(.ww-map-glyph--clickable:hover) {
        background: rgba(127, 127, 127, 0.32);
        border-color: rgba(127, 127, 127, 0.55);
        opacity: 1;
    }

    // Visible keyboard-focus ring, theme-inheriting via currentColor.
    :global(.ww-map-glyph--clickable:focus-visible) {
        outline: 2px solid currentColor;
        outline-offset: 2px;
        opacity: 1;
    }

    // Tour-placed markers — accent colour so they read against any layer.
    :global(.ww-map-glyph--tour) {
        color: @accent;
        border-color: fade(@accent, 65%);
        background: fade(@accent, 18%);
        opacity: 1;
    }

</style>
