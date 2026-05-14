<div class="plugin__mobile-header">
    {title}
</div>

<section class="plugin__content ww-content">
    <div
        class="plugin__title plugin__title--chevron-back ww-header"
        on:click={() => bcast.emit('rqstOpen', 'menu')}
    >
        <span class="ww-header-mark">WEATHER · WHY</span>
    </div>
    <div class="ww-header-rule"></div>

    {#if error}
        <div class="ww-state ww-state--error">
            <p>Couldn't read the sky just now.</p>
            <p class="ww-error-help">
                A weather data request didn't come back. Open-Meteo (the source) sometimes
                rate-limits rapid clicks on the free tier. Try clicking somewhere else, or
                wait a moment and try again.
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
            <div class="ww-meta">
                {fmtCoords(pattern.location)}
                <span class="ww-meta-sep">·</span>
                <span class="ww-meta-layer">{layerLabel(pattern.layer)} layer</span>
            </div>

            <h2 class="ww-card-title">{pattern.card.title}</h2>

            <p class="ww-card-mechanism">{pattern.card.mechanism}</p>

            <div class="ww-card-section">
                <div class="ww-section-label">Check next</div>
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
    {:else}
        <div class="ww-state ww-state--intro">
            <p class="ww-intro-instruction"><em>click any spot on any layer</em></p>
            <div class="ww-intro-hint">
                <div class="ww-intro-hint-label">Patterns I recognise so far:</div>
                <ul>
                    {#each CATALOG as p}
                        <li><strong>{p.title}</strong> <span class="ww-intro-layer">— {p.layerHint}</span></li>
                    {/each}
                </ul>
            </div>
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
    import { fetchFacts } from './lib/facts';
    import { initViewportMarkers } from './lib/viewport_markers';
    import {
        pickPattern,
        getSupportedLayers,
        getLayerDefault,
        getDefaultedLayers,
        CATALOG,
    } from './lib/patterns';
    import type { DetectContext, Facts, LatLon, PatternCard, WindyOverlay } from './lib/types';

    const { name, title } = config;
    const supportedLayers = getSupportedLayers();
    const defaultedLayers = getDefaultedLayers();
    const coveredLayers = new Set<WindyOverlay>([...supportedLayers, ...defaultedLayers]);
    // Human-readable labels for every covered layer — derived so the fallback
    // copy below can't go stale when a pattern or layer-default is added.
    const coveredLayerLabels = [...coveredLayers].map(layerLabel).sort();

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
            cAQI: 'Air Quality',
            pm2p5: 'PM2.5',
            pm10: 'PM10',
            dust: 'Dust',
            visibility: 'Visibility',
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
        singleclick.off(name, runFlow);
    });
</script>

<style lang="less">
    // All colors/spacing chosen to inherit from Windy's theme. We never set
    // explicit foreground colors — text inherits Windy's primary color (works
    // in light AND dark mode). For muting we use `opacity`. Backgrounds use
    // `rgba(127,127,127,X)` so they show as a faint tint over either theme.

    // ---------- Header (replaces default plugin__title styling) ----------

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
        font-size: 1.3em;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.005em;
    }

    .ww-card-mechanism {
        margin: 0 0 1.4em;
        font-size: 0.97em;
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
            opacity: 0.7;
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

    // ---------- Intro: instruction + patterns hint box ----------

    .ww-intro-instruction {
        margin: 0 0 1em;
        font-size: 0.95em;
        opacity: 0.6;

        em { font-style: italic; }
    }

    .ww-state--intro .ww-intro-hint {
        margin-top: 0.85em;
        padding: 0.85em 1em;
        background: rgba(127, 127, 127, 0.1);
        border: 1px solid rgba(127, 127, 127, 0.18);
        border-radius: 0.55em;
        font-size: 0.9em;
        line-height: 1.55;

        .ww-intro-hint-label {
            font-size: 0.78em;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            opacity: 0.6;
            margin-bottom: 0.55em;
            font-weight: 600;
        }

        ul {
            margin: 0;
            padding: 0;
            list-style: none;
        }

        li {
            margin: 0 0 0.35em;
            line-height: 1.5;
        }

        .ww-intro-layer {
            opacity: 0.65;
            font-size: 0.92em;
        }
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
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
    }

    :global(.ww-map-glyph--clickable:hover) {
        background: rgba(127, 127, 127, 0.32);
        border-color: rgba(127, 127, 127, 0.55);
        opacity: 1;
    }
</style>
