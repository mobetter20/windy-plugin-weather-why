<div class="plugin__mobile-header">
    {title}
</div>

<section class="plugin__content ww-content">
    <div
        class="plugin__title plugin__title--chevron-back ww-header"
        on:click={() => bcast.emit('rqstOpen', 'menu')}
    >
        <span class="ww-header-mark">WEATHER <span class="ww-accent-dot">·</span> WHY</span>
    </div>
    <div class="ww-header-rule"></div>

    {#if showCatalog}
        <div class="ww-state ww-state--intro ww-state--catalog">
            <button class="ww-back-link" type="button" on:click={toggleCatalog}>← back</button>
            <div class="ww-intro-hint">
                <div class="ww-intro-hint-label">Everything Weather Why can explain</div>
                <ul>
                    {#each CATALOG as p}
                        <li><strong>{p.title}</strong> <span class="ww-intro-layer">— {p.layerHint}</span></li>
                    {/each}
                </ul>
            </div>
        </div>
    {:else if error}
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
            <span
                class="ww-badge {pattern.id === 'layer_default'
                    ? 'ww-badge--default'
                    : 'ww-badge--pattern'}"
            >{pattern.id === 'layer_default' ? 'Layer basics' : '✓ Pattern'}</span>

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
            <p class="ww-intro-lede">
                Click anywhere on the map — and find out <em>why</em> the weather there is
                doing what it's doing.
            </p>
            <p class="ww-intro-sub">
                Wind, rain, temperature, air quality, waves and more. {CATALOG.length} patterns,
                each with the mechanism behind it and a one-tap way to check it against a
                related layer.
            </p>
            <button class="ww-intro-cta" type="button" on:click={toggleCatalog}>
                See all {CATALOG.length} patterns →
            </button>
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

    let showCatalog = false; // the "what I can explain" catalogue view

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

    function toggleCatalog() {
        showCatalog = !showCatalog;
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

    // ---------- Phase 3: badge / schematic / discoverability / catalogue ----------

    .ww-badge {
        display: inline-block;
        margin-bottom: 0.7em;
        padding: 0.2em 0.62em;
        border-radius: 0.4em;
        font-size: 0.64em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        border: 1px solid rgba(127, 127, 127, 0.3);
    }

    .ww-badge--pattern {
        color: @accent;
        border-color: fade(@accent, 45%);
        background: fade(@accent, 12%);
    }

    .ww-badge--default {
        opacity: 0.5;
        background: transparent;
        font-style: italic;
        letter-spacing: 0.08em;
    }

    .ww-schematic {
        margin: 0 0 1.25em;

        :global(svg) {
            display: block;
            width: 96px;
            height: auto;
            opacity: 0.78;
        }
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

    .ww-coachmark {
        position: relative;
        margin: 0 0 1.15em;
        padding: 0.8em 2.1em 0.8em 0.95em;
        background: rgba(127, 127, 127, 0.1);
        border: 1px solid rgba(127, 127, 127, 0.2);
        border-radius: 0.55em;
        font-size: 0.86em;
        line-height: 1.5;

        p { margin: 0; opacity: 0.85; }
    }

    .ww-coachmark-dismiss {
        position: absolute;
        top: 0.35em;
        right: 0.5em;
        padding: 0.15em 0.4em;
        background: none;
        border: 0;
        color: inherit;
        font-family: inherit;
        font-size: 1.15em;
        line-height: 1;
        cursor: pointer;
        opacity: 0.5;

        &:hover { opacity: 0.9; }
    }

    .ww-catalog-toggle {
        flex-shrink: 0;               // never let it squeeze or wrap the wordmark
        margin-left: auto;            // sit at the right edge of the header flex row
        padding: 0.3em 0.7em;
        background: rgba(127, 127, 127, 0.14);
        border: 1px solid rgba(127, 127, 127, 0.3);
        border-radius: 0.45em;
        color: inherit;
        font-family: inherit;
        font-size: 11px;              // FIXED, not em — the title's base font is large
        font-weight: 600;
        letter-spacing: 0.02em;
        white-space: nowrap;
        cursor: pointer;
        opacity: 0.85;
        transition: background 0.15s, opacity 0.15s;

        &:hover { opacity: 1; background: rgba(127, 127, 127, 0.24); }
    }

    .ww-back-link {
        margin: 0 0 0.9em;
        padding: 0;
        background: none;
        border: 0;
        color: inherit;
        font-family: inherit;
        font-size: 0.82em;
        cursor: pointer;
        opacity: 0.65;

        &:hover { opacity: 0.95; }
    }

    // ---------- Intro redesign: hero + value-prop + CTA ----------

    .ww-intro-hero {
        margin: 0.4em 0 1.2em;

        :global(svg) {
            width: 116px;
            height: auto;
            opacity: 0.45;
        }
    }

    .ww-intro-lede {
        margin: 0 0 0.75em;
        font-size: 1.18em;
        line-height: 1.45;
        font-weight: 500;
        opacity: 0.95;

        em { font-style: italic; }
    }

    .ww-intro-sub {
        margin: 0 0 1.35em;
        font-size: 0.92em;
        line-height: 1.55;
        opacity: 0.68;
    }

    .ww-intro-cta {
        width: 100%;
        padding: 0.72em 1em;
        background: rgba(127, 127, 127, 0.14);
        border: 1px solid rgba(127, 127, 127, 0.3);
        border-radius: 0.5em;
        color: inherit;
        font-family: inherit;
        font-size: 0.95em;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;

        &:hover {
            background: rgba(127, 127, 127, 0.24);
            border-color: rgba(127, 127, 127, 0.45);
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
</style>
