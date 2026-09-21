// Site-wide head constants shared by page components.
//
// Deliberately its own module rather than a constant in seo.ts: seo.ts
// imports data.ts for list_variants, which reads the filesystem, so a
// component importing from it pulls node:fs into the client bundle and the
// build fails with `"resolve" is not exported by "__vite-browser-external"`.
// Nothing here may import anything that touches the filesystem.
export const SITE_LOCALE = "en_CA";
