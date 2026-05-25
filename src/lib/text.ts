// Small UI-copy helpers, extracted so they're unit-testable (a .svelte-local
// function can't be imported by the test suite).

// Remove a trailing "(then) click X" instruction from a tour hint — clicking is
// implicit when the map is active and the card's CTA already says so. Handles:
//   - capitalised sentence endings ("… that's the jet. Click along it.")
//   - a connector left dangling once the clause is removed
//     ("… a squall line — then click it." must not leave "… a squall line —.")
// and always restores a single trailing full stop.
export function stripClickHint(s: string): string {
    const stripped = s
        .replace(/[,.]?\s*(?:then\s+)?click\b[^.]*\.?\s*$/i, '')
        .replace(/[\s,;:—–-]+$/, '')
        .trimEnd();
    return stripped.endsWith('.') ? stripped : `${stripped}.`;
}
