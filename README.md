# windy-plugin-weather-why

A Windy.com plugin that turns the weather on the map into a moment of genuine understanding. Click any spot on any Windy layer (wind, rain, pressure, temperature, satellite, CAPE, gust, AQ, dust, waves, radar, clouds, visibility, fog). The plugin recognises the visual pattern you're looking at and explains it in a four-beat card:

> **Title** → 2–3 sentence **mechanism** → **Check next:** clickable cross-layer toggles → **Remember:** model-vs-observation caveat

The "Check next" buttons actually flip Windy's layer so you can confirm the explanation in real time. All explanation text is hand-written, parameterised for live data, and verified against NOAA / AMS / peer-reviewed meteorology sources.

## What it recognises

17 patterns + a "What you're seeing" fallback on covered layers:

| Pattern | Trigger layer |
|---|---|
| Cyclonic inflow around a low (+ tropical-cyclone override for sub-985-hPa systems in the tropics) | Wind / Gust (surface) |
| Strong wind in a tight pressure gradient | Wind / Gust (surface) |
| Jet stream | Wind / Gust (250h / 300h) |
| Low-level jet (fast nocturnal wind aloft) | Wind / Gust (850h / 925h) |
| Sea breeze (afternoon onshore flow) | Wind / Gust (coastal) |
| High gust factor (gusts ≫ sustained) | Gust |
| Rain in a line (front / squall) | Rain, RainAccu, Radar |
| Orographic rain & rain shadow | Rain, RainAccu, Radar (elevated terrain) |
| Wintry mix (rain / snow / ice near 0 °C) | Rain, RainAccu, Radar, Temperature |
| CAPE present but the sky is quiet (cap / CIN) | CAPE |
| Clouds without rain (virga, cirrus, cloud shield) | Radar, Satellite, Clouds, Cloudtop |
| Sharp temperature line (front signature) | Temperature |
| Heat building under a blocking ridge (heat dome) | Temperature, Pressure |
| Haze / dust plume (regional transport) | Air Quality, PM2.5, Dust |
| Air stagnation under a high (inversion) | Air Quality, PM2.5 |
| Swell vs wind waves (distant-storm energy) | Waves, Swell |
| Fog (radiation / advection) | Visibility, Fog |

When no specific pattern fires on a covered layer, a "What you're seeing" card explains the layer + local data point.

## Tech

- Pure client-side. Svelte + TypeScript. No backend.
- Data: [Open-Meteo](https://open-meteo.com/) (forecast, upper air, marine, air quality). Keyless, free.
- Build size: ~65 KB minified.

## Dev loop

```bash
npm install                       # one-time
npm start                         # serves https://localhost:9999/plugin.js
```

Then:

1. Open `https://localhost:9999/plugin.js` once in a browser to accept the self-signed cert.
2. Visit [`https://www.windy.com/dev`](https://www.windy.com/dev).
3. Paste `https://localhost:9999/plugin.js` in the "Plugin URL" field. The right-hand pane opens.
4. Edits to `src/plugin.svelte`, `src/pluginConfig.ts`, or anything under `src/lib/` hot-reload.

CORS friction loading `localhost:9999` into `windy.com/dev`? Add CORS headers to the Rollup dev server config (community forum has working examples).

If `npm install` fails with `EACCES` on `~/.npm/_cacache/`: fix with `sudo chown -R $(whoami) ~/.npm`, or use a fresh cache: `npm install --cache /tmp/npm-cache`.

## Build for distribution

```bash
npm run build                     # outputs dist/plugin.{js,min.js}
```

## Architecture

```
src/
├── plugin.svelte                 # main UI: click → fetch → detect → render
├── pluginConfig.ts               # plugin metadata
└── lib/
    ├── types.ts                  # Facts schema, PatternModule contract, WindyOverlay union
    ├── geo.ts                    # haversine, bearing, compass8
    ├── facts.ts                  # 5 parallel Open-Meteo fetches (forecast, upper-air,
    │                             #   49-point MSL-pressure grid, air quality, marine)
    └── patterns/
        ├── index.ts              # MODULES registry, pickPattern dispatcher,
        │                         #   CATALOG, getLayerDefault
        ├── cyclonic_inflow.ts    # + tropical-cyclone override
        ├── tight_gradient.ts
        ├── jet_stream.ts
        ├── low_level_jet.ts
        ├── sea_breeze.ts
        ├── wind_gust_factor.ts
        ├── rain_in_a_line.ts
        ├── orographic_rain.ts
        ├── wintry_mix.ts
        ├── cape_no_storms.ts
        ├── radar_satellite_mismatch.ts
        ├── sharp_temperature_line.ts
        ├── heat_dome.ts
        ├── haze_dust_plume.ts
        ├── stagnation_inversion.ts
        ├── swell_vs_wind.ts
        ├── fog.ts
        └── layer_defaults.ts     # "What you're seeing" cards per layer
```

### Click resolution

1. **Pattern match** — `pickPattern(activeLayer, facts)` runs every module whose `appliesToLayers` includes the current overlay; highest-confidence match wins.
2. **Layer default** — if no pattern fires, `getLayerDefault(layer, facts)` renders a "What you're seeing" card explaining the layer.
3. **Layer not yet supported** — UI fallback names which layers ARE covered.

Each pattern module exports `detect(facts, ctx)`, `visual(map, facts, params)` (returns a cleanup function; currently noop everywhere — Windy's own layers carry the visualisation), and `content(facts, params)` returning a `PatternCard` (title / mechanism / checkNext / remember).

## License

MIT — see [LICENSE](LICENSE).

Publishing to Windy's plugin gallery additionally grants Windy a perpetual sublicensable license to the plugin source (standard for the plugin gallery). Currently `private: true` in [`src/pluginConfig.ts`](src/pluginConfig.ts) — distributable via personal share URL only until that flag is flipped and the publish action is run.
