# React + Typescript minimum template

## Install packages

```
$ npm i
```

## Run dev server

Dev server running on localhost:8080.

```
$ npm run dev
```

### Change running port

Edit `devServer.port` on webpack.config.js.

## build

```
$ npm run build
```


## Changes from upstream (ampuri/godfat-multi)

- **Self-hosted CORS proxy**: Replaced `corsproxy.io` (which now requires a paid API key) with a self-hosted Cloudflare Worker, so requests to `bc.godfat.org` aren't dependent on a third-party proxy's terms or uptime. Limited to 100,000 requests per day. See `src/utils/query.tsx`.
- **Fixed rarity color-coding**: `godfat` now renders cells with `minor_X`/`major_X` class pairs (plus an additional `legend_fest` rarity for rate-up LRs) instead of the bare rarity classes this app was originally written against, so every cell was falling back to white. Updated `getColorFromClass` in `src/utils/godfatParsing.tsx` to match (only using `major_X` per the basic highlighting option), and corrected the `owned` color to `lightcyan` to match the site's actual default palette as of the time of writing.
- **Banner list pagination**: `godfat` now paginates its banner dropdown (`event_page`), which previously broke banner selection since only the first page was ever fetched/parsed. Added pagination controls (`src/utils/godfat.tsx`, `src/Page.tsx`, `src/ConfigContainer.tsx`) that page through the banner list while preserving each track's saved selection, plus a fix so the "default event" fallback logic (used when a selected banner matches the site's implicit default) is always computed against page 1, regardless of which page you're browsing. Note that whenever you move between banner list pages, the selected banner(s) in the dropdown(s) will change to the one at the top of the current page. This is purely a visual issue and will not update your actual submitted choice, shouldn't be an issue if you name them.
