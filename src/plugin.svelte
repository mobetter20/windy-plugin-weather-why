<div class="plugin__mobile-header">
    { title }
</div>
<section class="plugin__content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={ () => bcast.emit('rqstOpen', 'menu') }
    >
        { title }
    </div>

    <div class="ww-intro">
        <h2>Click anywhere on the map.</h2>
        <p>Find out why the weather there is doing what it's doing — visual annotations + a friendly science teacher in your ear.</p>
        <p class="ww-version">v0.1.0 · scaffold</p>
    </div>
</section>

<script lang="ts">
    import bcast from "@windy/broadcast";
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';

    const { title } = config;

    export const onopen = (_params: unknown) => {
        // Phase 1c will wire this up: receive lat/lon from contextmenu open
        // and trigger the explanation flow.
    };

    onMount(() => {
        // Phase 1c: subscribe to map click events here
    });

    onDestroy(() => {
        // Phase 1c: tear down listeners + remove drawn map features here
    });
</script>

<style lang="less">
    .ww-intro {
        padding: 1.25em 0 1em;

        h2 {
            margin: 0 0 0.5em;
            font-size: 1.15em;
            font-weight: 600;
            letter-spacing: -0.005em;
        }

        p {
            margin: 0 0 0.6em;
            color: #5a5a55;
            line-height: 1.55;
            font-size: 0.95em;
        }

        .ww-version {
            margin-top: 1.25em;
            font-family: ui-monospace, "SF Mono", Menlo, monospace;
            font-size: 0.72em;
            color: #aaa;
        }
    }
</style>
