// Shared types for weather-why plugin.
// Schema for Facts mirrors pipeline.py output (so detection rules port).

export interface LatLon {
    lat: number;
    lon: number;
}

export interface SurfaceFacts {
    temperature_C: number | null;
    apparent_temperature_C: number | null;
    humidity_pct: number | null;
    weather_code: number | null;
    pressure_msl_hPa: number | null;
    pressure_surface_hPa: number | null;
    wind_speed_kmh: number | null;
    wind_gust_kmh: number | null;
    wind_direction_deg: number | null;
    wind_compass: string | null;
    cloud_cover_pct: number | null;
    precipitation_mm: number | null;
}

export interface PressureFeature {
    pressure_hPa: number;
    lat: number;
    lon: number;
    distance_km: number;
    bearing_deg: number;
    compass: string;
}

export interface SynopticFacts {
    nearest_low: PressureFeature;
    nearest_high: PressureFeature;
    grid_msl_pressure_hPa_min_max: [number, number];
    grid_points: number;
}

export interface PastTrends {
    pressure_change_hPa: number | null;
    pressure_tendency: 'rising' | 'falling' | 'steady';
    temp_change_C: number | null;
    wind_shift_deg: number | null;
    precip_total_mm: number | null;
}

export interface ForecastTrend {
    temp_change_C: number | null;
    pressure_change_hPa: number | null;
    precip_total_mm: number | null;
}

export interface UpperAirLevel {
    geopotential_height_m: number | null;
    temperature_C: number | null;
    wind_speed_kmh: number | null;
    wind_direction_deg: number | null;
}

export interface UpperAir {
    '500hPa': UpperAirLevel;
    '850hPa': UpperAirLevel;
    '250hPa_jet': Pick<UpperAirLevel, 'wind_speed_kmh' | 'wind_direction_deg'>;
}

export interface AirQuality {
    pm2_5: number | null;
    pm10: number | null;
    european_aqi: number | null;
}

export interface Facts {
    location: LatLon;
    generated_at: string;
    surface: SurfaceFacts;
    past_24h: PastTrends;
    forecast_24h: ForecastTrend;
    upper_air: UpperAir;
    synoptic: SynopticFacts;
    air_quality: AirQuality;
}

// =====================================================================
// Pattern modules (replaces the older PhenomenonModule shape).
//
// A Pattern is "the visible thing on a Windy layer that the user clicked"
// — e.g., wind streamlines curling, a rain band, a haze plume. Detection
// is layer-aware: the same click means different things on the wind layer
// vs the rain layer. Each module gates on which Windy overlays it applies
// to (`store.get('overlay')` value).
// =====================================================================

export interface CheckNext {
    // Label shown in the card; clicking will set this overlay via store.set
    label: string;        // e.g., "Toggle Pressure: look for closed contours"
    overlay: WindyOverlay; // Windy overlay key the button switches to
}

export interface PatternCard {
    title: string;        // "Why the wind curls here"
    mechanism: string;    // 2-3 short sentences
    checkNext: CheckNext[]; // 1-2 cross-layer toggles
    remember: string;     // 1 short sentence on caveat / model vs obs
}

// Subset of Windy's overlay key strings we currently care about.
// Source: examples in windy-plugin-template (store.set('overlay', 'wind') etc.)
export type WindyOverlay =
    | 'wind' | 'gust' | 'rain' | 'rainAccu' | 'radar' | 'satellite'
    | 'pressure' | 'temp' | 'clouds' | 'cloudtop' | 'cape'
    | 'waves' | 'swell1' | 'swell2'
    | 'cAQI' | 'pm2p5' | 'pm10' | 'dust' | 'visibility';

export interface PatternModule<P = unknown> {
    id: string;                       // 'cyclonic_inflow', 'rain_in_a_line', etc.
    appliesToLayers: WindyOverlay[];  // gates detection to these active overlays
    detect(facts: Facts): { active: boolean; confidence: number; params: P };
    visual(map: any, facts: Facts, params: P): () => void;
    content(facts: Facts, params: P): PatternCard;
}
