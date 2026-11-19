# Vice Cover Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/FarizalMYaqub/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/FarizalMYaqub/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photos into GTA-style multi-panel poster art, exported as a PNG to share.
An entry for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on make.fun.

## What it does

- **Your photos, your machine** — add one or more photos from your computer; they are read locally with FileReader and never uploaded.
- **Multi-panel posters** — three layouts (Hero + strip, Grid 2×2, Comic 3-panel) with white comic gutters and slanted dividers.
- **Crop and position each panel** — click a panel in the live preview, drag to move its photo, scroll to zoom, or use the per-panel zoom slider. One photo can fill several panels, or each panel can hold a different one.
- **Bold poster lettering** — a big outlined title and a spaced subtitle in OFL fonts (Anton and Archivo Black, shipped under `app/fonts/`), plus a sunset sun and sparkles.
- **Vice City grades** — Vice sunset, Neon nights and Noir colour grades washed over every panel.
- **Fast export** — one click exports a PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

The app is plain static files under `app/` and works offline in a desktop browser:
no network request, no build step. Two sample photos made with an image model
(`app/samples/`) are included so the cover is never empty.

## Original work

No Rockstar Games logo, wordmark, official artwork, character or font is used
anywhere. The display fonts are Anton and Archivo Black under the SIL Open Font
License (see `app/fonts/OFL.txt`).

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the
output directory and writes `dossier.json` with the vendored make.fun library.
