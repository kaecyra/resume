import { render } from "svelte/server";

import type { LandingData } from "$lib/types.js";

import type { ProvisionalContributionsGrid } from "./contributions.js";
import LandingSections from "./LandingSections.svelte";
import { HUD_PALETTE } from "./palette.js";

const LANDING: LandingData = {
  hero: {
    name: "Test Person",
    role: "Engineer, Acme",
    location: "Somewhere, QC",
    tagline: "I build things.",
    status: "Somewhere, doing stuff.",
  },
  projects: [
    {
      id: "proj-a",
      name: "Project A",
      blurb: "Does a thing.",
      stack: ["TypeScript"],
      status: "Active",
    },
    {
      id: "proj-b",
      name: "Project B",
      blurb: "Does another thing.",
      stack: ["TypeScript"],
      status: "Active",
      links: [{ label: "Site", url: "https://example.com" }],
    },
  ],
  appearances: [
    {
      id: "gtc-2026",
      event: "NVIDIA GTC 2026",
      what: "LiveVision talk",
      date: "March 2026",
      blurb: "Talked about the architecture.",
    },
    {
      id: "ces-2026",
      event: "CES 2026",
      what: "LiveVision demo",
      date: "January 2026",
      blurb: "Demoed the pipeline.",
    },
  ],
  resume_links: ["default"],
  contact: [
    { label: "Email", url: "mailto:test@example.com" },
    { label: "LinkedIn", url: "https://linkedin.com/in/test" },
    { label: "GitHub", url: "https://github.com/testuser" },
  ],
  github: { user: "testuser" },
  sections: ["hero", "divider", "commits", "work", "appearances", "contact"],
};

// Deliberately different from hero.name/hero.role, to prove the download
// filename comes from these props (resume.yaml's profile name and the
// linked variant's title) rather than from landing.hero.
const PROFILE_NAME = "Resolved Profile";
const RESUME_TITLE = "Resolved Variant Title";

function html_for(landing: LandingData, contributions_grid: ProvisionalContributionsGrid | null = null): string {
  return render(LandingSections, {
    props: {
      landing,
      profile_name: PROFILE_NAME,
      resume_title: RESUME_TITLE,
      contributions_grid,
    },
  }).body;
}

describe("LandingSections", () => {
  it("renders every section named in landing.sections", () => {
    const html = html_for(LANDING);

    expect(html).toContain("Test Person");
    expect(html).toContain("Somewhere, QC");
    expect(html).toContain("Project A");
    expect(html).toContain("https://linkedin.com/in/test");
    expect(html).toContain("mailto:test@example.com");
  });

  it("forwards contributions_grid through to Commits, reaching the rendered day colours", () => {
    // Commits.test.ts proves Commits.svelte renders a non-null grid's day
    // colours in isolation. Nothing proved this component actually forwards
    // its own contributions_grid prop down to Commits rather than, say,
    // hardcoding null on the element - #167's seam only works end to end if
    // this wiring holds.
    const grid: ProvisionalContributionsGrid = [
      { days: [{ color: "#111111" }, { color: "#222222" }] },
    ];
    const html = html_for(LANDING, grid);

    expect(html).not.toContain("Commit history is offline for this build.");
    expect(html).toContain("background: #111111;");
    expect(html).toContain("background: #222222;");
  });

  it("wires a project's links entry into a real href on the rendered card", () => {
    // project_link() itself is extracted and tested separately, but every
    // fixture project here previously had neither repo_url nor links, so
    // the {#if link} branch in Work.svelte (~line 34) that turns the result
    // into an <a href> was never exercised by a render. proj-b (added
    // above) carries a links entry to close that gap.
    const html = html_for(LANDING);

    expect(html).toContain('href="https://example.com"');

    // The href check above doesn't prove the anchor carries the project's
    // name - only proj-a (the {:else} branch) is asserted by name
    // elsewhere in this file, so an empty anchor here
    // (`<a href="...">`) would otherwise stay green.
    expect(html).toMatch(/href="https:\/\/example\.com"[^>]*>Project B</);

    // The {:else} side of that same {#if link} (~line 34): proj-a has
    // neither repo_url nor links, so project_link() returns null and its
    // name should render as plain text, not inside an anchor. Widening the
    // condition to always take the {#if} branch leaves "Project A" in the
    // output (still caught by other checks) but wraps it in a link, which
    // none of those checks would notice without this.
    expect(html).not.toMatch(/<a[^>]*>Project A</);
  });

  it("marks only the first project as the featured card", () => {
    // Work.svelte's index === 0 check (~line 31) decides both the featured
    // border colour and the status text colour; with two fixture projects
    // both sides of that branch render in one pass, so a flipped condition
    // or a dropped class:work-card-featured shows up here.
    const html = html_for(LANDING);

    expect(html.match(/work-card-featured/g)?.length).toBe(1);
    expect(html).toContain(`border-left-color: ${HUD_PALETTE.accent};`);
    expect(html).toContain(`border-left-color: ${HUD_PALETTE.edge};`);
    expect(html).toContain(`color: ${HUD_PALETTE.secondary};`);
  });

  it("renders each project's blurb, stack chips and status text", () => {
    // The existing Work coverage (above, and the featured-card test) proves
    // the featured border, the status *colour*, the project name and the
    // link href - but not the text of three of the section's four content
    // elements: the blurb paragraph, the stack chip list and the status
    // text itself. Each stays green under: deleting .work-blurb's content,
    // changing {#if project.stack?.length} to {#if false}, or emptying
    // .work-status while keeping the element and its style attribute.
    const html = html_for(LANDING);
    const work_html = html.slice(html.indexOf('id="work"'), html.indexOf('id="contact"'));

    expect(work_html).toMatch(/class="work-blurb[^"]*">Does a thing\.</);
    expect(work_html).toMatch(/class="work-blurb[^"]*">Does another thing\.</);

    expect(work_html.match(/class="work-stack/g)?.length).toBe(2);
    expect(work_html.match(/<li[^>]*>TypeScript<\/li>/g)?.length).toBe(2);

    expect(work_html.match(/class="work-status[^"]*"[^>]*>Active</g)?.length).toBe(2);
  });

  it("renders every appearance's event, descriptor and date in file order", () => {
    // landing.sections order is proven separately above; this proves the
    // section's own content - both fixture rows, and in the order given in
    // landing.appearances (gtc-2026 before ces-2026), not re-sorted by date.
    const html = html_for(LANDING);
    const appearances_html = html.slice(html.indexOf('id="appearances"'), html.indexOf('id="contact"'));

    const gtc_index = appearances_html.indexOf("NVIDIA GTC 2026");
    const ces_index = appearances_html.indexOf("CES 2026");

    expect(gtc_index).toBeGreaterThanOrEqual(0);
    expect(ces_index).toBeGreaterThan(gtc_index);

    expect(appearances_html).toContain("LiveVision talk");
    expect(appearances_html).toContain("March 2026");
    expect(appearances_html).toContain("LiveVision demo");
    expect(appearances_html).toContain("January 2026");
  });

  it("omits the appearances section entirely when it is removed from landing.sections", () => {
    const without_appearances = {
      ...LANDING,
      sections: ["hero", "divider", "commits", "work", "contact"],
    };
    const html = html_for(without_appearances);

    expect(html).not.toContain("NVIDIA GTC 2026");
    expect(html).not.toContain("CES 2026");
  });

  it("omits target/rel from a mailto: contact link but keeps them on an https: one", () => {
    const html = html_for(LANDING);

    // Scoped to the Contact section itself (id="contact" onward) - Divider
    // also renders the LinkedIn href unconditionally with target/rel, so an
    // unscoped match wouldn't prove Contact's own is_mailto conditional.
    const contact_html = html.slice(html.indexOf('id="contact"'));
    const mailto_anchor = contact_html.match(/<a[^>]*href="mailto:test@example.com"[^>]*>/)?.[0];
    const linkedin_anchor = contact_html.match(/<a[^>]*href="https:\/\/linkedin\.com\/in\/test"[^>]*>/)?.[0];

    expect(mailto_anchor).toBeDefined();
    expect(mailto_anchor).not.toContain("target=");
    expect(mailto_anchor).not.toContain("rel=");

    expect(linkedin_anchor).toBeDefined();
    expect(linkedin_anchor).toContain('target="_blank"');
    expect(linkedin_anchor).toContain('rel="noopener noreferrer"');
  });

  it("renders each contact entry's label text on its link", () => {
    // The href/target/rel checks above only match up to the anchor's
    // opening tag, so none of them prove {item.label} actually reaches the
    // markup - an anchor left empty for every contact entry would satisfy
    // all of them.
    const html = html_for(LANDING);
    const contact_html = html.slice(html.indexOf('id="contact"'));

    expect(contact_html).toMatch(/href="mailto:test@example\.com"[^>]*>Email</);
    expect(contact_html).toMatch(/href="https:\/\/linkedin\.com\/in\/test"[^>]*>LinkedIn</);
    expect(contact_html).toMatch(/href="https:\/\/github\.com\/testuser"[^>]*>GitHub</);
  });

  it("renders sections in the order given by landing.sections", () => {
    const html = html_for(LANDING);

    const hero_index = html.indexOf("Test Person");
    const divider_index = html.indexOf("Somewhere, QC");
    // Anchored on the offline-state copy Commits.svelte renders (this
    // fixture's contributions_grid is null), not "testuser" - that string
    // also appears in Divider's GitHub link (from the contact fixture),
    // which renders earlier in the document and would mask a Commits
    // section that never rendered at all.
    const commits_index = html.indexOf("Commit history is offline for this build.");
    const work_index = html.indexOf("Project A");
    const appearances_index = html.indexOf("NVIDIA GTC 2026");
    const contact_index = html.indexOf("mailto:test@example.com");

    expect(hero_index).toBeGreaterThanOrEqual(0);
    expect(hero_index).toBeLessThan(divider_index);
    expect(divider_index).toBeLessThan(commits_index);
    expect(commits_index).toBeLessThan(work_index);
    expect(work_index).toBeLessThan(appearances_index);
    expect(appearances_index).toBeLessThan(contact_index);

    // Divider filters out mailto: links (Contact renders them instead).
    // Asserted directly here, not just inferred from ordering - dropping
    // that filter wouldn't move any of the indexes above, so it would pass
    // silently without this check.
    const divider_band = html.slice(divider_index, commits_index);
    expect(divider_band).not.toContain("mailto:");

    // The not.toContain("mailto:") check above is covered against an
    // unfiltered `contact`, but proves nothing about the band actually
    // rendering the non-mailto links - both `social_links` collapsing to
    // an empty array and dropping href={item.url} from .divider-link stay
    // green without this positive half.
    expect(divider_band).toContain('href="https://linkedin.com/in/test"');
    expect(divider_band).toContain('href="https://github.com/testuser"');

    // The href checks above don't prove the link *text* (item.label)
    // reaches the markup - an anchor left empty (`<a href="..."></a>`)
    // would satisfy them too.
    expect(divider_band).toMatch(/href="https:\/\/linkedin\.com\/in\/test"[^>]*>LinkedIn</);
    expect(divider_band).toMatch(/href="https:\/\/github\.com\/testuser"[^>]*>GitHub</);
  });

  it("reverses the rendered order when landing.sections is reversed", () => {
    const reversed = { ...LANDING, sections: [...LANDING.sections].reverse() };
    const html = html_for(reversed);

    const hero_index = html.indexOf("Test Person");
    const contact_index = html.indexOf("mailto:test@example.com");

    expect(contact_index).toBeLessThan(hero_index);
  });

  it("omits a section entirely when it is removed from landing.sections", () => {
    const without_work = { ...LANDING, sections: ["hero", "commits", "contact"] };
    const html = html_for(without_work);

    expect(html).not.toContain("Project A");
  });

  it("wires the resume CTA's download link to the resume PDF with a filename built from profile_name/resume_title", () => {
    const html = html_for(LANDING);

    expect(html).toContain('href="/default.pdf"');
    expect(html).toContain('download="Resolved Profile - Resume - Resolved Variant Title.pdf"');
  });

  it("gives the icon-only download link an accessible name and hides its SVG from assistive tech", () => {
    const html = html_for(LANDING);

    expect(html).toContain('aria-label="Download resume PDF"');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("renders exactly one h1", () => {
    const html = html_for(LANDING);

    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });

  it("renders no slash-separated slogan in the divider band", () => {
    const html = html_for(LANDING);
    const divider_index = html.indexOf("Somewhere, QC");
    const commits_index = html.indexOf("Commit history is offline for this build.");
    const divider_band = html.slice(divider_index, commits_index);

    expect(divider_band).not.toMatch(/\s\/\s/);
  });

  it("splits hero.role into the badge's tag and label spans, and renders the tagline/status/handle", () => {
    // Scoped to the hero section only (id="hero" up to id="divider") - the
    // point is to prove *this* markup carries each piece, not just that the
    // strings appear somewhere on the page.
    const html = html_for(LANDING);
    const hero_html = html.slice(html.indexOf('id="hero"'), html.indexOf('id="divider"'));

    // hero.role is "Engineer, Acme" - split_role_badge() divides it on the
    // first comma into a mono tag ("Engineer") and a display-font label
    // ("Acme"), rendered in two separate spans. Rendering hero.role raw
    // into one span (unwiring split_role_badge) would pass a plain
    // toContain("Engineer") check, so this asserts each half lands inside
    // its own class="hero-badge-*" element.
    expect(hero_html).toMatch(/class="hero-badge-tag[^"]*">Engineer</);
    expect(hero_html).toMatch(/class="hero-badge-label[^"]*">Acme</);

    expect(hero_html).toContain(LANDING.hero.tagline);
    expect(hero_html).toContain(LANDING.hero.status);

    // The topbar handle - angle-bracket-anchored so this can't be satisfied
    // by "testuser" appearing inside an href elsewhere on the page (e.g.
    // Divider's GitHub link).
    expect(hero_html).toContain(">testuser<");
  });

  it("omits the badge label span entirely when hero.role has no comma", () => {
    // split_role_badge() returns an empty label when hero.role has no comma
    // (falls back to the full string as the tag) - the {#if role.label}
    // guard in Hero.svelte (~line 53) is what keeps an empty
    // hero-badge-label span out of the markup for that case. Nothing else
    // in the suite renders a comma-less role, so this branch was reachable
    // only by adding a case for it.
    const no_label_landing = { ...LANDING, hero: { ...LANDING.hero, role: "Independent" } };
    const html = html_for(no_label_landing);
    const hero_html = html.slice(html.indexOf('id="hero"'), html.indexOf('id="divider"'));

    expect(hero_html).toMatch(/class="hero-badge-tag[^"]*">Independent</);
    expect(hero_html).not.toContain("hero-badge-label");
  });
});
