// Shared types for weather-why plugin.
// Mirrors the schema produced by the standalone pipeline.py for parity, so
// curated content + detection logic can be ported either direction.

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

export interface ChunkData {
    emoji: string;
    text: string;
}

export interface ContentBlock {
    opener: string;
    body: ChunkData[];
    closer: string; // markdown italics fenced with _underscores_
}

export interface DetectionResult<P = unknown> {
    active: boolean;
    confidence: number; // 0..1
    params: P;
}

// A phenomenon module encapsulates: when does this phenomenon describe what's
// happening? what should we draw on the map? what curated text do we render?
export interface PhenomenonModule<P = unknown> {
    id: string;
    label: string;
    detect(facts: Facts): DetectionResult<P>;
    visual(map: any, facts: Facts, params: P): () => void; // returns cleanup
    content(facts: Facts, params: P): ContentBlock;
}
