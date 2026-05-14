// Shared map-glyph helper — plugin-coded annotations drawn onto Windy's map.
//
// The CSS (.ww-map-glyph and friends) lives in plugin.svelte as :global rules,
// since these markers are injected into Leaflet's DOM outside the Svelte tree.
// Two consumers: cyclonic_inflow.visual() (a passive marker at the low's
// centre) and viewport_markers (interactive L/H markers the user can click).
//
// The styling bar — set by the dropped v0.1 "Low" badge (commit 9fc032a) — is
// "obviously plugin, or nothing": theme-inherited text, the card system's tint
// and hairline, never a Windy-native pin.
//
// `L` is an ambient global provided by Windy (Leaflet); see declarations/.

type GlyphKind = 'low' | 'high';

// A small plugin-coded chip marker at a lat/lon. Pass `onClick` to make it
// interactive (the proactive viewport markers); omit it for a passive
// annotation (cyclonic_inflow's low marker). Returns an un-added L.Marker —
// the caller does `.addTo(map)` and, later, `.remove()`.
export function makeGlyphMarker(
    lat: number,
    lon: number,
    label: string,
    kind: GlyphKind,
    onClick?: () => void,
): any {
    const interactive = typeof onClick === 'function';
    const cls =
        `ww-map-glyph ww-map-glyph--${kind}` + (interactive ? ' ww-map-glyph--clickable' : '');
    const marker = new L.Marker(
        { lat, lng: lon },
        {
            icon: new L.DivIcon({
                className: 'ww-map-glyph-icon',
                html: `<div class="${cls}">${label}</div>`,
                iconSize: [44, 18],
                iconAnchor: [22, 9],
            }),
            interactive,
        },
    );
    if (onClick) marker.on('click', onClick);
    return marker;
}
