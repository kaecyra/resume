import { track_pdf_download } from "$lib/analytics.js";
import type { LandingHero } from "$lib/types.js";

export function resume_pdf_href(resume_link: string): string {
  return `/${resume_link}.pdf`;
}

export function resume_pdf_filename(hero: LandingHero): string {
  return `${hero.name} - Resume - ${hero.role}.pdf`;
}

export function handle_resume_download(resume_link: string): void {
  track_pdf_download({ variant: resume_link, type: "resume", slug: resume_link });
}
