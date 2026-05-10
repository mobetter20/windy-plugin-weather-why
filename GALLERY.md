# Gallery submission materials

Drafts of the text + spec needed for submitting `windy-plugin-weather-why` to Windy's community plugin gallery. Edit before submission.

---

## Plugin gallery description (short — `pluginConfig.ts` field)

Currently set in [`src/pluginConfig.ts`](src/pluginConfig.ts):

> Click any spot on any Windy layer (wind, rain, pressure, jet stream, satellite, CAPE, dust, waves, more) and find out why the weather there is doing what it's doing. Each click yields a short hand-written card that names the pattern, explains the mechanism, and toggles to a related layer so you can verify what you're seeing.

---

## Community-thread post (long — for the [Windy Plugins community thread](https://community.windy.com/topic/31066/list-of-finished-windy-plugins-v42) when submitting for review)

```markdown
# Weather Why

Click any spot on any Windy layer. The plugin recognises the visual pattern you're looking at — a wind swirl, a rain band, a temperature line, a jet ribbon — and explains it in a short card. The "Check next" buttons toggle a related layer so you can confirm what you're seeing.

13 patterns covered. All explanation text is hand-written and verified against NOAA / AMS / peer-reviewed sources.

## What it recognises

| Pattern | Trigger layer |
|---|---|
| Cyclonic inflow around a low (+ tropical-cyclone override for sub-985-hPa systems in the tropics) | Wind (surface) |
| Strong wind in a tight pressure gradient | Wind |
| Rain in a line (front / squall) | Rain, Radar |
| CAPE present but the sky is quiet (cap / CIN) | CAPE |
| Clouds without rain (virga, cirrus, cloud shield) | Radar, Satellite, Clouds |
| Sharp temperature line (front signature) | Temperature |
| Jet stream | Wind 250h / 300h |
| Haze / dust plume (regional transport) | cAQI, PM2.5, PM10, Dust |
| High gust factor | Gust |
| Orographic rain & rain shadow | Rain (elevated terrain) |
| Swell vs wind waves (distant-storm energy) | Waves, Swell |
| Sea breeze (afternoon onshore flow) | Wind (coastal) |

On covered layers without a specific match, a "What you're seeing" card explains the layer + local data point — so every click on a major layer produces something.

## Tech

- Pure client-side. Svelte + TypeScript. No backend.
- Data: Open-Meteo (forecast, upper air, marine, air quality). Keyless, free.
- Build size: ~52 KB minified
- License: MIT
- Source: https://github.com/[REPO_PATH]

Feedback welcome. If you click somewhere and the card feels wrong or misses the obvious story, please open an issue.
```

---

## Screenshot spec (for `src/screenshot.jpg`)

Currently using the windy-plugin-template default. **Replace before submitting.**

### What makes a good gallery screenshot

- **Dimensions:** the existing `screenshot.jpg` is 1200×800; match or close to it (gallery expects standard aspect)
- **Content:** show the plugin doing its actual job — the side panel card visible, anchored to a Windy map view where the recognised pattern is visually clear
- **Pattern choice:** the strongest screenshots are ones where the user can SEE the thing the card is explaining. Recommended scenes:
  - **A spinning low** on the Wind layer somewhere mid-latitude (Aleutians / North Atlantic / Southern Ocean are reliable). Card shows the cyclonic-inflow explanation, streamlines visibly curl on the map. *This is the strongest "weather-why moment" — easy to recognise instantly.*
  - **A typhoon / hurricane** if one is active. Tropical-cyclone override card. Dramatic + scientific.
  - **A jet stream ribbon** at the 250h level. Long band of fast wind, with the jet-stream explanation card.
- **Composition:** the card text should be readable but not the only thing — Windy's map should occupy 60-70% of the frame so reviewers see the plugin in context, not isolated.
- **Avoid:** Windy's chrome dominating; a card with no map context; the fallback "What you're seeing" cards (those don't sell the differentiator)

### How to capture

1. Load the plugin in Windy dev mode (`https://www.windy.com/dev` → load `https://localhost:9999/plugin.js`)
2. Navigate to a region with the chosen pattern visibly happening
3. Click to surface the card
4. Browser screenshot (Cmd+Shift+4 → space → click window on macOS, or full-page)
5. Crop to ~1200×800 if needed
6. Save as `plugin/src/screenshot.jpg` (overwrite the template default)
7. Rebuild: `cd plugin && npm run build` — `dist/screenshot.jpg` will be replaced

### Recommended go-to: a strong cyclonic-inflow shot

A region in the Aleutians or North Atlantic during winter almost always has a spinning low. That makes for the most universally readable screenshot — anyone glancing at the gallery will see the swirl + the explanation and immediately understand what the plugin does.

---

## Source-repo decision (open question)

**Required for gallery submission:** plugin code must be open source AND live in a public repo.

Two paths:

1. **Whole weather-why repo public** at `github.com/<account>/weather-why`. Includes the plugin AND the standalone-webapp reference code (which is clearly marked as "earlier era — reference only" in the README). History is intact. Simpler.

2. **Just plugin/ split into its own repo** at `github.com/<account>/windy-plugin-weather-why`. Cleaner — only the deploy target. Need to either copy current state to new repo (lose history) or use `git subtree split` (keep plugin/ history).

**My recommendation: option 1, whole repo public.** History is valuable context for anyone curious how this evolved, and the webapp section is clearly labelled. Plugin reviewers will look at `plugin/` specifically; the rest is fine to coexist.

User to decide before Phase 7.

---

## Pre-submission checklist

- [x] LICENSE file (MIT) at repo root
- [x] Gallery description in `pluginConfig.ts`
- [x] Community-thread post text drafted (this file)
- [x] Screenshot spec drafted (this file)
- [ ] Public repo created + pushed (user decision: whole repo or split)
- [ ] Real screenshot.jpg captured + committed (user action)
- [ ] Plugin description finalised after one more read
- [ ] All 13 patterns dry-run-tested against real Windy data (one more pass)

Once checked, run Phase 7: flip `private: false`, set `WINDY_API_KEY` GitHub secret, run `publish-plugin` action, post the community-thread text.
