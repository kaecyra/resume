# Self-hosted fonts

These three `latin` subsets are the exact files Google Fonts serves for the
faces `src/app.css` imports. They exist because the OG card renderer
(`scripts/generate-og-images.ts`) aborts every request that does not start
with its own `BASE_URL`, so the `@import` at the top of `src/app.css` never
resolves during a card render and the cards fell back to whatever sans the
build image happens to ship. Served from the site's own origin, they pass
that filter.

Only `src/routes/og/+layout.svelte` declares `@font-face` against them, so
they are downloaded for the card routes and for nothing else -- the live
site and the PDF pipeline still take their fonts from Google Fonts.

| File                          | Family          | Version | Source                                   |
| ----------------------------- | --------------- | ------- | ---------------------------------------- |
| `archivo-black-latin.woff2`   | Archivo Black   | v23     | `fonts.gstatic.com/s/archivoblack/v23/`   |
| `ibm-plex-sans-latin.woff2`   | IBM Plex Sans   | v23     | `fonts.gstatic.com/s/ibmplexsans/v23/`    |
| `share-tech-mono-latin.woff2` | Share Tech Mono | v16     | `fonts.gstatic.com/s/sharetechmono/v16/`  |

The IBM Plex Sans file is the variable (`wght` axis) subset Google serves
for every weight the site asks for, which is why one file covers 400, 500
and 700.

All three families are licensed under the SIL Open Font License 1.1:
<https://openfontlicense.org/>. Redistribution in this repository is what
that license permits; the files are unmodified.
