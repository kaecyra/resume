<script lang="ts">
  import { onMount } from "svelte";

  import {
    fetch_slug_counts,
    aggregate_slug_metrics,
    compute_start_at,
  } from "$lib/umami-api.js";
  import type { TimeRange, MetricsMap, SlugMetrics } from "$lib/umami-api.js";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let metrics: MetricsMap | null = $state(null);
  let loading = $state(false);
  let error_state = $state(false);
  let time_range: TimeRange = $state("30d");

  function format_date(iso: string): string {
    return iso.slice(0, 10);
  }

  const PILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    "cto-a":   { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
    "cto-b":   { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
    "default": { bg: "#e5e7eb", text: "#374151", border: "#d1d5db" },
  };

  const FALLBACK_PILL = { bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" };

  function get_pill(parent: string) {
    return PILL_COLORS[parent] ?? FALLBACK_PILL;
  }

  function metric_cell(slug: string, field: keyof SlugMetrics): string {
    if (loading) return "\u2026";
    if (error_state || !metrics) return "\u2014";
    const entry = metrics.get(slug);
    if (!entry) return "\u2014";
    return String(entry[field]);
  }

  async function load_metrics() {
    const website_id = data.umami_website_id;
    if (!website_id) {
      error_state = true;
      return;
    }

    loading = true;
    error_state = false;

    try {
      const now = Date.now();
      const start_at = compute_start_at(time_range, now);
      const slugs = data.rows.map((r) => r.slug);
      const raw = await fetch_slug_counts(website_id, start_at, now);
      metrics = aggregate_slug_metrics(raw, slugs);
    } catch {
      error_state = true;
      metrics = null;
    } finally {
      loading = false;
    }
  }

  function on_range_change(e: Event) {
    time_range = (e.target as HTMLSelectElement).value as TimeRange;
    load_metrics();
  }

  onMount(() => {
    load_metrics();
  });
</script>

<svelte:head>
  <title>Sub-Variant Dashboard</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="dashboard">
  <div class="header-row">
    <h1>Sub-Variant Dashboard</h1>
    <div class="time-range">
      <label for="time-range">Period</label>
      <select id="time-range" value={time_range} onchange={on_range_change}>
        <option value="7d">7 days</option>
        <option value="30d">30 days</option>
        <option value="all">All time</option>
      </select>
    </div>
  </div>

  {#if data.rows.length === 0}
    <p class="empty">No sub-variants found.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Parent</th>
          <th>Company</th>
          <th>Role</th>
          <th class="metric-header">Views</th>
          <th class="metric-header">Letters</th>
          <th class="metric-header">PDFs</th>
          <th>Resume</th>
          <th>Letter</th>
          <th>Posting</th>
        </tr>
      </thead>
      <tbody>
        {#each data.rows as row}
          {@const pill = get_pill(row.parent)}
          <tr>
            <td class="date">{format_date(row.fetched_at)}</td>
            <td>
              <span
                class="pill"
                style="background: {pill.bg}; color: {pill.text}; border-color: {pill.border};"
              >{row.parent}</span>
            </td>
            <td>{row.company}</td>
            <td>{row.title}</td>
            <td class="metric">{metric_cell(row.slug, "resume_views")}</td>
            <td class="metric">{metric_cell(row.slug, "letter_views")}</td>
            <td class="metric">{metric_cell(row.slug, "pdf_downloads")}</td>
            <td><a href="/{row.parent}/{row.slug}">View</a></td>
            <td>
              {#if row.has_letter}
                <a href="/{row.parent}/{row.slug}/letter">View</a>
              {:else}
                &mdash;
              {/if}
            </td>
            <td>
              <a href={row.job_url} target="_blank" rel="noopener noreferrer">Link</a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .dashboard {
    max-width: 80rem;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: "IBM Plex Sans", sans-serif;
    color: #374151;
  }

  .header-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-family: "Rajdhani", sans-serif;
    font-weight: 700;
    font-size: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #111827;
    margin: 0;
  }

  .time-range {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-family: "Rajdhani", sans-serif;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
  }

  .time-range select {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #f9fafb;
    color: #374151;
    cursor: pointer;
  }

  .empty {
    color: #9ca3af;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    font-family: "Rajdhani", sans-serif;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    font-size: 0.75rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
  }

  .metric-header {
    text-align: right;
  }

  td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .date {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.8rem;
    color: #9ca3af;
  }

  .metric {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.8rem;
    text-align: right;
    color: #6b7280;
  }

  .pill {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    border: 1px solid;
    white-space: nowrap;
  }

  a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  a:hover {
    text-decoration: underline;
  }

  tr:hover td {
    background-color: #f9fafb;
  }

  :global(body) {
    background-color: #ffffff;
  }
</style>
