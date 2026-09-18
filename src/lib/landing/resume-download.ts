import { track_pdf_download } from "$lib/analytics.js";

// Also used directly by src/routes/[variant=variant]/+page.svelte, which
// serves the same PDF for a given variant. This has to use the variant's
// title, not the landing hero's role - otherwise the same file downloads
// under two different names (and the landing one would leak a company name
// the variant title doesn't carry).
export function resume_pdf_filename(profile_name: string, resume_title: string): string {
  return `${profile_name} - Resume - ${resume_title}.pdf`;
}

export function handle_resume_download(resume_link: string): void {
  track_pdf_download({ variant: resume_link, type: "resume", slug: resume_link });
}
