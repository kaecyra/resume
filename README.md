# Resume

Online, responsive, interactive resume with flatfile-based data-driven content and the ability to export digital copies in PDF format.

## Tech Stack

| Category | Technology |
|---|---|
| Framework | SvelteKit + Svelte 5 (static adapter) |
| Styling | Tailwind CSS 4 |
| Language | TypeScript (strict mode) |
| Testing | Vitest + Testing Library |
| PDF Export | Puppeteer |
| Build Tool | Vite |
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
| `npm run generate-pdf` | Generate PDF from built site using Puppeteer |
| `npm run prepare` | Sync SvelteKit types |

## Project Structure

```
data/
  resume.yaml             # All resume content
  variants/               # Variant manifests for tailored output
    default.yaml
src/
  lib/
    data.ts               # Data loading and variant resolution
    types.ts              # TypeScript type definitions
  routes/                 # SvelteKit pages
scripts/
  generate-pdf.ts         # Puppeteer-based PDF generation
  deploy.sh               # Manual deploy script
Dockerfile                # Multi-stage Docker build
nginx.conf                # Container nginx configuration
docker-compose.yml        # Docker Compose for local dev and production
```

## Data Model

Resume content lives in `data/resume.yaml` as a single source of truth containing all skills, employment history, languages, and courses. Variant manifests in `data/variants/` select and order a subset of this content for a specific role or audience, enabling multiple tailored resumes from one data source.

## CI

GitHub Actions runs on pull requests to `main`, executing type checking, tests, and a production build in sequence. See [ENGINEERING.md](./ENGINEERING.md) for full coding standards and CI requirements.

## Deployment

Push to `main` triggers automatic deployment: build Docker image, push to GitHub Container Registry (GHCR), deploy to VM via SSH.

```
Internet -> Ingress nginx (SSL, routing) -> Docker container (nginx:stable-alpine, port 3000:80)
```

### Local Docker Build

```sh
docker compose up --build
```

Site available at `http://localhost:3000`.

### Manual Deploy

For deploying without pushing to `main` (first-time setup, hotfix, troubleshooting):

```sh
export SSH_HOST=your-vm-host
export SSH_USER=your-ssh-user
export GHCR_PAT=your-github-pat
./scripts/deploy.sh
```

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `SSH_HOST` | VM hostname/IP |
| `SSH_USER` | SSH username |
| `SSH_KEY` | SSH private key (PEM) |
| `GHCR_PAT` | GitHub PAT with `read:packages` for VM-side docker login |

`GITHUB_TOKEN` is automatic and used for CI-side GHCR push.

### Ingress Configuration

The VM runs an existing nginx ingress proxy for SSL termination. Example config to route traffic to the resume container:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Project Documentation

- [ENGINEERING.md](./ENGINEERING.md) - Coding standards and project conventions
- [WORKING_AGREEMENT.md](./WORKING_AGREEMENT.md) - Collaboration workflow and task management
- [LESSONS.md](./LESSONS.md) - Lessons learned and corrective patterns
