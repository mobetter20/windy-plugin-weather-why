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
    tourStyle?: boolean,
): any {
    const interactive = typeof onClick === 'function';
    const cls =
        `ww-map-glyph ww-map-glyph--${kind}` +
        (interactive ? ' ww-map-glyph--clickable' : '') +
        (tourStyle ? ' ww-map-glyph--tour' : '');
    // a11y: a clickable marker is a keyboard-focusable button (activation wired
    // below); a passive marker is just a labelled image.
    const a11y = interactive
        ? ` role="button" tabindex="0" aria-label="${label} pressure centre — open its explanation"`
        : ` role="img" aria-label="${label} pressure centre"`;
    const [w, h] = tourStyle ? [56, 22] : [44, 18];
    const marker = new L.Marker(
        { lat, lng: lon },
        {
            icon: new L.DivIcon({
                className: 'ww-map-glyph-icon',
                html: `<div class="${cls}"${a11y}>${label}</div>`,
                iconSize: [w, h],
                iconAnchor: [w / 2, h / 2],
            }),
            interactive,
        },
    );
    if (onClick) {
        marker.on('click', onClick);
        // Keyboard parity: Enter/Space on the focused marker runs the same flow.
        // (Leaflet's own marker keyboarding is limited; wire it on the element.)
        marker.on('add', () => {
            const el = marker.getElement();
            if (!el) return;
            el.addEventListener('keydown', (ev: KeyboardEvent) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    onClick();
                }
            });
        });
    }
    return marker;
}
