<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

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
</script>

<svelte:head>
  <title>Sub-Variant Dashboard</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="dashboard">
  <h1>Sub-Variant Dashboard</h1>

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

  h1 {
    font-family: "Rajdhani", sans-serif;
    font-weight: 700;
    font-size: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #111827;
    margin-bottom: 1.5rem;
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

  td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .date {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.8rem;
    color: #9ca3af;
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
