# windy-plugin-weather-why

The Windy plugin form of [weather-why](../README.md). Lives in this subdirectory of the parent project.

## Status

Phase 1b — scaffold only. Hello-world panel renders in Windy's dev mode. Phenomenon detection, visual annotations, and curated content come in 1c+.

## Dev loop

```bash
# From this directory (one-time)
npm install

# Hot-reloading dev server
npm start          # serves https://localhost:9999/plugin.js
```

Then:

1. Open `https://localhost:9999/plugin.js` once in your browser to accept the self-signed cert.
2. Go to **https://www.windy.com/dev** (a.k.a. `windy.com/developer-mode`).
3. Paste `https://localhost:9999/plugin.js` in the "Plugin URL" field. The plugin's right-hand pane should open in Windy.
4. Edits to `src/plugin.svelte` / `src/pluginConfig.ts` hot-reload — no restart needed.

If you hit CORS friction loading from `localhost:9999` into `windy.com/dev`, add CORS headers to the Rollup dev server config (community forum has examples).

If `npm install` fails with `EACCES` errors in `~/.npm/_cacache/`, your npm cache has permission issues from a past sudo invocation. Either fix with `sudo chown -R $(whoami) ~/.npm`, or use a fresh cache: `npm install --cache /tmp/npm-cache-weather-why`.

## Build for distribution

```bash
npm run build      # outputs dist/plugin.min.js
```

`private: true` is set in [`src/pluginConfig.ts`](src/pluginConfig.ts) — distributable via personal share URL only, never appears in Windy's gallery. Flip to `false` and run the `publish-plugin` GitHub Action with `WINDY_API_KEY` to submit for public review.

## Files

- `src/pluginConfig.ts` — plugin metadata (name, icon, UI mode, router path)
- `src/plugin.svelte` — main UI + logic (HTML + Less + TS in one Svelte file)
- `src/screenshot.jpg` — gallery thumbnail (replace before going public)
- `package.json`, `rollup.config.js`, `svelte.config.js` — build pipeline (from windycom/windy-plugin-template v5)
- `examples/` — reference plugins from the template (boat tracker, foehn chart, weather picker, etc.) — read-only references
- `declarations/` — TypeScript declarations for `@windy/*` modules

## License

The plugin code in this directory is currently `private: true` in `pluginConfig.ts` — your code stays yours. If we ever submit to the Windy gallery, it must be open source AND we grant Windy a perpetual sublicensable license. Decide carefully before flipping `private` to `false`.
