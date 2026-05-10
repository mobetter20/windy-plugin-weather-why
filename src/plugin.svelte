<div class="plugin__mobile-header">
    {title}
</div>

<section class="plugin__content ww-content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={() => bcast.emit('rqstOpen', 'menu')}
    >
        {title}
    </div>

    {#if error}
        <div class="ww-state ww-state--error">
            <p>Couldn't read the sky just now.</p>
            <p class="ww-error-detail">{error}</p>
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
                    No patterns shipped for the {layerLabel(currentLayer)} layer yet.
                </p>
                <p class="ww-fallback-detail">
                    Phase 1d ships one pattern: <strong>wind curling around a low</strong>, on the
                    <em>Wind</em> layer. Switch to the Wind layer (top of map) and click somewhere
                    with a visible swirl. 12 more patterns queued for upcoming phases.
                </p>
            {/if}
        </div>
    {:else}
        <div class="ww-state ww-state--intro">
            <h2>Click anywhere on the map.</h2>
            <p>I'll read what you're looking at on the active layer and explain the pattern.</p>
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

    let isLoading = false;
    let facts: Facts | null = null;
    let error: string | null = null;
    let currentLayer: WindyOverlay = 'wind';
    let currentLayerSupported = true;
    let pattern:
        | { id: string; location: LatLon; layer: WindyOverlay; card: PatternCard }
        | null = null;
    let visualCleanup: (() => void) | null = null;

    async function runFlow(loc: LatLon) {
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

        try {
            const f = await fetchFacts(loc.lat, loc.lon);
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
            error = e?.message ?? String(e);
        } finally {
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
    });

    onDestroy(() => {
        if (visualCleanup) {
            visualCleanup();
            visualCleanup = null;
        }
        singleclick.off(name, runFlow);
    });
</script>

<style lang="less">
    // All colors/spacing chosen to inherit from Windy's theme. We never set
    // explicit foreground colors — text inherits Windy's primary color (works
    // in light AND dark mode). For muting we use `opacity`. Backgrounds use
    // `rgba(127,127,127,X)` so they show as a faint tint over either theme.

    // ---------- Shared building blocks ----------

    .ww-state, .ww-card {
        padding: 1em 0 1.25em;
    }

    h2 { /* used by intro state */
        margin: 0 0 0.5em;
        font-size: 1.15em;
        font-weight: 600;
        line-height: 1.35;
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

    // ---------- Intro hint box ----------

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

    .ww-state--error .ww-error-detail {
        font-size: 0.78em;
        font-family: ui-monospace, 'SF Mono', Menlo, monospace;
        background: rgba(127, 127, 127, 0.1);
        padding: 0.45em 0.65em;
        border-radius: 0.35em;
        opacity: 0.75;
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
</style>
