// Divider.svelte and Contact.svelte both render the same `contact` list
// (LandingLink[]) and both need to know, per entry, whether it's a mailto:
// link (to skip target="_blank"/rel, and in Divider's case to filter it out
// entirely) and which icon to show next to it. Extracted here so the two
// components share one definition instead of two copies with a comment
// pointing at each other - see #182.

// target="_blank" on a mailto: link opens a blank tab in some browsers
// before handing off to the mail client, so both components use this to
// skip target/rel on mailto: links specifically.
export function is_mailto(url: string): boolean {
  return url.startsWith("mailto:");
}

// The icon is derived from the URL, not the label: `contact` stays the
// single source of truth, with no extra "which icon" field to keep in sync
// by hand. Email has no icon (mailto: is filtered out of Divider's list
// before this runs, and Contact's {#if icon} guard skips it). Returns null
// rather than a fallback icon so an unrecognised provider degrades to
// text-only.
export function contact_icon(url: string): string | null {
  if (url.includes("github.com")) return "/landing/github-mark.svg";
  if (url.includes("linkedin.com")) return "/landing/linkedin-mark.svg";
  return null;
}
