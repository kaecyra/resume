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
| `npm run generate-og` | Generate Open Graph images for all variants |
| `npm run generate-pdf` | Generate PDF from built site using Puppeteer |
| `npm run linkedin` | Export resume data as LinkedIn-ready copy/paste text |
| `npm run generate-slug` | Generate a random 8-char hex slug for sub-variants |
| `npm run validate-sub-variants` | Validate all sub-variant manifests against master data |
| `npm run prepare` | Sync SvelteKit types |

## Project Structure

```
data/
  resume.yaml             # All resume content
  variants/               # Variant manifests for tailored output
    cto-a.yaml
    cto-b.yaml
    default.yaml
    cto-a/                # Sub-variants (job-specific customizations)
      a7f3b9c2.yaml
src/
  lib/
    data.ts               # Data loading and variant resolution
    types.ts              # TypeScript type definitions
  routes/                 # SvelteKit pages
scripts/
  generate-og-images.ts   # Puppeteer-based OG image generation
  generate-pdf.ts         # Puppeteer-based PDF generation
  linkedin-export.ts      # LinkedIn copy/paste text exporter
  deploy.sh               # Manual deploy script (build and push to GHCR)
  setup-host.sh           # Host VM provisioning script
VERSION                   # CalVer version (YYYY.MM.DD)
Dockerfile                # Multi-stage Docker build
nginx.conf                # Container nginx configuration
docker-compose.yml        # Docker Compose for local dev and production
```

## Data Model

Resume content lives in `data/resume.yaml` as a single source of truth containing all skills, employment history, languages, and courses. Variant manifests in `data/variants/` select and order a subset of this content for a specific role or audience, enabling multiple tailored resumes from one data source.

### Sub-Variants

Sub-variants are job-specific customizations of an existing variant. They live in subdirectories of `data/variants/` (e.g., `data/variants/cto-a/a7f3b9c2.yaml`) and inherit all fields from their parent variant, overriding only what benefits from customization.

Sub-variants are generated via Claude Code — ask it to "customize cto-a for this job: \<URL\>" and it will fetch the posting, generate the tailored YAML, validate it, and verify the build. See [CLAUDE.md](./CLAUDE.md) for the full workflow.

Sub-variants are served at `/{parent}/{slug}` (e.g., `/cto-a/a7f3b9c2`) with `noindex` meta tags and are excluded from the sitemap.

## CI

GitHub Actions runs on pushes and pull requests to `main`, executing type checking, tests, and a production build in sequence. See [ENGINEERING.md](./ENGINEERING.md) for full coding standards and CI requirements.

## Deployment

The site uses a pull-based deployment model. Pushing to `main` triggers GitHub Actions to build and push the Docker image to GHCR. On the VM, Watchtower polls GHCR for new images and automatically pulls and recreates the container.

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

## Project Documentation

- [ENGINEERING.md](./ENGINEERING.md) - Coding standards and project conventions
- [WORKING_AGREEMENT.md](./WORKING_AGREEMENT.md) - Collaboration workflow and task management
- [LESSONS.md](./LESSONS.md) - Lessons learned and corrective patterns
