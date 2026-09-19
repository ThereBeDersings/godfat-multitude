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

## Limitations I have noticed from the original project:

- **BCEN only.** The banner dropdown is fetched from a bare `bc.godfat.org/` with no `lang`, so it only ever lists EN banners. Other versions can enter only through a pasted direct link, and that path is broken: `urlToRareCatQueryUrl` also builds from the bare base URL and doesn't carry `lang`, so the pool query resolves the same `event=` ID against the **EN** dataset. This (among other things?) most noticeably breaks Rare dupes: a JP table renders JP cats, but `isRareOnBanner` is testing their IDs against whatever EN banner happens to share that event= ID, so no cat ever matches and the dupe check never fires. Fixing it would mean carrying `lang` (and `name`, which has the same gap and costs you mismatched name strings on synthesised cells) into the pool query, and pointing the banner list at the selected version. Accepted as is, for the time being.
- Currently, the tool does not track what the last cat rolled was. If 1A is a Rare dupe (from 0A), it won't be able to discern that, affects both rolling mode and planning mode. Not an issue if you know what to do (backtrack if planning, or just clicking on the Rare dupe and skip the first Rare if rolling) (working on it on the test repo).
- The very obvious issue of cross-banner track switches: they're simply blocked. A bit of a hassle to work around, especially in planning mode. (also working on it on the test repo).
