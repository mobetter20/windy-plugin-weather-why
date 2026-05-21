// Great-circle geometry helpers. Ported from pipeline.py.

const R_EARTH_KM = 6371.0;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
    return 2 * R_EARTH_KM * Math.asin(Math.sqrt(a));
}

export function initialBearingDeg(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function compass8(bearing: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.floor((bearing + 22.5) / 45) % 8];
}

// Smallest signed angle a - b, in (-180, 180]. Used for onshore/offshore wind
// tests (wind direction vs the bearing to the coast).
export function angularDiff(a: number, b: number): number {
    return ((a - b + 540) % 360) - 180;
}

// Local hour (0-24, fractional) from a UTC ISO timestamp + longitude — a rough
// timezone proxy, good enough for "is it overnight / afternoon here".
export function localHourFromUtc(isoString: string, lonDeg: number): number {
    const utcHour = new Date(isoString).getUTCHours();
    return (((utcHour + lonDeg / 15) % 24) + 24) % 24;
}
