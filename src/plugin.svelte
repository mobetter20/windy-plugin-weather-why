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
    {:else if phenomenon && facts}
        <div class="ww-result">
            <div class="ww-coords">{fmtCoords(facts.location)}</div>
            {#if currentConditions}
                <div class="ww-conditions">{currentConditions}</div>
            {/if}
            <p class="ww-opener">{phenomenon.content.opener}</p>
            {#each phenomenon.content.body as chunk}
                <div class="ww-bubble">
                    <span class="ww-emoji">{chunk.emoji}</span>
                    <span class="ww-text">{chunk.text}</span>
                </div>
            {/each}
            <p class="ww-closer">{@html renderItalic(phenomenon.content.closer)}</p>
            <p class="ww-attribution">{phenomenon.label}</p>
        </div>
    {:else if facts && !phenomenon}
        <div class="ww-state ww-state--fallback">
            <div class="ww-coords">{fmtCoords(facts.location)}</div>
            {#if currentConditions}
                <div class="ww-conditions">{currentConditions}</div>
            {/if}
            <p>I don't have a confident story for this one yet.</p>
            <p class="ww-fallback-detail">
                More phenomenon types are coming (frontal passage, low pressure, sea breeze, jet steering, convective afternoons). Try clicking somewhere with more dramatic weather.
            </p>
        </div>
    {:else}
        <div class="ww-state ww-state--intro">
            <h2>Click anywhere on the map.</h2>
            <p>Find out why the weather there is doing what it's doing — visual annotations on the map plus a friendly science teacher in the side panel.</p>
            <p class="ww-intro-detail">
                The first phenomenon module (high pressure dominance) is live. More are coming.
            </p>
        </div>
    {/if}
</section>

<script lang="ts">
    import bcast from '@windy/broadcast';
    import { map } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import { setUrl } from '@windy/location';
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';
    import { fetchFacts } from './lib/facts';
    import { pickPhenomenon } from './lib/phenomena';
    import type { ContentBlock, Facts, LatLon } from './lib/types';

    const { name, title } = config;

    let isLoading = false;
    let facts: Facts | null = null;
    let error: string | null = null;
    let phenomenon:
        | { id: string; label: string; content: ContentBlock }
        | null = null;
    let visualCleanup: (() => void) | null = null;
    let currentConditions: string | null = null;

    async function runFlow(loc: LatLon) {
        // Clean up the previous click's map drawings before starting the new fetch.
        if (visualCleanup) {
            visualCleanup();
            visualCleanup = null;
        }

        isLoading = true;
        error = null;
        facts = null;
        phenomenon = null;
        currentConditions = null;

        try {
            const f = await fetchFacts(loc.lat, loc.lon);
            facts = f;
            currentConditions = formatCurrentConditions(f);

            const result = pickPhenomenon(f);
            if (result.module) {
                const content = result.module.content(f, result.params);
                const cleanup = result.module.visual(map, f, result.params);
                phenomenon = {
                    id: result.module.id,
                    label: result.module.label,
                    content,
                };
                visualCleanup = cleanup;
            }
            setUrl(name, { lat: loc.lat, lon: loc.lon });
        } catch (e: any) {
            error = e?.message ?? String(e);
        } finally {
            isLoading = false;
        }
    }

    function fmtCoords(loc: LatLon): string {
        return `${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°`;
    }

    function formatCurrentConditions(f: Facts): string | null {
        const s = f.surface;
        const parts: string[] = [];
        if (s.temperature_C != null) parts.push(`${Math.round(s.temperature_C)}°C`);
        if (s.wind_compass && s.wind_speed_kmh != null) {
            parts.push(`${s.wind_compass} ${Math.round(s.wind_speed_kmh)} km/h`);
        }
        if (s.pressure_msl_hPa != null) parts.push(`${Math.round(s.pressure_msl_hPa)} hPa`);
        if (s.cloud_cover_pct != null) parts.push(`${Math.round(s.cloud_cover_pct)}% cloud`);
        return parts.length > 0 ? parts.join(' · ') : null;
    }

    // Tiny markdown — only handles _italic_ since that's all the curated content uses.
    function renderItalic(s: string): string {
        return s.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    }

    // Plugin opened from URL or from contextmenu (right-click on map) with lat/lon.
    export const onopen = (params?: LatLon) => {
        if (params && typeof params.lat === 'number' && typeof params.lon === 'number') {
            runFlow(params);
        }
        // Otherwise: opened from main menu, no location yet → show the intro state
        // until the user clicks somewhere on the map.
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
    .ww-content {
        font-family:
            -apple-system,
            system-ui,
            'SF Pro Text',
            'Helvetica Neue',
            sans-serif;
    }

    .ww-state {
        padding: 1.25em 0 1em;

        p {
            margin: 0 0 0.55em;
            line-height: 1.55;
        }

        h2 {
            margin: 0 0 0.5em;
            font-size: 1.15em;
            font-weight: 600;
            letter-spacing: -0.005em;
        }

        &--intro {
            p {
                color: #5a5a55;
                font-size: 0.95em;
            }
            .ww-intro-detail {
                margin-top: 1em;
                font-size: 0.78em;
                color: #999992;
                font-style: italic;
            }
        }

        &--loading p {
            color: #888884;
            font-style: italic;
        }

        &--error {
            .ww-error-detail {
                font-size: 0.78em;
                color: #888;
                font-family: ui-monospace, 'SF Mono', Menlo, monospace;
                background: #f5f1e8;
                padding: 0.4em 0.6em;
                border-radius: 0.3em;
            }
        }

        &--fallback {
            p {
                color: #5a5a55;
                font-size: 0.95em;
            }
            .ww-fallback-detail {
                margin-top: 0.7em;
                font-size: 0.85em;
                color: #888884;
            }
        }
    }

    .ww-result {
        padding: 0.5em 0 1.5em;
    }

    .ww-coords {
        font-size: 0.7em;
        color: #888884;
        margin-bottom: 0.45em;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-feature-settings: 'tnum';
    }

    .ww-conditions {
        margin: 0 0 1.2em;
        padding: 0.5em 0.75em;
        background: rgba(180, 165, 130, 0.16);
        border-radius: 0.45em;
        font-size: 0.82em;
        color: #5a4a30;
        font-feature-settings: 'tnum';
    }

    .ww-opener {
        margin: 0 0 1em;
        font-size: 1.2em;
        font-weight: 600;
        line-height: 1.35;
        color: #1a1a16;
        letter-spacing: -0.005em;
    }

    .ww-bubble {
        display: flex;
        gap: 0.55em;
        align-items: flex-start;
        margin: 0 0 0.55em;
        padding: 0.7em 0.9em;
        background: #f3efe5;
        border-radius: 0.7em;
        border-bottom-left-radius: 0.25em;
        line-height: 1.55;
        font-size: 0.95em;
        color: #2a2a26;
        animation: ww-fade-in 0.25s ease-out;

        .ww-emoji {
            flex-shrink: 0;
            font-size: 1.05em;
            line-height: 1.55;
        }
    }

    .ww-closer {
        margin: 1.1em 0 0;
        font-style: italic;
        color: #6a5a3a;
        text-align: center;
        font-size: 0.92em;
        line-height: 1.5;

        :global(em) {
            font-style: italic;
        }
    }

    .ww-attribution {
        margin-top: 1.6em;
        font-size: 0.7em;
        color: #b0b0a8;
        letter-spacing: 0.06em;
        font-family: ui-monospace, 'SF Mono', Menlo, monospace;
        text-align: right;
    }

    @keyframes ww-fade-in {
        from {
            opacity: 0;
            transform: translateY(2px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    // Map-overlay styles must escape Svelte's scoped CSS via :global().
    // Leaflet appends DivIcon HTML directly to the DOM, outside this component's tree.
    :global(.ww-h) {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Georgia, 'Times New Roman', serif;
        font-weight: 700;
        font-size: 32px;
        color: #c95a3c;
        text-shadow:
            0 0 6px rgba(255, 255, 255, 0.95),
            0 0 12px rgba(255, 255, 255, 0.7),
            1px 1px 2px rgba(0, 0, 0, 0.15);
        pointer-events: none;
        animation: ww-fade-in 0.3s ease-out;
    }
</style>
