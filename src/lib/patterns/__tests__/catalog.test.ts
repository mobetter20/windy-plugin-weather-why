import { describe, expect, it } from 'vitest';

import { CATALOG, MODULES } from '../index';
import { WINDY_OVERLAYS } from '../../types';
import { stripClickHint } from '../../text';

const byId = new Map(MODULES.map((m) => [m.id, m]));

describe('CATALOG (map-tour data)', () => {
    it('has exactly one entry per shipped pattern module', () => {
        expect(CATALOG.length).toBe(MODULES.length);
        const catIds = CATALOG.map((c) => c.id).sort();
        const modIds = MODULES.map((m) => m.id).sort();
        expect(catIds).toEqual(modIds);
    });

    it('every tour overlay is a canonical Windy overlay', () => {
        const bad = CATALOG.filter((c) => !WINDY_OVERLAYS.includes(c.overlay)).map((c) => c.id);
        expect(bad).toEqual([]);
    });

    // Load-bearing invariant: switching to c.overlay then clicking must be able
    // to fire that pattern, so the overlay has to be one the pattern applies to.
    // Without this, a tour row would switch the layer and then dead-end on click.
    it('every tour overlay is in its pattern appliesToLayers (no dead-end)', () => {
        const offenders = CATALOG.filter((c) => {
            const mod = byId.get(c.id);
            return !mod || !mod.appliesToLayers.includes(c.overlay);
        }).map((c) => `${c.id} -> ${c.overlay}`);
        expect(offenders).toEqual([]);
    });

    it('marks exactly the three locatable pressure patterns', () => {
        const locatable = CATALOG.filter((c) => c.locate).map((c) => c.id).sort();
        expect(locatable).toEqual(['cyclonic_inflow', 'heat_dome', 'tight_gradient']);
    });

    it('uses the right locate kind for each', () => {
        const kind = (id: string) => CATALOG.find((c) => c.id === id)?.locate;
        expect(kind('cyclonic_inflow')).toBe('low');
        expect(kind('tight_gradient')).toBe('gradient');
        expect(kind('heat_dome')).toBe('high');
    });

    it('only wind-overlay entries carry a level', () => {
        const bad = CATALOG.filter((c) => c.level && c.overlay !== 'wind').map((c) => c.id);
        expect(bad).toEqual([]);
    });

    it('every entry has a non-empty tour hint', () => {
        const empty = CATALOG.filter((c) => !c.tourHint || c.tourHint.trim().length === 0).map((c) => c.id);
        expect(empty).toEqual([]);
    });

    // The gist is the "why" shown on the catalogue card — without it the browse
    // would just point ("go find it") instead of teaching, betraying the premise.
    it('every entry has a non-empty mechanism gist', () => {
        const empty = CATALOG.filter((c) => !c.gist || c.gist.trim().length === 0).map((c) => c.id);
        expect(empty).toEqual([]);
    });

    // The tour "where to look" line is stripClickHint(tourHint). Guard the two bugs
    // the deep audit caught: a capitalised "Click …" surviving, and a connector left
    // dangling ("… squall line —.").
    describe('stripClickHint over every tourHint', () => {
        it('removes every trailing click instruction (any case)', () => {
            const offenders = CATALOG.map((c) => ({ id: c.id, out: stripClickHint(c.tourHint) }))
                .filter((r) => /\bclick\b/i.test(r.out))
                .map((r) => `${r.id} -> ${r.out}`);
            expect(offenders).toEqual([]);
        });

        it('leaves a clean sentence (ends with ".", no dangling connector)', () => {
            const offenders = CATALOG.map((c) => ({ id: c.id, out: stripClickHint(c.tourHint) }))
                .filter((r) => !r.out.endsWith('.') || /[—–\-,;:]\s*\.$/.test(r.out))
                .map((r) => `${r.id} -> ${r.out}`);
            expect(offenders).toEqual([]);
        });
    });
});
