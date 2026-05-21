// In-card schematics — tiny inline SVG diagrams that teach a pattern's SHAPE.
//
// Keyed by pattern id; rendered via {@html} in plugin.svelte (safe — these are
// our own static strings, no interpolation). SVGs use `currentColor` so they
// inherit Windy's theme like the rest of the card, and a viewBox so they scale.
//
// Deliberately PARTIAL: per the plan's "2-then-5" gate we ship the two clearest
// glyphs first (a cyclonic swirl + a front line), QA them in the browser, then
// fan out to the rest only if they read well. A pattern with no entry simply
// renders no schematic — getSchematic returns null and the card omits the slot.
// Abstract patterns (CAPE, gust factor, stagnation) are intentionally excluded:
// a diagram that doesn't teach a shape is decoration, not instruction.

const SCHEMATICS: Record<string, string> = {
    // Wind spiralling inward to a low — an inward spiral toward a centre point.
    // Generic rotation; the card text carries the hemisphere (CCW north / CW south).
    cyclonic_inflow: `<svg viewBox="0 0 120 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
  <path d="M92 32 A24 24 0 1 0 60 8 A16 16 0 1 0 60 24 A8 8 0 1 0 60 32" opacity="0.85"/>
  <path d="M92 32 l-9 -3 M92 32 l-3 9" opacity="0.85"/>
  <circle cx="60" cy="32" r="2.5" fill="currentColor" stroke="none"/>
</svg>`,

    // A front: the boundary between two air masses, drawn with the classic
    // cold-front triangles pointing in the direction the boundary is advancing.
    sharp_temperature_line: `<svg viewBox="0 0 120 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
  <line x1="8" y1="40" x2="112" y2="40" opacity="0.85"/>
  <path d="M24 40 L33 26 L42 40 Z" fill="currentColor" stroke="none"/>
  <path d="M54 40 L63 26 L72 40 Z" fill="currentColor" stroke="none"/>
  <path d="M84 40 L93 26 L102 40 Z" fill="currentColor" stroke="none"/>
</svg>`,
};

export function getSchematic(patternId: string): string | null {
    return SCHEMATICS[patternId] ?? null;
}
