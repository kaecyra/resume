# Self-hosted fonts

These three `latin` subsets are the exact files Google Fonts serves for the
faces `src/app.css` imports. They exist because the OG card renderer
(`scripts/generate-og-images.ts`) aborts every request that does not start
with its own `BASE_URL`, so the `@import` at the top of `src/app.css` never
resolves during a card render and the cards fell back to whatever sans the
build image happens to ship. Served from the site's own origin, they pass
that filter.

Only `src/routes/og/+layout.svelte` declares `@font-face` against them, so
they are downloaded for the card routes and for nothing else. The live site
still takes these faces from Google Fonts.

The PDF pipeline does not, whatever it looks like: `scripts/generate-pdf.ts`
carries the same abort filter, so its `@import` is aborted too and every
generated PDF has been rendering in the build image's fallback sans rather
than in Rajdhani, IBM Plex Sans or Share Tech Mono. That is
[#235](https://github.com/kaecyra/resume/issues/235), left out of the card
work because it decides font delivery for the whole site.

| File                          | Family          | Version | Copyright                                     | Source                                   |
| ----------------------------- | --------------- | ------- | --------------------------------------------- | ---------------------------------------- |
| `archivo-black-latin.woff2`   | Archivo Black   | v23     | The Archivo Black Project Authors, Omnibus-Type | `fonts.gstatic.com/s/archivoblack/v23/`   |
| `ibm-plex-sans-latin.woff2`   | IBM Plex Sans   | v23     | IBM Corp.                                       | `fonts.gstatic.com/s/ibmplexsans/v23/`    |
| `share-tech-mono-latin.woff2` | Share Tech Mono | v16     | Carrois Type Design, Ralph du Carrois           | `fonts.gstatic.com/s/sharetechmono/v16/`  |

The IBM Plex Sans file is the variable (`wght` axis) subset Google serves
for every weight the site asks for, which is why one file covers 400, 500
and 700.

All three families are licensed under the SIL Open Font License 1.1, which
conditions redistribution on each copy carrying the copyright notice and the
license itself. Each family's upstream `OFL.txt` is reproduced here verbatim,
copyright line and all: `OFL-archivo-black.txt`, `OFL-ibm-plex-sans.txt` and
`OFL-share-tech-mono.txt`. The font files are unmodified.
