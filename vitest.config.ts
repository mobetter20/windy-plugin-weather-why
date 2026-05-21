import { defineConfig } from 'vitest/config';

// The pattern detectors are pure `(Facts, ctx) -> { active, confidence, params }`
// functions that import only types + small math/marker helpers — no Svelte or
// Windy runtime — so vitest runs them directly under Node, no DOM needed.
// (We never call `visual()` in tests; it touches the Leaflet `L` global.)
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
    },
});
