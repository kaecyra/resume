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
```

## Data Model

Resume content lives in `data/resume.yaml` as a single source of truth containing all skills, employment history, languages, and courses. Variant manifests in `data/variants/` select and order a subset of this content for a specific role or audience, enabling multiple tailored resumes from one data source.

## CI

GitHub Actions runs on pull requests to `main`, executing type checking, tests, and a production build in sequence. See [ENGINEERING.md](./ENGINEERING.md) for full coding standards and CI requirements.

## Project Documentation

- [ENGINEERING.md](./ENGINEERING.md) - Coding standards and project conventions
- [WORKING_AGREEMENT.md](./WORKING_AGREEMENT.md) - Collaboration workflow and task management
- [LESSONS.md](./LESSONS.md) - Lessons learned and corrective patterns
