# Resume

![Version](https://img.shields.io/badge/dynamic/regex?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkaecyra%2Fresume%2Fmain%2FVERSION&search=%5B%5Cd.%5D%2B&label=version)
![CI](https://github.com/kaecyra/resume/actions/workflows/ci.yml/badge.svg?branch=main)
![Node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/github/license/kaecyra/resume)

Online, responsive, interactive resume with flatfile-based data-driven content and the ability to export portable copies in PDF format.

**Live site:** [resume.timgunter.ca/cto-a](https://resume.timgunter.ca/cto-a)

## Tech Stack

| Category | Technology |
|---|---|
| Framework | SvelteKit + Svelte 5 (static adapter) |
| Styling | Tailwind CSS 4 |
| Language | TypeScript (strict mode) |
| Testing | Vitest + Testing Library |
| PDF Export | Puppeteer |
| Build Tool | Vite |
| Analytics | Umami (self-hosted, cookie-free) |
| Container | Docker + nginx:stable-alpine |

## Getting Started

**Prerequisites:** Node.js 24+, npm

```sh
git clone https://github.com/kaecyra/resume.git
cd resume
npm install
```

## Development

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (static site) |
| `npm run preview` | Preview production build |
| `npm run check` | Run svelte-check type checking |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run generate-og` | Generate Open Graph images: the landing card plus one per variant |
| `npm run generate-geo` | Regenerate the landing hero globe's line geometry from world-atlas |
| `npm run generate-pdf` | Generate PDF from built site using Puppeteer |
| `npm run linkedin` | Export resume data as LinkedIn-ready copy/paste text |
| `npm run generate-slug` | Generate a random 8-char hex slug for sub-variants |
| `npm run validate-sub-variants` | Validate all sub-variant manifests against master data |
| `npm run fetch-github` | Fetch the GitHub contribution calendar into `data/generated/github.json` |
| `npm run fetch-satellites` | Fetch satellite orbital elements from CelesTrak into `static/landing/satellites.json` |
| `npm run prepare` | Sync SvelteKit types |

## Project Structure

```
data/
  resume.yaml             # All resume content
  landing.yaml            # Landing page content (hero, projects, appearances, resume links, contact)
  pipeline.yaml           # Content for the landing page's "Pipelines" section
  variants/               # Variant manifests for tailored output
    cto-a.yaml
    cto-b.yaml
    default.yaml
    cto-a/                # Sub-variants (job-specific customizations)
      a7f3b9c2.yaml
  generated/              # Build-time fetched data (gitignored, not in source control)
    github.json           # GitHub contribution calendar, written by scripts/fetch-github.ts
src/
  lib/
    data.ts               # Data loading and variant resolution
    landing.ts            # Landing page data loading and validation
    pipeline.ts           # "Pipelines" section data loading and validation
    landing/              # Landing page components (greyscale + amber "Signal" design)
    github.ts             # GitHub contribution calendar transform (grid model, level bucketing)
    types.ts              # TypeScript type definitions
  routes/                 # SvelteKit pages
scripts/
  generate-og-images.ts   # Puppeteer-based OG image generation
  generate-pdf.ts         # Puppeteer-based PDF generation
  linkedin-export.ts      # LinkedIn copy/paste text exporter
  fetch-github.ts         # Fetches the GitHub contribution calendar at build time
  fetch-satellites.ts     # Fetches satellite orbital elements for the hero globe at build time
  deploy.sh               # Manual deploy script (build and push to GHCR)
  setup-host.sh           # Host VM provisioning script
VERSION                   # CalVer version (YYYY.MM.DD)
Dockerfile                # Multi-stage Docker build
nginx.conf                # Container nginx configuration
docker-compose.yml        # Docker Compose for local dev and production
```

## Routing

| URL | Content |
|---|---|
| `/` | Landing page (profile intro, links out to the resume) |
| `/default` | Default variant resume (canonical) |
| `/{variant}` | A named variant resume, e.g. `/cto-a` |
| `/{variant}/{slug}` | A job-specific sub-variant, e.g. `/cto-a/a7f3b9c2` |
| `/{variant}/{slug}/letter` | That sub-variant's cover letter, when one exists |
| `/variants` | Auth-gated dashboard listing all variants and sub-variants |

## Data Model

Resume content lives in `data/resume.yaml` as a single source of truth containing all skills, employment history, languages, and courses. Variant manifests in `data/variants/` select and order a subset of this content for a specific role or audience, enabling multiple tailored resumes from one data source.

### Landing Page

The landing page is not a resume theme: it has no PDF path and no variant resolution, so its content lives in its own file, `data/landing.yaml`, loaded and validated by `src/lib/landing.ts`. It defines the hero block, a list of projects (drawn from the same work referenced in `field_deployments`, but written for a general audience), a list of conference/event appearances (`appearances`), which resume variants are linked publicly (`resume_links`), contact links, and the GitHub account shown next to the commit history. Only variants named in `resume_links` are ever linked from the landing page; every other variant stays reachable by direct link only.

The "Pipelines" section keeps its content in a second file, `data/pipeline.yaml`, loaded and validated by `src/lib/pipeline.ts` and threaded to the page as its own prop. It carries more structure than the other sections put together, so it stays out of `landing.yaml`: three bands of graph nodes and edges, a terminal transcript, the rack, and two readouts. There are no coordinates in it. `src/lib/landing/pipeline-graph.ts` turns the nodes and edges into positions and path strings, and each tone is named by role (`default`, `muted`, `dim`, `accent`, `green`), resolved against `src/lib/landing/palette.ts` when the section renders, so a colour change never touches the data file.

The hero's Montreal marker flag (`static/landing/canada-flag.svg`) is from the [flag-icons](https://github.com/lipis/flag-icons) project, MIT licensed; the upstream license notice is reproduced in a comment at the top of the file.

#### Open Graph Cards

Every card is a prerendered route screenshotted at 1200x630 by `npm run generate-og` (`scripts/generate-og-images.ts`) during the Docker build. `/og/{variant}` is the resume card - headshot, name, title, in the variant's own theme palette. `/og/landing` is the site root's own card and follows the landing page instead: the hero's frame, its globe still, the name in `Archivo Black` and the flat amber role badge. `LANDING_OG_SLUG` in `src/lib/seo.ts` is the one name shared by the meta tag the root page emits and the PNG the script writes.

The renderer aborts every request that does not come from its own origin, so the Google Fonts `@import` in `src/app.css` never resolves while a card is being captured. The three faces the cards need are therefore served from the site itself (`static/fonts/`, declared in `src/routes/og/+layout.svelte`), scoped to `/og/*` - the live site still loads fonts from Google Fonts. See `static/fonts/README.md` for provenance and licensing.

`scripts/generate-pdf.ts` has the same abort filter and is affected the same way: the generated PDFs render in the build image's fallback sans rather than in the faces the themes name. That is [#235](https://github.com/kaecyra/resume/issues/235) - it decides font delivery for the whole site, so it is not part of the card work.

#### GitHub Contribution Data

The landing page's contribution grid is fetched at build time, not from the browser: `npm run fetch-github` (`scripts/fetch-github.ts`) queries the GitHub GraphQL API for `data.github.user`'s `contributionCalendar` and writes `data/generated/github.json` (fetch timestamp, total count, and per-day counts only - no repository names, ever). That file is gitignored and read by `src/routes/+page.server.ts` at prerender time via `src/lib/github.ts`, which turns it into a grid model rendered as inline SVG with no client-side request.

The script needs a token with `read:user` scope: `GITHUB_TOKEN` in `.env.example` for local runs, and the `GH_CONTRIB_PAT` repository secret in CI (see [Required GitHub Configuration](#required-github-configuration)). Without a token, or if the fetch fails, `data/generated/github.json` simply doesn't exist - the build still succeeds and the section renders an explicit offline state instead of the grid.

#### Satellites

The hero globe overlays live satellite positions (#203): every active Canadian payload, plus the ISS, Hubble, ESA's Sentinel-1 and Sentinel-2, and EarthCARE. `npm run fetch-satellites` (`scripts/fetch-satellites.ts`) downloads CelesTrak's satellite catalog and active orbital elements (no key needed), selects the set via `src/lib/landing/satellite-catalog.ts`, and writes `static/landing/satellites.json`. The file is gitignored and refreshed by the nightly deploy.

The browser fetches that file and propagates every satellite itself with [satellite.js](https://github.com/shashwatak/satellite-js) (SGP4) at the real current time, so no position API is called at runtime (`src/lib/landing/orbits.ts`). Altitude is log-compressed so low orbits sit well clear of the wireframe and the geostationary ring lands at the canvas edge. Flagships get an outline icon (`SatelliteIcon.svelte`) and a dashed orbit ring colored by orbit class (low Earth orbit, sun-synchronous, geostationary); everything else is a dot. Nothing is labelled until hovered: hovering a flagship icon shows its name, orbit class, altitude, speed, position, period and inclination, refreshed once a second. Without the file, or if the fetch fails, the globe renders without satellites. The reduced-motion still image never shows them.

CelesTrak refuses a repeat download of the same data (HTTP 403) until it has changed, so running the script twice in quick succession fails the second time.

### Sub-Variants

Sub-variants are job-specific customizations of an existing variant. They live in subdirectories of `data/variants/` (e.g., `data/variants/cto-a/a7f3b9c2.yaml`) and inherit all fields from their parent variant, overriding only what benefits from customization.

Sub-variants are generated via Claude Code using the `/customize-variant` skill:

```
/customize-variant <parent> <job-url>
```

For example: `/customize-variant cto-a https://example.com/jobs/123`. The skill fetches the posting, generates the tailored YAML (including a cover letter), validates it, and verifies the build. Plain-language requests like "customize cto-a for this job: \<URL\>" work too. See [.claude/skills/customize-variant/SKILL.md](./.claude/skills/customize-variant/SKILL.md) for the full workflow.

Sub-variants are served at `/{parent}/{slug}` (e.g., `/cto-a/a7f3b9c2`) with `noindex` meta tags and are excluded from the sitemap.

## CI

GitHub Actions runs on pushes and pull requests to `main`, executing type checking, tests, and a production build in sequence. See [ENGINEERING.md](./ENGINEERING.md) for full coding standards and CI requirements.

## Deployment

The site uses a pull-based deployment model. Pushing to `main` triggers GitHub Actions to build and push the Docker image to GHCR. On the VM, Watchtower polls GHCR for new images and automatically pulls and recreates the container.

The deploy workflow also runs nightly (`schedule:` trigger, 06:00 UTC) and can be run on demand (`workflow_dispatch`), so the GitHub contribution grid refreshes even with no code change. A nightly run re-pushes the same VERSION tag alongside `latest`; Watchtower tracks `latest`, so this is harmless.

```
Push to main -> GitHub Actions builds and pushes to GHCR
Watchtower (on VM) polls GHCR -> detects new image -> pulls and recreates container
Internet -> Cloudflare -> Proxy server -> VM:3000 -> Resume (nginx, static site)
                                          VM:3001 -> Umami (analytics dashboard + collection)
                                          umami_db -> Postgres (analytics data, Docker volume)
```

There is a ~5 minute delay between push and deploy (Watchtower poll interval).

### Host Setup

The host VM is provisioned using `setup-host.sh`, which configures Docker, the firewall, Watchtower, and basic security hardening.

**Prerequisites:** Fresh Ubuntu VM with sudo access

```sh
scp scripts/setup-host.sh user@<vm-ip>:~/
ssh user@<vm-ip> 'sudo bash ~/setup-host.sh'
```

The script configures:
- System package updates
- UFW firewall (OpenSSH + ports 3000, 3001)
- Docker CE with log rotation
- Umami credentials (auto-generated, written to `/opt/resume/.env`)
- GHCR authentication for pulling images
- Docker Compose stack (resume + Umami + Watchtower)
- Unattended security upgrades and fail2ban

### First-Time Setup

The only GitHub configuration needed is the `DEPLOY_ENABLED` repository variable (see [Enabling Deployment](#enabling-deployment)). The deploy workflow uses the automatic `GITHUB_TOKEN` for GHCR push, and GHCR credentials on the VM are configured by `setup-host.sh`.

**Verification:** After setup, push to `main` and check the Actions tab for a successful build-and-push run.

### Local Docker Build

```sh
docker compose up --build
```

Site available at `http://localhost:3000`. The Watchtower service is excluded from local builds via Docker Compose profiles.

### Manual Deploy

For deploying without pushing to `main` (hotfix, troubleshooting):

```sh
export GHCR_PAT=your-github-pat
./scripts/deploy.sh
```

This builds and pushes the image to GHCR. Watchtower on the VM detects the new image and updates automatically.

### Enabling Deployment

Deployment is gated by the `DEPLOY_ENABLED` repository variable (Settings > Secrets and variables > Actions > Variables). Set it to `true` to enable the deploy workflow, or `false` to skip it. The workflow will still trigger on push to `main` but all jobs will be skipped when disabled.

### Required GitHub Configuration

| Type | Name | Purpose |
|---|---|---|
| Secret | `GHCR_PAT` | GitHub PAT with `read:packages` and `write:packages` scope for GHCR push |
| Secret | `GH_CONTRIB_PAT` | GitHub PAT with `read:user` scope, for fetching the landing page's contribution calendar |
| Variable | `DEPLOY_ENABLED` | Enable/disable the deploy workflow (`true`/`false`) |
| Variable | `PUBLIC_BASE_URL` | Absolute base URL for OG meta tags (no trailing slash) |
| Variable | `PUBLIC_UMAMI_WEBSITE_ID` | Website ID from Umami dashboard |

### Ingress Configuration

The network proxy server (separate from the VM) handles SSL termination and routes traffic to the VM. Example nginx config for the proxy:

```nginx
location / {
    proxy_pass http://<vm-ip>:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Analytics

The site uses [Umami](https://umami.is/) for privacy-respecting, cookie-free analytics. Umami is self-hosted alongside the resume container — no data leaves your infrastructure.

The tracking script is conditionally injected at build time when `PUBLIC_UMAMI_WEBSITE_ID` is set. Analytics requests (`/insights.js` and `/api/send`) are proxied through the resume container's nginx to the Umami container on the same Docker network, avoiding cross-origin issues. When the variable is unset (local dev, CI), no tracking code is rendered.

### First-Time Umami Setup

Umami is provisioned automatically by `setup-host.sh`. After the stack is running:

1. Open `http://<host>:3001` and log in with the default credentials (`admin` / `umami`)
2. **Change the default password immediately**
3. Add a website in the Umami dashboard and copy the Website ID
4. Set `PUBLIC_UMAMI_WEBSITE_ID` as a GitHub Actions variable
5. Push to `main` (or rebuild manually) to bake the tracking script into the static site

### Ingress for Umami Dashboard

The Umami dashboard (port 3001) needs its own reverse proxy rule for admin access. Tracking data collection is proxied through the resume container's nginx and does not require a separate ingress rule.

```nginx
# Umami dashboard (admin access only)
location / {
    proxy_pass http://<vm-ip>:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Chicken-and-Egg: Website ID

Umami must be running before you can create a website and obtain its ID. On first deploy, leave `PUBLIC_UMAMI_WEBSITE_ID` unset — the tracking script won't render. Once Umami is up, create the website, copy the ID, set the variable, and rebuild.

## Mechanical Room Readout

The "Pipelines" section's mechanical-room readout can show a live temperature and humidity reading instead of its static sample, sourced from a Home Assistant sensor on the same network as the deploy host.

A background loop in `docker-entrypoint.sh` polls two HA sensor entities every 5 minutes and writes the reading to a static file nginx serves at `/api/basement/metrics`; the landing page polls that endpoint every 30 seconds once loaded. Unset any of the four variables below and the readout falls back to its static sample - no error, no visible change beyond that.

### First-Time Setup

1. In Home Assistant, go to your profile > Security and create a long-lived access token
2. Confirm the entity IDs for the room's temperature and humidity sensors (Developer Tools > States)
3. Set the four variables below in `.env` (see `.env.example`)
4. Restart the resume container - the poller starts automatically once all four are set

| Variable | Purpose |
|---|---|
| `HA_BASE_URL` | Base URL of the Home Assistant instance (e.g. `http://homeassistant.local:8123`) |
| `HA_TOKEN` | Long-lived access token, minted in HA |
| `HA_TEMP_ENTITY_ID` | Entity ID of the temperature sensor |
| `HA_HUMIDITY_ENTITY_ID` | Entity ID of the humidity sensor |

## Project Documentation

- [ENGINEERING.md](./ENGINEERING.md) - Coding standards and project conventions
- [WORKING_AGREEMENT.md](./WORKING_AGREEMENT.md) - Collaboration workflow and task management
- [LESSONS.md](./LESSONS.md) - Lessons learned and corrective patterns
